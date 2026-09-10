import { id, type GitHubEnv } from '../app/github-client.ts';
import { scanRepository } from './scanner.ts';
import { enqueueRepositoryScan } from '../app/github-repository-service.ts';

export async function processRepositoryJob(env: GitHubEnv, jobId: string, scan = scanRepository) {
 if (!/^srj_[0-9a-f-]{36}$/.test(jobId)) return;
 const claim = await env.DB.prepare("UPDATE security_repository_jobs SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'").bind(new Date().toISOString(), jobId).run();
 if (Number(claim.meta.changes) !== 1) return;
 const job = await env.DB.prepare('SELECT workspace_id, repository_id FROM security_repository_jobs WHERE id = ?').bind(jobId).first<{ workspace_id: number; repository_id: string }>();
 if (!job) return;
 try {
  const result = await scan(env, job.workspace_id, job.repository_id), now = new Date().toISOString();
  // Authorization is checked again before persisting evidence after a long scan.
  const allowed = await env.DB.prepare("SELECT r.id FROM security_repositories r JOIN github_connections c ON c.id = r.connection_id WHERE r.id = ? AND r.workspace_id = ? AND r.enabled = 1 AND c.status = 'active' AND r.authorized_until > ?").bind(job.repository_id, job.workspace_id, now).first();
  if (!allowed) throw new Error('GITHUB_REPOSITORY_NOT_AUTHORIZED');
  const statements = result.findings.map(f => env.DB.prepare(`INSERT INTO security_repository_findings (id, workspace_id, repository_id, fingerprint, kind, title, severity, file_path, line, details_json, status, source_job_id, commit_sha, first_observed_at, last_observed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?) ON CONFLICT(repository_id, fingerprint) DO UPDATE SET source_job_id = excluded.source_job_id, commit_sha = excluded.commit_sha, details_json = excluded.details_json, last_observed_at = excluded.last_observed_at, status = 'open', resolved_at = NULL`).bind(id('srg'), job.workspace_id, job.repository_id, f.fingerprint, f.kind, f.title, f.severity, f.path, f.line, JSON.stringify(f.details), jobId, result.sha, now, now));
  if (result.coverage.complete) statements.push(env.DB.prepare("UPDATE security_repository_findings SET status = 'resolved', resolved_at = ? WHERE repository_id = ? AND status = 'open' AND source_job_id <> ?").bind(now, job.repository_id, jobId));
  statements.push(env.DB.prepare("UPDATE security_repository_jobs SET status = 'completed', commit_sha = ?, coverage_json = ?, completed_at = ? WHERE id = ?").bind(result.sha, JSON.stringify(result.coverage), now, jobId));
  statements.push(env.DB.prepare('UPDATE security_repositories SET last_scan_at = ?, updated_at = ? WHERE id = ?').bind(now, now, job.repository_id));
  statements.push(env.DB.prepare("INSERT INTO security_repository_events (id, workspace_id, repository_id, event_type, details_json, created_at) VALUES (?, ?, ?, 'repository.scan_completed', ?, ?)").bind(id('sre'), job.workspace_id, job.repository_id, JSON.stringify({ jobId, commit: result.sha, findings: result.findings.length, complete: result.coverage.complete }), now));
  await env.DB.batch(statements);
 } catch (error) {
  const code = error instanceof Error && /^(GITHUB|REPOSITORY)_[A-Z0-9_]+$/.test(error.message) ? error.message : 'REPOSITORY_SCAN_FAILED';
  await env.DB.prepare("UPDATE security_repository_jobs SET status = 'failed', error_code = ?, completed_at = ? WHERE id = ?").bind(code, new Date().toISOString(), jobId).run();
 }
}
const worker = {
 async queue(batch: { messages: Array<{ body: { jobId?: string }; ack(): void; retry(): void }> }, env: GitHubEnv) {
  for (const message of batch.messages) try { if (message.body?.jobId) await processRepositoryJob(env, message.body.jobId); message.ack(); } catch { message.retry(); }
 },
 async scheduled(_controller: unknown, env: GitHubEnv) {
  await env.DB.prepare("UPDATE security_repository_jobs SET status = 'failed', error_code = 'REPOSITORY_EXECUTION_INTERRUPTED', completed_at = ? WHERE status IN ('queued','running') AND created_at < ?").bind(new Date().toISOString(), new Date(Date.now() - 30 * 60_000).toISOString()).run();
  const pending = await env.DB.prepare("SELECT r.id, r.workspace_id FROM security_repositories r WHERE r.enabled = 1 AND r.monitoring_enabled = 1 AND r.rescan_requested = 1 AND NOT EXISTS (SELECT 1 FROM security_repository_jobs j WHERE j.repository_id = r.id AND j.status IN ('queued','running')) LIMIT 5").all<{ id: string; workspace_id: number }>();
  for (const repo of pending.results) {
   await env.DB.prepare('UPDATE security_repositories SET rescan_requested = 0 WHERE id = ?').bind(repo.id).run();
   try { await enqueueRepositoryScan(env, repo.workspace_id, repo.id, null, 'push'); }
   catch { await env.DB.prepare('UPDATE security_repositories SET rescan_requested = 1 WHERE id = ?').bind(repo.id).run(); }
  }
 },
 async fetch() { return Response.json({ service: 'cbs-hub-repository-runner' }, { status: 404 }); },
};
export default worker;

import type { GitHubEnv } from './github-client.ts';
import { enqueueRepositoryScan } from './github-repository-service.ts';

export async function maintainRepositoryJobs(env: GitHubEnv) {
 await env.DB.prepare("UPDATE security_repository_jobs SET status = 'failed', error_code = 'REPOSITORY_EXECUTION_INTERRUPTED', completed_at = ? WHERE status IN ('queued','running') AND created_at < ?").bind(new Date().toISOString(), new Date(Date.now() - 30 * 60_000).toISOString()).run();
 const pending = await env.DB.prepare("SELECT r.id, r.workspace_id FROM security_repositories r WHERE r.enabled = 1 AND r.monitoring_enabled = 1 AND r.rescan_requested = 1 AND NOT EXISTS (SELECT 1 FROM security_repository_jobs j WHERE j.repository_id = r.id AND j.status IN ('queued','running')) LIMIT 5").all<{ id: string; workspace_id: number }>();
 for (const repo of pending.results) {
  await env.DB.prepare('UPDATE security_repositories SET rescan_requested = 0 WHERE id = ?').bind(repo.id).run();
  try { await enqueueRepositoryScan(env, repo.workspace_id, repo.id, null, 'push'); }
  catch { await env.DB.prepare('UPDATE security_repositories SET rescan_requested = 1 WHERE id = ?').bind(repo.id).run(); }
 }
}

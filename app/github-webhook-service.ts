import { webhookValid, type GitHubEnv } from './github-client.ts';
import { enqueueRepositoryScan, repositoryEvent } from './github-repository-service.ts';
export async function receiveGitHubWebhook(env: GitHubEnv, request: Request) {
 if (!env.GITHUB_WEBHOOK_SECRET) return Response.json({ error: 'Unavailable' }, { status: 503 });
 const body = await request.text();
 if (new TextEncoder().encode(body).length > 1_000_000) return Response.json({ error: 'Too large' }, { status: 413 });
 if (!await webhookValid(env.GITHUB_WEBHOOK_SECRET, request.headers.get('x-hub-signature-256'), body)) return Response.json({ error: 'Invalid signature' }, { status: 401 });
 const delivery = request.headers.get('x-github-delivery') ?? '', event = request.headers.get('x-github-event') ?? '';
 if (!/^[a-zA-Z0-9-]{10,100}$/.test(delivery)) return Response.json({ error: 'Invalid delivery' }, { status: 400 });
 if (await env.DB.prepare('SELECT id FROM github_webhook_deliveries WHERE id = ?').bind(delivery).first()) return Response.json({ duplicate: true });
 const payload = JSON.parse(body);
 const installationId = payload.installation?.id;
 if (!Number.isSafeInteger(installationId)) return Response.json({ ignored: true });
 const connection = await env.DB.prepare('SELECT id, workspace_id FROM github_connections WHERE installation_id = ?').bind(installationId).first<{ id: string; workspace_id: number }>();
 if (!connection) return Response.json({ ignored: true });
 if (event === 'installation' && ['deleted', 'suspend'].includes(payload.action)) {
  await env.DB.batch([
   env.DB.prepare("UPDATE github_connections SET status = 'revoked', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), connection.id),
   env.DB.prepare('UPDATE security_repositories SET enabled = 0, monitoring_enabled = 0 WHERE connection_id = ?').bind(connection.id),
  ]);
 } else if (event === 'installation_repositories' && payload.action === 'removed') {
  for (const r of (payload.repositories_removed ?? []).slice(0, 100)) await env.DB.prepare('UPDATE security_repositories SET enabled = 0, monitoring_enabled = 0, authorized_until = ? WHERE connection_id = ? AND github_id = ?').bind(new Date().toISOString(), connection.id, r.id).run();
 } else if ((event === 'push' || event === 'pull_request') && Number.isSafeInteger(payload.repository?.id)) {
  const repo = await env.DB.prepare('SELECT id, default_branch, monitoring_enabled, enabled FROM security_repositories WHERE connection_id = ? AND github_id = ?').bind(connection.id, payload.repository.id).first<{ id: string; default_branch: string; monitoring_enabled: number; enabled: number }>();
  if (repo) {
   if (event === 'pull_request' && payload.action === 'closed') {
    await env.DB.prepare("UPDATE security_repository_fixes SET status = ?, updated_at = ? WHERE repository_id = ? AND external_pr_number = ? AND status = 'opened'").bind(payload.pull_request?.merged ? 'merged' : 'closed', new Date().toISOString(), repo.id, payload.number).run();
   }
   const changed = event === 'push' && !payload.deleted && payload.ref === `refs/heads/${repo.default_branch}`;
   if (changed && repo.enabled && repo.monitoring_enabled) {
    try { await enqueueRepositoryScan(env, connection.workspace_id, repo.id, null, 'push'); }
    catch (error) { if (!(error instanceof Error) || !['GITHUB_SCAN_DAILY_LIMIT', 'GITHUB_REPOSITORY_NOT_AUTHORIZED'].includes(error.message)) throw error; await repositoryEvent(env, connection.workspace_id, repo.id, null, 'repository.auto_scan_skipped', { code: error.message }); }
   }
  }
 }
 await env.DB.prepare('INSERT OR IGNORE INTO github_webhook_deliveries (id, event_type, received_at) VALUES (?, ?, ?)').bind(delivery, event.slice(0, 80), new Date().toISOString()).run();
 return Response.json({ received: true });
}

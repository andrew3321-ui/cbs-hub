import { appJwt, boundedJson, digest, github, githubConfigured, id, installationToken, pkceChallenge, publicOrigin, repoPath, type Fetcher, type GitHubEnv } from './github-client.ts';
import { createLeafDependencyPatch, inspectSource, type LeafPatch } from '../domain/repository-security.ts';

export type RepositoryRow = { id: string; workspace_id: number; connection_id: string; github_id: number; full_name: string; default_branch: string; enabled: number; monitoring_enabled: number; authorized_until: string; installation_id: number; connection_status: string };
function stageFailure(error: unknown, fallback: string): never {
 if (error instanceof Error && /^GITHUB_[A-Z0-9_]+$/.test(error.message)) throw error;
 throw new Error(fallback, { cause: error });
}
export async function repositoryFor(env: GitHubEnv, workspaceId: number, repositoryId: unknown) {
 if (typeof repositoryId !== 'string') throw new Error('GITHUB_REPOSITORY_INVALID');
 const row = await env.DB.prepare(`SELECT r.*, c.installation_id, c.status connection_status FROM security_repositories r JOIN github_connections c ON c.id = r.connection_id AND c.workspace_id = r.workspace_id WHERE r.id = ? AND r.workspace_id = ?`).bind(repositoryId, workspaceId).first<RepositoryRow>();
 if (!row || row.connection_status !== 'active' || !Number.isFinite(Date.parse(row.authorized_until)) || Date.parse(row.authorized_until) <= Date.now()) throw new Error('GITHUB_REPOSITORY_NOT_AUTHORIZED');
 return row;
}
export async function repositoryEvent(env: GitHubEnv, workspaceId: number, repositoryId: string | null, actor: number | null, event: string, details: unknown = {}) {
 await env.DB.prepare('INSERT INTO security_repository_events (id, workspace_id, repository_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id('sre'), workspaceId, repositoryId, actor, event, JSON.stringify(details), new Date().toISOString()).run();
}
export async function startGitHubConnection(env: GitHubEnv, workspaceId: number, userId: number) {
 if (!githubConfigured(env)) throw new Error('GITHUB_NOT_CONFIGURED');
 const state = crypto.randomUUID() + crypto.randomUUID();
 await env.DB.prepare('DELETE FROM github_oauth_states WHERE user_id = ? OR expires_at < ?').bind(userId, new Date().toISOString()).run();
 await env.DB.prepare('INSERT INTO github_oauth_states (state_hash, workspace_id, user_id, expires_at) VALUES (?, ?, ?, ?)').bind(await digest(state), workspaceId, userId, new Date(Date.now() + 10 * 60_000).toISOString()).run();
 const url = new URL('https://github.com/login/oauth/authorize');
 url.searchParams.set('client_id', env.GITHUB_CLIENT_ID!); url.searchParams.set('state', state);
 url.searchParams.set('redirect_uri', publicOrigin(env) + '/api/github/callback');
 url.searchParams.set('code_challenge', await pkceChallenge(state));
 url.searchParams.set('code_challenge_method', 'S256');
 return { url: url.toString() };
}
type GitHubRepo = { id: number; full_name: string; default_branch: string; archived?: boolean; permissions?: { admin?: boolean } };
export async function finishGitHubConnection(env: GitHubEnv, workspaceId: number, userId: number, code: string, state: string, fetcher: Fetcher = fetch) {
 if (!githubConfigured(env) || code.length > 300 || state.length > 100) throw new Error('GITHUB_OAUTH_INVALID');
 const consumed = await env.DB.prepare('UPDATE github_oauth_states SET consumed_at = ? WHERE state_hash = ? AND user_id = ? AND workspace_id = ? AND expires_at > ? AND consumed_at IS NULL').bind(new Date().toISOString(), await digest(state), userId, workspaceId, new Date().toISOString()).run();
 if (Number(consumed.meta.changes) !== 1) throw new Error('GITHUB_OAUTH_INVALID');
 const tokenRequest = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID!, client_secret: env.GITHUB_CLIENT_SECRET!, code, redirect_uri: publicOrigin(env) + '/api/github/callback', code_verifier: state });
 let response: Response;
 try { response = await fetcher('https://github.com/login/oauth/access_token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenRequest.toString() }); }
 catch (error) { stageFailure(error, 'GITHUB_OAUTH_NETWORK_FAILED'); }
 if (!response.ok) throw new Error('GITHUB_OAUTH_FAILED');
 let access: { access_token?: string; error?: string };
 try {
  const payload = await boundedJson(response, 20_000);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('GITHUB_OAUTH_RESPONSE_INVALID');
  access = payload as { access_token?: string; error?: string };
 } catch (error) { stageFailure(error, 'GITHUB_OAUTH_RESPONSE_INVALID'); }
 if (!access.access_token) {
  if (access.error === 'incorrect_client_credentials') throw new Error('GITHUB_OAUTH_CLIENT_INVALID');
  if (access.error === 'redirect_uri_mismatch') throw new Error('GITHUB_OAUTH_REDIRECT_INVALID');
  if (access.error === 'bad_verification_code') throw new Error('GITHUB_OAUTH_CODE_INVALID');
  if (access.error === 'unverified_user_email') throw new Error('GITHUB_OAUTH_EMAIL_UNVERIFIED');
  throw new Error('GITHUB_OAUTH_FAILED');
 }
 const token = access.access_token;
 let connected = 0;
 // Only repositories for which this authenticated GitHub user is an administrator can be attached.
 for (let page = 1; page <= 3; page++) {
  let installations: { installations: Array<{ id: number; app_id: number; account: { login: string }; suspended_at?: string | null }> };
  try { installations = await github(`/user/installations?per_page=30&page=${page}`, token, {}, fetcher); }
  catch (error) { stageFailure(error, 'GITHUB_INSTALLATION_LOOKUP_FAILED'); }
  if (!installations || !Array.isArray(installations.installations)) throw new Error('GITHUB_INSTALLATION_RESPONSE_INVALID');
  for (const installation of installations.installations) {
   if (!installation || !Number.isSafeInteger(installation.id) || !Number.isSafeInteger(installation.app_id) || typeof installation.account?.login !== 'string') throw new Error('GITHUB_INSTALLATION_RESPONSE_INVALID');
   if (String(installation.app_id) !== env.GITHUB_APP_ID || installation.suspended_at) continue;
   const existing = await env.DB.prepare('SELECT id, workspace_id FROM github_connections WHERE installation_id = ?').bind(installation.id).first<{ id: string; workspace_id: number }>();
   if (existing && existing.workspace_id !== workspaceId) continue;
   const repositories: GitHubRepo[] = [];
   for (let rp = 1; rp <= 3; rp++) {
    let list: { repositories: GitHubRepo[] };
    try { list = await github(`/user/installations/${installation.id}/repositories?per_page=100&page=${rp}`, token, {}, fetcher); }
    catch (error) { stageFailure(error, 'GITHUB_REPOSITORY_LOOKUP_FAILED'); }
    if (!list || !Array.isArray(list.repositories)) throw new Error('GITHUB_REPOSITORY_RESPONSE_INVALID');
    repositories.push(...list.repositories.filter(r => r.permissions?.admin && !r.archived));
    if (list.repositories.length < 100) break;
   }
   if (!repositories.length) continue;
   const now = new Date().toISOString(), connectionId = existing?.id ?? id('ghc');
   try {
    await env.DB.prepare(`INSERT INTO github_connections (id, workspace_id, installation_id, account_login, status, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?) ON CONFLICT(installation_id) DO UPDATE SET status = 'active', updated_at = excluded.updated_at WHERE github_connections.workspace_id = excluded.workspace_id`).bind(connectionId, workspaceId, installation.id, installation.account.login, userId, now, now).run();
    await env.DB.prepare('UPDATE security_repositories SET enabled = 0, monitoring_enabled = 0 WHERE connection_id = ?').bind(connectionId).run();
    for (const repo of repositories.slice(0, 100)) {
     repoPath(repo.full_name);
     await env.DB.prepare(`INSERT INTO security_repositories (id, workspace_id, connection_id, github_id, full_name, default_branch, authorized_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(workspace_id, github_id) DO UPDATE SET connection_id = excluded.connection_id, full_name = excluded.full_name, default_branch = excluded.default_branch, authorized_until = excluded.authorized_until, updated_at = excluded.updated_at`).bind(id('srp'), workspaceId, connectionId, repo.id, repo.full_name, repo.default_branch, new Date(Date.now() + 90 * 86400_000).toISOString(), now, now).run();
     connected++;
    }
   } catch (error) { stageFailure(error, 'GITHUB_REPOSITORY_SYNC_FAILED'); }
  }
  if (installations.installations.length < 30) break;
 }
 await repositoryEvent(env, workspaceId, null, userId, 'github.connected', { repositories: connected });
 if (!connected) throw new Error('GITHUB_NO_ADMIN_REPOSITORIES');
 return { repositories: connected };
}
export async function enqueueRepositoryScan(env: GitHubEnv, workspaceId: number, repositoryId: unknown, actor: number | null, trigger = 'manual') {
 if (!env.SECURITY_REPOSITORY_QUEUE) throw new Error('GITHUB_RUNNER_NOT_CONFIGURED');
 const repo = await repositoryFor(env, workspaceId, repositoryId);
 if (!repo.enabled) throw new Error('GITHUB_REPOSITORY_DISABLED');
 const count = await env.DB.prepare('SELECT COUNT(*) n FROM security_repository_jobs WHERE workspace_id = ? AND created_at > ?').bind(workspaceId, new Date(Date.now() - 86400_000).toISOString()).first<{ n: number }>();
 if (Number(count?.n) >= 30) throw new Error('GITHUB_SCAN_DAILY_LIMIT');
 const existing = await env.DB.prepare("SELECT id FROM security_repository_jobs WHERE repository_id = ? AND status IN ('queued','running')").bind(repo.id).first<{ id: string }>();
 if (existing) {
  if (trigger === 'push') await env.DB.prepare('UPDATE security_repositories SET rescan_requested = 1 WHERE id = ?').bind(repo.id).run();
  return { jobId: existing.id, status: 'queued' };
 }
 const jobId = id('srj'), now = new Date().toISOString();
 await env.DB.prepare("INSERT INTO security_repository_jobs (id, workspace_id, repository_id, status, trigger_kind, created_at) VALUES (?, ?, ?, 'queued', ?, ?)").bind(jobId, workspaceId, repo.id, trigger, now).run();
 try { await env.SECURITY_REPOSITORY_QUEUE.send({ jobId }); }
 catch { await env.DB.prepare("UPDATE security_repository_jobs SET status = 'failed', error_code = 'GITHUB_QUEUE_FAILED', completed_at = ? WHERE id = ?").bind(now, jobId).run(); throw new Error('GITHUB_QUEUE_FAILED'); }
 await repositoryEvent(env, workspaceId, repo.id, actor, 'repository.scan_queued', { jobId, trigger });
 return { jobId, status: 'queued' };
}
export async function githubFile(token: string, fullName: string, path: string, sha: string, fetcher: Fetcher = fetch) {
 const file = await github<{ content: string; encoding: string; size: number }>(`${repoPath(fullName)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(sha)}`, token, {}, fetcher);
 if (file.encoding !== 'base64' || file.size > 512_000 || typeof file.content !== 'string') throw new Error('GITHUB_FILE_UNSUPPORTED');
 return Buffer.from(file.content, 'base64').toString('utf8');
}
export async function prepareRepositoryFix(env: GitHubEnv, workspaceId: number, findingId: string, actor: number, fetcher: Fetcher = fetch) {
 const finding = await env.DB.prepare("SELECT * FROM security_repository_findings WHERE id = ? AND workspace_id = ? AND kind = 'dependency' AND status = 'open'").bind(findingId, workspaceId).first<{ id: string; repository_id: string; commit_sha: string; file_path: string; details_json: string }>();
 if (!finding || finding.file_path !== 'package-lock.json') throw new Error('REPOSITORY_FIX_UNSUPPORTED');
 const repo = await repositoryFor(env, workspaceId, finding.repository_id);
 if (!repo.enabled) throw new Error('GITHUB_REPOSITORY_DISABLED');
 const details = JSON.parse(finding.details_json);
 const name = details.package, from = details.version, to = details.fixedVersion;
 if (!to || !/^(@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(name)) throw new Error('REPOSITORY_FIX_UNSUPPORTED');
 const token = await installationToken(env, repo.installation_id, repo.github_id, false, fetcher);
 const head = await github<{ sha: string }>(`${repoPath(repo.full_name)}/commits/${encodeURIComponent(repo.default_branch)}`, token, {}, fetcher);
 if (head.sha !== finding.commit_sha) throw new Error('REPOSITORY_RESCAN_REQUIRED');
 const [packageText, lockText] = await Promise.all(['package.json', 'package-lock.json'].map(path => githubFile(token, repo.full_name, path, head.sha, fetcher)));
 const metadataResponse = await fetcher(`https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(to)}`, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
 if (!metadataResponse.ok) throw new Error('REPOSITORY_REGISTRY_UNAVAILABLE');
 const patch = createLeafDependencyPatch(packageText, lockText, name, from, to, await boundedJson(metadataResponse, 512_000) as Record<string, unknown>);
 for (const file of patch.files) if ((await inspectSource(file.path, file.content)).some(f => f.kind === 'secret')) throw new Error('REPOSITORY_PATCH_CONTAINS_SECRET');
 const response = await fetcher('https://api.osv.dev/v1/query', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ package: { ecosystem: 'npm', name }, version: to }) });
 if (!response.ok) throw new Error('REPOSITORY_ADVISORIES_UNAVAILABLE');
 const advice = await boundedJson(response) as { vulns?: unknown[] };
 if (advice.vulns?.length) throw new Error('REPOSITORY_FIX_STILL_VULNERABLE');
 patch.validation.checks.push('Versão proposta sem alerta retornado pela OSV');
 const fixId = id('srf'), now = new Date().toISOString();
 await env.DB.prepare("INSERT INTO security_repository_fixes (id, workspace_id, repository_id, finding_id, base_sha, status, patch_json, validation_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)").bind(fixId, workspaceId, repo.id, finding.id, head.sha, JSON.stringify(patch.files), JSON.stringify(patch.validation), now, now).run();
 await repositoryEvent(env, workspaceId, repo.id, actor, 'repository.fix_prepared', { fixId, findingId });
 return { fixId };
}
export async function publishRepositoryFix(env: GitHubEnv, workspaceId: number, fixId: string, actor: number, fetcher: Fetcher = fetch) {
 const fix = await env.DB.prepare("SELECT * FROM security_repository_fixes WHERE id = ? AND workspace_id = ? AND status = 'draft'").bind(fixId, workspaceId).first<{ repository_id: string; base_sha: string; patch_json: string; validation_json: string; created_at: string }>();
 if (!fix || Date.now() - Date.parse(fix.created_at) > 86400_000) throw new Error('REPOSITORY_FIX_EXPIRED');
 const repo = await repositoryFor(env, workspaceId, fix.repository_id);
 if (!repo.enabled) throw new Error('GITHUB_REPOSITORY_DISABLED');
 const token = await installationToken(env, repo.installation_id, repo.github_id, true, fetcher), base = repoPath(repo.full_name);
 const head = await github<{ sha: string; commit: { tree: { sha: string } } }>(`${base}/commits/${encodeURIComponent(repo.default_branch)}`, token, {}, fetcher);
 if (head.sha !== fix.base_sha) throw new Error('REPOSITORY_RESCAN_REQUIRED');
 const files = JSON.parse(fix.patch_json) as LeafPatch['files'], validation = JSON.parse(fix.validation_json) as LeafPatch['validation'];
 if (files.length !== 2 || files.some(f => !['package.json', 'package-lock.json'].includes(f.path))) throw new Error('REPOSITORY_PATCH_INVALID');
 const now = new Date().toISOString();
 const claimed = await env.DB.prepare("UPDATE security_repository_fixes SET status = 'publishing', approved_at = ?, approved_by_user_id = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND status = 'draft'").bind(now, actor, now, fixId, workspaceId).run();
 if (Number(claimed.meta.changes) !== 1) throw new Error('REPOSITORY_FIX_BUSY');
 try {
  const branch = `cbshub/security-${fixId}`;
  const tree = await github<{ sha: string }>(`${base}/git/trees`, token, { method: 'POST', body: JSON.stringify({ base_tree: head.commit.tree.sha, tree: files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })) }) }, fetcher);
  const commit = await github<{ sha: string }>(`${base}/git/commits`, token, { method: 'POST', body: JSON.stringify({ message: `security: update ${validation.package} to ${validation.to}`, tree: tree.sha, parents: [head.sha] }) }, fetcher);
  await github(`${base}/git/refs`, token, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }) }, fetcher);
  const pr = await github<{ html_url: string; number: number }>(`${base}/pulls`, token, { method: 'POST', body: JSON.stringify({ title: `Security: ${validation.package} ${validation.from} → ${validation.to}`, head: branch, base: repo.default_branch, draft: true, body: `Atualização de dependência preparada pelo CBSHub e aprovada no workspace.\n\nValidações estruturais:\n${validation.checks.map(c => `- ${c}`).join('\n')}\n\nOs testes do projeto não foram executados pelo CBSHub. Execute o CI e revise antes de fazer merge.\n\nBase analisada: ${fix.base_sha}\nProposta: ${fixId}` }) }, fetcher);
  if (!pr.html_url.startsWith(`https://github.com/${repo.full_name}/pull/`)) throw new Error('GITHUB_RESPONSE_INVALID');
  await env.DB.prepare("UPDATE security_repository_fixes SET status = 'opened', external_pr_url = ?, external_pr_number = ?, patch_json = '[]', updated_at = ? WHERE id = ?").bind(pr.html_url, pr.number, new Date().toISOString(), fixId).run();
  await repositoryEvent(env, workspaceId, repo.id, actor, 'repository.pr_opened', { fixId, number: pr.number });
  return { url: pr.html_url };
 } catch {
  await env.DB.prepare("UPDATE security_repository_fixes SET status = 'review', error_code = 'GITHUB_PR_PUBLICATION_UNCERTAIN', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), fixId).run();
  throw new Error('GITHUB_PR_PUBLICATION_UNCERTAIN');
 }
}
export async function verifyConfiguredGitHubApp(env: GitHubEnv) { return github<{ id: number; slug: string }>('/app', await appJwt(env)); }

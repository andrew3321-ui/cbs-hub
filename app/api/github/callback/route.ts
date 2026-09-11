import { env } from 'cloudflare:workers';
import { githubApiContext } from '../../../github-api-context';
import { finishGitHubConnection, repositoryEvent } from '../../../github-repository-service';
import { publicOrigin, type GitHubEnv } from '../../../github-client';
const publicResult = (code: string) => code === 'GITHUB_NO_ADMIN_REPOSITORIES' ? 'no_repositories' : code === 'GITHUB_OAUTH_CLIENT_INVALID' ? 'client_configuration' : code === 'GITHUB_OAUTH_REDIRECT_INVALID' ? 'callback_configuration' : code === 'GITHUB_OAUTH_EMAIL_UNVERIFIED' ? 'email_unverified' : code === 'GITHUB_OAUTH_CODE_INVALID' || code === 'GITHUB_OAUTH_INVALID' ? 'authorization_expired' : code === 'GITHUB_HTTP_401' || code === 'GITHUB_HTTP_403' ? 'github_denied' : 'failed';
export async function GET(request: Request) {
 const ctx = await githubApiContext(true); if (ctx instanceof Response) return ctx;
 const e = env as unknown as GitHubEnv, url = new URL(request.url);
 let result = 'connected';
 try { await finishGitHubConnection(e, ctx.workspace.id, ctx.user.id, url.searchParams.get('code') ?? '', url.searchParams.get('state') ?? ''); }
 catch (error) {
  const code = error instanceof Error && /^GITHUB_[A-Z0-9_]+$/.test(error.message) ? error.message : 'GITHUB_CONNECTION_FAILED';
  result = publicResult(code);
  console.error(JSON.stringify({ event: 'github.connection_failed', code, workspaceId: ctx.workspace.id, userId: ctx.user.id }));
  await repositoryEvent(e, ctx.workspace.id, null, ctx.user.id, 'github.connection_failed', { code }).catch(() => undefined);
 }
 return new Response(null, { status: 303, headers: { Location: `${publicOrigin(e)}/app/projetos?github=${result}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

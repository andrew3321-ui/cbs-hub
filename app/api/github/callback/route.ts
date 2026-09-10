import { env } from 'cloudflare:workers';
import { githubApiContext } from '../../../github-api-context';
import { finishGitHubConnection } from '../../../github-repository-service';
import { publicOrigin, type GitHubEnv } from '../../../github-client';
export async function GET(request: Request) {
 const ctx = await githubApiContext(true); if (ctx instanceof Response) return ctx;
 const e = env as unknown as GitHubEnv, url = new URL(request.url);
 let result = 'connected';
 try { await finishGitHubConnection(e, ctx.workspace.id, ctx.user.id, url.searchParams.get('code') ?? '', url.searchParams.get('state') ?? ''); }
 catch (error) { result = error instanceof Error && error.message === 'GITHUB_NO_ADMIN_REPOSITORIES' ? 'no_repositories' : 'failed'; }
 return new Response(null, { status: 303, headers: { Location: `${publicOrigin(e)}/app?github=${result}#repositories`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

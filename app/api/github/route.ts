import { env } from 'cloudflare:workers';
import { withApiTelemetry } from '../../api-infrastructure';
import { githubApiContext } from '../../github-api-context';
import { githubConfigured, type GitHubEnv } from '../../github-client';
import { enqueueRepositoryScan, prepareRepositoryFix, publishRepositoryFix, repositoryEvent, repositoryFor, startGitHubConnection } from '../../github-repository-service';
import { reviewCampaignSignal } from '../../security-impact-service';
const runtime = () => env as unknown as GitHubEnv & { OPENAI_API_KEY?: string; OPENAI_SECURITY_PRIMARY_MODEL?: string };
async function getProjects() {
 const ctx = await githubApiContext(); if (ctx instanceof Response) return ctx;
 const e = runtime(); const ws = ctx.workspace.id;
 const [repos, jobs, findings, fixes, campaigns, impactReviews] = await Promise.all([
  e.DB.prepare('SELECT r.id, r.full_name, r.default_branch, r.enabled, r.monitoring_enabled, r.authorized_until, r.last_scan_at, c.account_login, c.status connection_status FROM security_repositories r JOIN github_connections c ON c.id = r.connection_id WHERE r.workspace_id = ? ORDER BY r.full_name LIMIT 100').bind(ws).all(),
  e.DB.prepare('SELECT id, repository_id, commit_sha, status, coverage_json, error_code, created_at, completed_at FROM security_repository_jobs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 40').bind(ws).all(),
  e.DB.prepare('SELECT id, repository_id, kind, title, severity, file_path, line, details_json, status, commit_sha FROM security_repository_findings WHERE workspace_id = ? ORDER BY last_observed_at DESC LIMIT 100').bind(ws).all(),
  e.DB.prepare('SELECT id, repository_id, finding_id, base_sha, status, validation_json, external_pr_url, error_code, created_at FROM security_repository_fixes WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 40').bind(ws).all(),
  e.DB.prepare("SELECT c.id, s.domain, c.runner_result_json FROM security_campaigns c JOIN security_agent_scopes s ON s.id = c.scope_id AND s.workspace_id = c.workspace_id WHERE c.workspace_id = ? AND c.executor = 'isolated_runner' AND c.status IN ('completed','review') AND s.status = 'verified' AND s.authorization_expires_at > ? ORDER BY c.created_at DESC LIMIT 20").bind(ws, new Date().toISOString()).all<{ id: string; domain: string; runner_result_json: string }>(),
  e.DB.prepare('SELECT id, repository_id, campaign_id, signal_code, base_sha, status, model, result_json, input_tokens, output_tokens, total_tokens, error_code, created_at FROM security_ai_impact_reviews WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 40').bind(ws).all(),
 ]);
 const configured = githubConfigured(e);
 const signals = campaigns.results.flatMap((campaign: { id: string; domain: string; runner_result_json: string }) => { try { const probe = JSON.parse(campaign.runner_result_json) as { webProbe?: { signals?: Array<{ code: string; title: string }> } }; return (probe.webProbe?.signals ?? []).map((signal) => ({ campaignId: campaign.id, domain: campaign.domain, code: signal.code, title: signal.title })); } catch { return []; } });
 return Response.json({ configured, runnerConfigured: Boolean(e.SECURITY_REPOSITORY_QUEUE), impactConfigured: Boolean(e.OPENAI_API_KEY?.trim()), canManage: ctx.canManage, installUrl: configured && /^[a-z0-9-]+$/.test(e.GITHUB_APP_SLUG!) ? `https://github.com/apps/${e.GITHUB_APP_SLUG}/installations/new` : null, repositories: repos.results, jobs: jobs.results, findings: findings.results, fixes: fixes.results, signals, impactReviews: impactReviews.results }, { headers: { 'Cache-Control': 'no-store' } });
}
const errors: Record<string, string> = {
 GITHUB_NOT_CONFIGURED: 'A integração GitHub está aguardando ativação pelo administrador da plataforma.',
 GITHUB_REPOSITORY_NOT_AUTHORIZED: 'Reconecte o GitHub para renovar a autorização deste projeto.',
 GITHUB_REPOSITORY_DISABLED: 'Ative este repositório antes de analisar.',
 GITHUB_RUNNER_NOT_CONFIGURED: 'O processamento de repositórios ainda não está configurado.',
 GITHUB_SCAN_DAILY_LIMIT: 'O limite de 30 análises diárias deste workspace foi atingido.',
 REPOSITORY_FIX_UNSUPPORTED: 'Esta dependência exige uma atualização manual. A correção automática cobre versões diretas fixadas, sem novas dependências ou scripts de instalação.',
 REPOSITORY_RESCAN_REQUIRED: 'O código mudou. Execute uma nova análise antes de preparar a correção.',
 REPOSITORY_FIX_STILL_VULNERABLE: 'A versão proposta ainda apresenta alertas. Revise a atualização manualmente.',
 GITHUB_PR_PUBLICATION_UNCERTAIN: 'A publicação foi interrompida. Confira a branch CBSHub no GitHub antes de tentar outra correção.',
 REPOSITORY_PATCH_CONTAINS_SECRET: 'Os arquivos da correção contêm um possível segredo. Faça a remoção e rotação antes de continuar.',
 REPOSITORY_IMPACT_AUTHORIZATION_REQUIRED: 'Confirme que este repositório corresponde ao ativo e ao sinal observado.',
 REPOSITORY_IMPACT_SCOPE_INVALID: 'O ativo não está verificado ou a autorização expirou.',
 REPOSITORY_IMPACT_SIGNAL_INVALID: 'Este sinal não pertence à validação selecionada.',
 REPOSITORY_IMPACT_AI_NOT_CONFIGURED: 'A análise contextual por IA ainda não foi configurada.',
 REPOSITORY_IMPACT_NO_CODE_CONTEXT: 'Não foram encontrados arquivos pertinentes e seguros para uma análise contextual.',
 REPOSITORY_IMPACT_DAILY_LIMIT: 'O limite diário de análises contextuais ou de tokens deste workspace foi atingido.',
 REPOSITORY_IMPACT_TREE_INCOMPLETE: 'A árvore do repositório não coube na leitura limitada. Reduza o escopo ou revise manualmente.',
 REPOSITORY_IMPACT_OUTPUT_INVALID: 'A resposta da análise não passou na validação. Nenhuma mudança foi proposta ao repositório.',
};
async function postProjects(request: Request) {
 const ctx = await githubApiContext(true); if (ctx instanceof Response) return ctx;
 const e = runtime(), ws = ctx.workspace.id;
 const body = await request.json().catch(() => null) as Record<string, unknown> | null;
 if (!body || typeof body.action !== 'string') return Response.json({ error: 'Operação inválida.' }, { status: 400 });
 try {
  if (body.action === 'connect') return Response.json(await startGitHubConnection(e, ws, ctx.user.id));
  if (body.action === 'configure_repository') {
   const repo = await repositoryFor(e, ws, body.repositoryId);
   if (typeof body.enabled !== 'boolean' || typeof body.monitoring !== 'boolean' || body.enabled && body.authorizationConfirmed !== true) throw new Error('GITHUB_AUTHORIZATION_REQUIRED');
   await e.DB.prepare('UPDATE security_repositories SET enabled = ?, monitoring_enabled = ?, updated_at = ? WHERE id = ? AND workspace_id = ?').bind(body.enabled ? 1 : 0, body.enabled && body.monitoring ? 1 : 0, new Date().toISOString(), repo.id, ws).run();
   await repositoryEvent(e, ws, repo.id, ctx.user.id, 'repository.configuration_changed', { enabled: body.enabled, monitoring: body.monitoring });
   return Response.json({ updated: true });
  }
  if (body.action === 'scan') return Response.json(await enqueueRepositoryScan(e, ws, body.repositoryId, ctx.user.id));
  if (body.action === 'review_campaign_signal') return Response.json(await reviewCampaignSignal(e, ws, ctx.user.id, { repositoryId: body.repositoryId, campaignId: body.campaignId, signalCode: body.signalCode, relationshipConfirmed: body.relationshipConfirmed }));
  if (body.action === 'prepare_fix' && typeof body.findingId === 'string') return Response.json(await prepareRepositoryFix(e, ws, body.findingId, ctx.user.id));
  if (body.action === 'publish_fix' && typeof body.fixId === 'string' && body.approvalConfirmed === true) return Response.json(await publishRepositoryFix(e, ws, body.fixId, ctx.user.id));
  if (body.action === 'disconnect') {
   const repo = await repositoryFor(e, ws, body.repositoryId);
   await e.DB.batch([
    e.DB.prepare("UPDATE github_connections SET status = 'revoked', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(new Date().toISOString(), repo.connection_id, ws),
    e.DB.prepare('UPDATE security_repositories SET enabled = 0, monitoring_enabled = 0 WHERE connection_id = ? AND workspace_id = ?').bind(repo.connection_id, ws),
   ]);
   await repositoryEvent(e, ws, repo.id, ctx.user.id, 'github.disconnected'); return Response.json({ disconnected: true });
  }
  throw new Error('GITHUB_ACTION_INVALID');
 } catch (error) {
  const code = error instanceof Error && /^(?:GITHUB|REPOSITORY)_[A-Z0-9_]+$/.test(error.message) ? error.message : 'GITHUB_OPERATION_FAILED';
  return Response.json({ code, error: errors[code] || 'Não foi possível concluir. Confira a conexão e as permissões do repositório.' }, { status: ['GITHUB_SCAN_DAILY_LIMIT', 'REPOSITORY_IMPACT_DAILY_LIMIT'].includes(code) ? 429 : 400 });
 }
}
export const GET = withApiTelemetry('/api/github', getProjects);
export const POST = withApiTelemetry('/api/github', postProjects);

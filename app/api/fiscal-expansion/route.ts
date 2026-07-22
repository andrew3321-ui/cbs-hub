import {
  applyExpansionProgress,
  expansionMetrics,
  expansionQueue,
  expansionStageLabels,
  expansionTargets,
  fiscalExpansionBacklog,
  FISCAL_EXPANSION_VERSION,
  nextExpansionStage,
  type ExpansionStage,
} from "../../../domain/fiscal-expansion";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { listExpansionEvents, listExpansionProgress, saveExpansionTransition } from "../../fiscal-expansion-service";
import { canPrepareScenarios, getWorkspaceContext, sha256Hex } from "../../workspace";
import { withWorkspaceFeature } from "../../plan-entitlements";
import { FISCAL_SIMULATION_SUITE_VERSION, runFiscalSimulationSuite } from "../../../domain/fiscal-homologation-simulations";

async function payload(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) throw new Error("workspace_not_found");
  const [progress, events] = await Promise.all([listExpansionProgress(workspace.id), listExpansionEvents(workspace.id)]);
  const items = applyExpansionProgress(fiscalExpansionBacklog, progress);
  return {
    version: FISCAL_EXPANSION_VERSION,
    targets: expansionTargets,
    metrics: expansionMetrics(items),
    queue: expansionQueue(items),
    items,
    events,
    stageLabels: expansionStageLabels,
    permissions: {
      role: workspace.role,
      canPrepare: canPrepareScenarios(workspace.role),
    },
    policy: {
      automation: "deterministic_only",
      automaticVerification: true,
      statement: "A esteira conecta fontes oficiais, estrutura regras e executa controles determinísticos no servidor. Mudanças na base exigem nova execução e nunca são liberadas apenas por um clique do usuário.",
    },
  };
}

async function getExpansion() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a esteira fiscal." }, { status: 401 });
  try {
    return Response.json(await payload(user), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar a esteira de expansão fiscal." }, { status: 500 });
  }
}

function normalizedReference(value: unknown) {
  const reference = String(value ?? "").trim();
  if (reference.length < 4 || reference.length > 500) return null;
  return reference;
}

async function advanceExpansion(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para atualizar a esteira fiscal." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action !== "advance") return Response.json({ error: "Ação inválida." }, { status: 400 });
    const itemCode = String(body.itemCode ?? "").trim();
    const base = fiscalExpansionBacklog.find((item) => item.code === itemCode);
    if (!base) return Response.json({ error: "Item da esteira não encontrado." }, { status: 404 });
    const progress = await listExpansionProgress(workspace.id);
    const currentProgress = progress.find((entry) => entry.itemCode === itemCode) ?? null;
    const currentStage: ExpansionStage = currentProgress?.stage ?? base.defaultStage;
    if (String(body.expectedStage ?? "") !== currentStage) return Response.json({ error: "Este item mudou desde que a tela foi aberta. Recarregue a fila." }, { status: 409 });
    const nextStage = nextExpansionStage(currentStage);
    if (!nextStage) return Response.json({ error: "Este item já atingiu o último estado técnico ou está bloqueado." }, { status: 409 });
    if (!canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite preparar itens da cobertura." }, { status: 403 });
    const automaticRun = nextStage === "automatically_verified" ? runFiscalSimulationSuite() : null;
    if (automaticRun && !automaticRun.every((run) => run.passed)) return Response.json({ error: "A bateria automática encontrou divergências. O item permanece bloqueado até que os testes sejam corrigidos." }, { status: 409 });
    const evidenceNote = automaticRun
      ? `Bateria ${FISCAL_SIMULATION_SUITE_VERSION} reexecutada no servidor: ${automaticRun.length}/${automaticRun.length} cenários aprovados.`
      : String(body.evidenceNote ?? "").trim();
    if (evidenceNote.length < 30 || evidenceNote.length > 1_500) return Response.json({ error: "Descreva a evidência com 30 a 1.500 caracteres." }, { status: 400 });
    const evidenceReference = automaticRun ? `AUTOMATED-SUITE:${FISCAL_SIMULATION_SUITE_VERSION}` : normalizedReference(body.evidenceReference);
    if (!evidenceReference) return Response.json({ error: "Informe uma referência verificável: URL oficial, código de regra versionada ou conjunto de testes." }, { status: 400 });
    if (!automaticRun && body.gatesAcknowledged !== true) return Response.json({ error: "Confirme que os critérios da etapa foram conferidos." }, { status: 400 });
    const evidenceHash = await sha256Hex(JSON.stringify({ version: FISCAL_EXPANSION_VERSION, workspaceId: workspace.id, itemCode, currentStage, nextStage, evidenceNote, evidenceReference }));
    await saveExpansionTransition({
      workspaceId: workspace.id,
      itemCode,
      actorUserId: user.id,
      fromStage: currentStage,
      toStage: nextStage,
      evidenceNote,
      evidenceReference,
      evidenceHash,
      expectedUpdatedAt: currentProgress?.updatedAt ?? null,
    });
    return Response.json(await payload(user), { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "expansion_progress_conflict") return Response.json({ error: "Atualização concorrente detectada. Recarregue a fila antes de continuar." }, { status: 409 });
    return Response.json({ error: "Não foi possível registrar a evolução com segurança." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-expansion", withWorkspaceFeature("fiscalExpansionEnabled", getExpansion));
export const POST = withApiTelemetry("POST /api/fiscal-expansion", withWorkspaceFeature("fiscalExpansionEnabled", advanceExpansion));

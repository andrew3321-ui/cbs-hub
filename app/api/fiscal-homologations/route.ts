import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";
import {
  createFiscalHomologationSnapshot,
  createFiscalLabHomologationSnapshot,
  hashFiscalHomologationText,
} from "../../../domain/fiscal-homologation";
import { evaluateExpandedFiscalQuestion } from "../../../domain/fiscal-intelligence-v24";
import { calculateTaxLab } from "../../../domain/deterministic-tax-lab";
import {
  FISCAL_SIMULATION_BASE_CODE,
  FISCAL_SIMULATION_REFERENCE_DATE,
  fiscalSimulationBaseHash,
  getFiscalSimulationCase,
  runFiscalSimulationSuite,
} from "../../../domain/fiscal-homologation-simulations";
import { ensureScenarioSchema, getDb } from "../../../db";
import { fiscalHomologationCases, users, workspaceMembers } from "../../../db/schema";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { fiscalHomologationResponseRows } from "../../fiscal-homologation-service";
import { loadFiscalKnowledgeBase, parseFiscalOverrides } from "../../fiscal-intelligence-service";
import { withWorkspaceFeature } from "../../plan-entitlements";
import { canPrepareScenarios, canReviewScenarios, getWorkspaceContext } from "../../workspace";

async function responsePayload(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return null;
  const { stored, definition } = await loadFiscalKnowledgeBase();
  const currentSimulationBaseHash = await fiscalSimulationBaseHash();
  const db = getDb();
  const eligibleReviewers = workspace.type === "office"
    ? await db.select({ userId: users.id, name: users.name, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(
        eq(workspaceMembers.workspaceId, workspace.id),
        eq(workspaceMembers.status, "active"),
        inArray(workspaceMembers.role, ["owner", "admin", "reviewer"]),
      ))
    : [];
  const cases = await fiscalHomologationResponseRows(workspace.id, stored.contentHash, definition, currentSimulationBaseHash);
  const simulations = runFiscalSimulationSuite().map((run) => {
    const existing = cases.find((item) => item.snapshot?.schemaVersion === "fiscal-homologation-lab-snapshot.v2" && item.snapshot.simulation.code === run.case.code);
    return {
      code: run.case.code,
      title: run.case.title,
      moduleLabel: run.case.moduleLabel,
      profile: run.case.profile,
      scenario: run.case.scenario,
      operationPeriod: run.case.operationPeriod,
      kind: run.case.kind,
      expectedProfessionalConclusion: run.case.expectedProfessionalConclusion,
      technicalStatus: run.passed ? "passed" : "failed",
      outputStatus: run.output.status,
      summary: run.output.summary,
      checksPassed: run.checks.filter((check) => check.passed).length,
      checksTotal: run.checks.length,
      blockers: run.output.issues.filter((issue) => issue.severity === "blocker").map((issue) => issue.message),
      sourceCount: run.sourceCodes.length,
      existingCaseId: existing?.id ?? null,
      professionalStatus: existing?.status ?? "not_started",
    };
  });
  return {
    cases,
    simulations: {
      version: "2026.07.18-v54",
      syntheticDataOnly: true,
      cases: simulations,
      metrics: {
        total: simulations.length,
        technicalPassed: simulations.filter((item) => item.technicalStatus === "passed").length,
        calculatedReferences: simulations.filter((item) => item.kind === "calculated_reference").length,
        expectedBlocks: simulations.filter((item) => item.kind === "expected_block").length,
        professionalApproved: simulations.filter((item) => item.professionalStatus === "approved").length,
        distinctModules: new Set(simulations.map((item) => item.moduleLabel.replace(" · bloqueio", ""))).size,
      },
    },
    eligibleReviewers,
    context: {
      currentUserId: user.id,
      currentUserName: user.name,
      workspaceType: workspace.type,
      role: workspace.role,
      canPrepare: canPrepareScenarios(workspace.role),
      canReview: canReviewScenarios(workspace.role),
      currentBaseHash: stored.contentHash,
      currentBaseVersion: stored.version,
    },
    metrics: {
      total: cases.length,
      drafts: cases.filter((item) => item.status === "draft").length,
      awaitingReview: cases.filter((item) => item.status === "ready_for_review").length,
      approved: cases.filter((item) => item.status === "approved").length,
      current: cases.filter((item) => item.validityStatus === "current").length,
      needsRevalidation: cases.filter((item) => item.validityStatus === "requires_revalidation").length,
      regressionFailures: cases.filter((item) => item.regressionStatus === "failed").length,
      rejected: cases.filter((item) => item.status === "rejected").length,
    },
  };
}

async function getFiscalHomologations() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a Central de Homologação." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const payload = await responsePayload(user);
    if (!payload) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
    return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar os casos de homologação." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

async function createFiscalHomologation(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para criar um caso de homologação." }, { status: 401 });
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Envie os dados do caso em formato válido." }, { status: 400 });
  }
  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  const simulationCode = typeof payload.simulationCode === "string" ? payload.simulationCode.trim() : "";
  if (!simulationCode && (question.length < 5 || question.length > 500)) return Response.json({ error: "A pergunta deve ter entre 5 e 500 caracteres." }, { status: 400 });

  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite criar casos de homologação." }, { status: 403 });
    const { stored, definition } = await loadFiscalKnowledgeBase();
    const now = new Date().toISOString();
    const simulation = simulationCode ? getFiscalSimulationCase(simulationCode) : null;
    if (simulationCode && !simulation) return Response.json({ error: "Caso simulado não encontrado na bateria versionada." }, { status: 404 });
    const simulationBaseHash = simulation ? await fiscalSimulationBaseHash() : "";

    // Segurança: o resultado enviado pelo navegador nunca é aceito. O servidor recebe só o código ou os fatos e reexecuta o motor correspondente.
    const snapshot = simulation
      ? createFiscalLabHomologationSnapshot(simulation, calculateTaxLab(simulation.input), simulationBaseHash, FISCAL_SIMULATION_REFERENCE_DATE)
      : (() => {
        const facts = parseFiscalOverrides(payload.facts);
        const result = evaluateExpandedFiscalQuestion(question, facts, now.slice(0, 10), definition);
        return createFiscalHomologationSnapshot(question, result, stored.contentHash, now);
      })();
    const snapshotJson = JSON.stringify(snapshot);
    const snapshotHash = await hashFiscalHomologationText(snapshotJson);
    const db = getDb();
    const [existing] = await db.select({ id: fiscalHomologationCases.id })
      .from(fiscalHomologationCases)
      .where(and(eq(fiscalHomologationCases.workspaceId, workspace.id), eq(fiscalHomologationCases.snapshotHash, snapshotHash)))
      .limit(1);
    if (existing) {
      const response = await responsePayload(user);
      return Response.json({ case: response?.cases.find((item) => item.id === existing.id), idempotent: true });
    }

    const id = crypto.randomUUID();
    const title = `${snapshot.topicCode} · ${snapshot.engine.headline}`.slice(0, 160);
    const baseCode = simulation ? FISCAL_SIMULATION_BASE_CODE : stored.code;
    const baseVersion = simulation ? snapshot.evidence.baseVersion : stored.version;
    const baseHash = simulation ? simulationBaseHash : stored.contentHash;
    const eventData = JSON.stringify({ snapshotHash, baseCode, baseVersion, baseHash, engineVersion: snapshot.evidence.engineVersion, simulationCode: simulation?.code ?? null, syntheticDataOnly: Boolean(simulation) });
    const results = await env.DB.batch([
      env.DB.prepare("INSERT INTO fiscal_homologation_cases (id, workspace_id, owner_user_id, created_by_user_id, title, question, topic_code, status, assurance_level, base_code, base_version, base_hash, engine_version, snapshot_json, snapshot_hash, expected_json, independent_conclusion, review_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 'engine_verified', ?, ?, ?, ?, ?, ?, '{}', '', '', ?, ?)")
        .bind(id, workspace.id, workspace.ownerUserId, user.id, title, snapshot.question, snapshot.topicCode, baseCode, baseVersion, baseHash, snapshot.evidence.engineVersion, snapshotJson, snapshotHash, now, now),
      env.DB.prepare("INSERT INTO fiscal_homologation_events (case_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, 'fiscal_homologation.created', ?, ?, ? FROM fiscal_homologation_cases WHERE id = ? AND workspace_id = ?")
        .bind(user.id, simulation ? "Caso sintético reproduzido pelo motor; aguardando conferência profissional independente." : "Caso congelado pelo motor; ainda não homologado por profissional.", eventData, now, id, workspace.id),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "O caso não foi persistido integralmente." }, { status: 409 });
    const response = await responsePayload(user);
    return Response.json({ case: response?.cases.find((item) => item.id === id), idempotent: false }, { status: 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message.startsWith("invalid_")) return Response.json({ error: "Revise os fatos informados para a consulta." }, { status: 400 });
    if (message.startsWith("ineligible_homologation:")) return Response.json({ error: message.slice("ineligible_homologation:".length) }, { status: 409 });
    return Response.json({ error: "O caso foi bloqueado porque não passou em todos os controles de integridade." }, { status: 503 });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-homologations", withWorkspaceFeature("professionalGovernanceEnabled", getFiscalHomologations));
export const POST = withApiTelemetry("POST /api/fiscal-homologations", withWorkspaceFeature("professionalGovernanceEnabled", createFiscalHomologation));

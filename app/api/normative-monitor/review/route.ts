import { env } from "cloudflare:workers";
import { normalizeProfessionalRegistration, professionalRegistrationError } from "../../../professional-registration";
import { ensureNormativeGovernanceSchema, sha256Hex } from "../../../normative-governance-service";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getPlatformAdminUser } from "../../../platform-admin";
import { getWorkspaceContext } from "../../../workspace";

const DECLARATION_VERSION = "normative-change-review.v1";
const decisions = ["no_legal_impact", "new_version_required", "superseded_by_new_version"] as const;
type Decision = typeof decisions[number];

type ReviewRecord = {
  eventId: string;
  workspaceId: number;
  reviewerUserId: number;
  reviewerName: string;
  professionalRole: string;
  professionalRegistration: string;
  decision: Decision;
  decisionNote: string;
  releaseVersion: string | null;
  releaseHash: string | null;
  declarationVersion: string;
  decidedAt: string;
};

function signingSecret() {
  const value = String((env as unknown as { SCENARIO_SIGNING_KEY_V1?: string }).SCENARIO_SIGNING_KEY_V1 ?? "").trim();
  if (value.length < 32) throw new Error("governance_signing_key_unavailable");
  return value;
}

async function sign(record: ReviewRecord) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signingSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(JSON.stringify(record)));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseImpactedRules(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).sort() : [];
  } catch {
    return [];
  }
}

async function review(request: Request) {
  const user = await getPlatformAdminUser();
  if (!user) return Response.json({ error: "Somente a administração da plataforma pode decidir mudanças normativas globais." }, { status: 403 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const eventId = String(body.eventId ?? "").trim();
    const decision = String(body.decision ?? "") as Decision;
    const decisionNote = String(body.decisionNote ?? "").trim();
    const professionalRole = String(body.professionalRole ?? "");
    const professionalRegistration = normalizeProfessionalRegistration(String(body.professionalRegistration ?? ""));
    if (!eventId) return Response.json({ error: "Mudança normativa não informada." }, { status: 400 });
    if (!decisions.includes(decision)) return Response.json({ error: "Decisão normativa inválida." }, { status: 400 });
    if (!["accountant", "tax_lawyer"].includes(professionalRole)) return Response.json({ error: "Selecione contador ou tributarista." }, { status: 400 });
    const registrationError = professionalRegistrationError(professionalRegistration);
    if (registrationError) return Response.json({ error: registrationError }, { status: 400 });
    if (body.declarationAccepted !== true) return Response.json({ error: "Confirme a responsabilidade pela decisão registrada." }, { status: 400 });
    if (decisionNote.length < 20 || decisionNote.length > 2_000) return Response.json({ error: "Registre uma justificativa técnica entre 20 e 2.000 caracteres." }, { status: 400 });

    await ensureNormativeGovernanceSchema(env.DB);
    const change = await env.DB.prepare("SELECT id, source_code, status, impacted_rule_codes_json FROM normative_change_events WHERE id = ? LIMIT 1")
      .bind(eventId).first<{ id: string; source_code: string; status: string; impacted_rule_codes_json: string }>();
    if (!change) return Response.json({ error: "Mudança normativa não encontrada." }, { status: 404 });
    if (!["pending_review", "awaiting_new_version"].includes(change.status)) return Response.json({ error: "Esta mudança já possui resolução final." }, { status: 409 });

    let releaseVersion: string | null = null;
    let releaseHash: string | null = null;
    let releaseId: string | null = null;
    let manifestJson: string | null = null;
    let previousReleaseHash: string | null = null;
    if (decision === "superseded_by_new_version") {
      const release = body.release as Record<string, unknown> | undefined;
      releaseVersion = String(release?.version ?? "").trim();
      if (!/^[0-9A-Za-z][0-9A-Za-z._-]{2,63}$/.test(releaseVersion)) return Response.json({ error: "Informe uma versão nova válida para o manifesto." }, { status: 400 });
      const affectedRuleCodes = Array.isArray(release?.affectedRuleCodes) ? release.affectedRuleCodes.map(String).sort() : [];
      const expectedRuleCodes = parseImpactedRules(change.impacted_rule_codes_json);
      if (JSON.stringify(affectedRuleCodes) !== JSON.stringify(expectedRuleCodes)) return Response.json({ error: "O manifesto deve cobrir exatamente todas as regras afetadas pelo sinal." }, { status: 400 });
      const summary = String(release?.summary ?? "").trim();
      if (summary.length < 20 || summary.length > 4_000) return Response.json({ error: "Descreva a nova versão e a forma como ela resolve a mudança." }, { status: 400 });
      manifestJson = JSON.stringify({ schemaVersion: "fiscal-rule-release.v1", version: releaseVersion, affectedRuleCodes, summary, sourceChangeEventId: eventId, sourceCode: change.source_code });
      releaseHash = await sha256Hex(manifestJson);
      const previous = await env.DB.prepare("SELECT manifest_hash FROM fiscal_rule_releases WHERE status = 'approved' ORDER BY created_at DESC, id DESC LIMIT 1").first<{ manifest_hash: string }>();
      previousReleaseHash = previous?.manifest_hash ?? null;
      releaseId = crypto.randomUUID();
    }

    const decidedAt = new Date().toISOString();
    const record: ReviewRecord = {
      eventId,
      workspaceId: workspace.id,
      reviewerUserId: user.id,
      reviewerName: user.name,
      professionalRole,
      professionalRegistration,
      decision,
      decisionNote,
      releaseVersion,
      releaseHash,
      declarationVersion: DECLARATION_VERSION,
      decidedAt,
    };
    const signature = await sign(record);
    const nextStatus = decision === "new_version_required" ? "awaiting_new_version" : "resolved";
    const reviewId = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [
      env.DB.prepare("INSERT INTO normative_change_reviews (id, change_event_id, workspace_id, reviewer_user_id, reviewer_name, professional_role, professional_registration, decision, decision_note, release_version, release_hash, declaration_version, decision_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(reviewId, eventId, workspace.id, user.id, user.name, professionalRole, professionalRegistration, decision, decisionNote, releaseVersion, releaseHash, DECLARATION_VERSION, signature, decidedAt),
      env.DB.prepare("UPDATE normative_change_events SET status = ?, resolved_at = ?, resolution_release_id = ? WHERE id = ? AND status IN ('pending_review', 'awaiting_new_version')")
        .bind(nextStatus, nextStatus === "resolved" ? decidedAt : null, releaseId, eventId),
      env.DB.prepare("INSERT INTO normative_governance_audit_events (change_event_id, workspace_id, actor_user_id, event_type, event_data, created_at) VALUES (?, ?, ?, 'normative_change.reviewed', ?, ?)")
        .bind(eventId, workspace.id, user.id, JSON.stringify({ decision, decisionNote, releaseVersion, releaseHash, reviewerName: user.name, professionalRole, professionalRegistration, declarationVersion: DECLARATION_VERSION }), decidedAt),
    ];
    if (releaseId && manifestJson && releaseVersion && releaseHash) {
      statements.push(
        env.DB.prepare("INSERT INTO fiscal_rule_releases (id, version, manifest_json, manifest_hash, previous_release_hash, source_change_event_id, release_kind, status, approved_by_user_id, professional_registration, approval_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, 'normative_change', 'approved', ?, ?, ?, ?)")
          .bind(releaseId, releaseVersion, manifestJson, releaseHash, previousReleaseHash, eventId, user.id, professionalRegistration, signature, decidedAt),
      );
    }
    if (nextStatus === "resolved") {
      statements.push(
        env.DB.prepare("UPDATE fiscal_result_invalidations SET status = ?, resolved_at = ?, resolution_release_id = ? WHERE change_event_id = ? AND status = 'open'")
          .bind(decision === "no_legal_impact" ? "dismissed_no_legal_impact" : "resolved_by_new_version", decidedAt, releaseId, eventId),
        env.DB.prepare("UPDATE governance_notifications SET read_at = ? WHERE notification_type = 'fiscal_result_invalidated' AND subject_id IN (SELECT dossier_id FROM fiscal_result_invalidations WHERE change_event_id = ?) AND read_at IS NULL")
          .bind(decidedAt, eventId),
      );
    }
    const results = await env.DB.batch(statements);
    if (results[1].meta.changes !== 1) return Response.json({ error: "A mudança recebeu outra decisão enquanto você revisava. Atualize a página." }, { status: 409 });
    return Response.json({ eventId, status: nextStatus, decision, release: releaseId ? { id: releaseId, version: releaseVersion, fingerprint: releaseHash?.slice(0, 12) } : null }, { status: 201 });
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return Response.json({ error: "Esta versão ou manifesto já foi registrado. Use uma versão nova." }, { status: 409 });
    if (error instanceof Error && error.message === "governance_signing_key_unavailable") return Response.json({ error: "A chave de assinatura da governança não está configurada." }, { status: 503 });
    return Response.json({ error: "Não foi possível registrar a decisão normativa." }, { status: 500 });
  }
}

export const POST = withApiTelemetry("POST /api/normative-monitor/review", review);

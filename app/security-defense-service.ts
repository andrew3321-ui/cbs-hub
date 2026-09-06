import {
  defenseCorrelationBucket,
  evaluateDefenseSignal,
  parseDefenseSignal,
  type DefenseSignal,
} from "../domain/security-defense-policy.ts";
import type { SecurityScopeRow } from "./security-agent-service.ts";

export type SecurityDefenseEnv = {
  DB: D1Database;
  SECURITY_INGEST_SIGNING_KEY?: string;
  SECURITY_HASH_KEY?: string;
  PUBLIC_APP_URL?: string;
};

export type SecurityDefenseConnectorRow = {
  id: string;
  workspace_id: number;
  scope_id: string;
  provider: "signed_webhook";
  mode: "observe" | "protect";
  enforcement: "observe_only" | "cbshub_edge";
  status: "active" | "paused" | "revoked" | "error";
  key_salt: string;
  last_signal_at: string | null;
};

const uuid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const encoder = new TextEncoder();

function bytesToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(value: ArrayBuffer) {
  const binary = Array.from(new Uint8Array(value), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function hmac(key: string, value: string) {
  const imported = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", imported, encoder.encode(value));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function requiredSigningKey(env: SecurityDefenseEnv) {
  const key = env.SECURITY_INGEST_SIGNING_KEY?.trim();
  if (!key || key.length < 32) throw new Error("DEFENSE_SIGNING_KEY_NOT_CONFIGURED");
  return key;
}

async function connectorSecret(env: SecurityDefenseEnv, connectorId: string, salt: string) {
  return bytesToBase64Url(await hmac(requiredSigningKey(env), `connector:${connectorId}:${salt}`));
}

async function sourceHash(env: SecurityDefenseEnv, sourceIp: string | null) {
  if (!sourceIp) return null;
  const key = env.SECURITY_HASH_KEY?.trim() || requiredSigningKey(env);
  return bytesToHex(await hmac(key, `defense-source:${sourceIp}`));
}

function canonicalHost(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.pathname === "/" && !url.search && !url.hash ? url.hostname.toLowerCase() : null;
  } catch { return null; }
}

export async function createDefenseConnector(env: SecurityDefenseEnv, args: { scope: SecurityScopeRow; actorUserId: number }) {
  if (args.scope.status !== "verified") throw new Error("DEFENSE_SCOPE_NOT_VERIFIED");
  if (!args.scope.authorization_expires_at || Date.parse(args.scope.authorization_expires_at) <= Date.now()) throw new Error("DEFENSE_SCOPE_AUTHORIZATION_EXPIRED");
  const existing = await env.DB.prepare("SELECT * FROM security_defense_connectors WHERE scope_id = ? AND provider = 'signed_webhook'")
    .bind(args.scope.id).first<SecurityDefenseConnectorRow>();
  const id = existing?.id ?? uuid("sdc");
  const salt = crypto.randomUUID();
  const enforcement = canonicalHost(env.PUBLIC_APP_URL) === args.scope.domain ? "cbshub_edge" : "observe_only";
  const mode = enforcement === "cbshub_edge" ? "protect" : "observe";
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO security_defense_connectors
      (id, workspace_id, scope_id, provider, mode, enforcement, status, key_salt, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, 'signed_webhook', ?, ?, 'active', ?, ?, ?, ?)
      ON CONFLICT(scope_id, provider) DO UPDATE SET mode = excluded.mode, enforcement = excluded.enforcement, status = 'active', key_salt = excluded.key_salt, updated_at = excluded.updated_at`)
      .bind(id, args.scope.workspace_id, args.scope.id, mode, enforcement, salt, args.actorUserId, now, now),
    env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uuid("sde"), args.scope.workspace_id, args.scope.id, args.actorUserId, existing ? "connector.rotated" : "connector.created", JSON.stringify({ provider: "signed_webhook", mode, enforcement }), now),
  ]);
  return {
    id,
    scopeId: args.scope.id,
    provider: "signed_webhook" as const,
    mode,
    enforcement,
    status: "active" as const,
    ingestSecret: await connectorSecret(env, id, salt),
    authentication: "HMAC-SHA256" as const,
    signatureHeader: "X-CBSHub-Signature: sha256=<hex HMAC(timestamp.rawBody)>",
    timestampHeader: "X-CBSHub-Timestamp: <Unix seconds>",
  };
}

export async function setDefenseConnectorStatus(env: SecurityDefenseEnv, args: { workspaceId: number; scopeId: string; connectorId: unknown; actorUserId: number; enabled: unknown }) {
  if (typeof args.connectorId !== "string" || !/^sdc_[0-9a-f-]{36}$/i.test(args.connectorId) || typeof args.enabled !== "boolean") throw new Error("DEFENSE_CONNECTOR_INVALID");
  const status = args.enabled ? "active" : "paused";
  const result = await env.DB.prepare("UPDATE security_defense_connectors SET status = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ? AND scope_id = ? AND status <> 'revoked'")
    .bind(status, args.connectorId, args.workspaceId, args.scopeId).run();
  if (Number(result.meta.changes ?? 0) !== 1) throw new Error("DEFENSE_CONNECTOR_NOT_FOUND");
  await env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(uuid("sde"), args.workspaceId, args.scopeId, args.actorUserId, args.enabled ? "connector.enabled" : "connector.paused", JSON.stringify({ connectorId: args.connectorId })).run();
  return { id: args.connectorId, status };
}

export async function authenticateDefenseIngest(env: SecurityDefenseEnv, request: Request, rawBody: string) {
  const connectorId = request.headers.get("x-cbshub-connector-id")?.trim() ?? "";
  const timestampText = request.headers.get("x-cbshub-timestamp")?.trim() ?? "";
  const supplied = request.headers.get("x-cbshub-signature")?.trim().toLowerCase() ?? "";
  if (!/^sdc_[0-9a-f-]{36}$/i.test(connectorId) || !/^\d{10}$/.test(timestampText) || !/^sha256=[0-9a-f]{64}$/.test(supplied)) throw new Error("DEFENSE_INGEST_UNAUTHORIZED");
  const timestamp = Number(timestampText);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) throw new Error("DEFENSE_INGEST_EXPIRED");
  const connector = await env.DB.prepare(`SELECT c.* FROM security_defense_connectors c
    JOIN security_agent_scopes s ON s.id = c.scope_id
    WHERE c.id = ? AND c.status = 'active' AND s.status = 'verified' AND s.authorization_expires_at > datetime('now')`)
    .bind(connectorId).first<SecurityDefenseConnectorRow>();
  if (!connector) throw new Error("DEFENSE_INGEST_UNAUTHORIZED");
  const secret = await connectorSecret(env, connector.id, connector.key_salt);
  const expected = `sha256=${bytesToHex(await hmac(secret, `${timestampText}.${rawBody}`))}`;
  if (!constantTimeEqual(expected, supplied)) throw new Error("DEFENSE_INGEST_UNAUTHORIZED");
  return connector;
}

async function createOrUpdateIncident(env: SecurityDefenseEnv, connector: SecurityDefenseConnectorRow, signal: DefenseSignal, hash: string | null) {
  const decision = evaluateDefenseSignal(signal);
  if (!decision.createIncident) return { decision, incident: null };
  const correlationKey = defenseCorrelationBucket(signal, hash);
  const incidentId = uuid("sdi");
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO security_defense_incidents
    (id, workspace_id, scope_id, correlation_key, category, severity, status, title, summary, occurrence_count, first_observed_at, last_observed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(scope_id, correlation_key) DO UPDATE SET occurrence_count = occurrence_count + excluded.occurrence_count, last_observed_at = excluded.last_observed_at, summary = excluded.summary, updated_at = excluded.updated_at`)
    .bind(incidentId, connector.workspace_id, connector.scope_id, correlationKey, decision.category, decision.severity, decision.title, signal.summary, signal.count, signal.occurredAt, signal.occurredAt, now, now).run();
  const incident = await env.DB.prepare("SELECT id, status, occurrence_count, auto_contained FROM security_defense_incidents WHERE scope_id = ? AND correlation_key = ?")
    .bind(connector.scope_id, correlationKey).first<{ id: string; status: string; occurrence_count: number; auto_contained: number }>();
  if (!incident) throw new Error("DEFENSE_INCIDENT_WRITE_FAILED");
  return { decision, incident };
}

async function createResponseAction(env: SecurityDefenseEnv, connector: SecurityDefenseConnectorRow, incidentId: string, signal: DefenseSignal, hash: string | null) {
  const decision = evaluateDefenseSignal(signal);
  const response = decision.response;
  const now = new Date();
  const enforceable = response.action === "temporary_source_block" && connector.enforcement === "cbshub_edge" && Boolean(hash);
  const status = enforceable ? "active" : "pending";
  const expiresAt = enforceable && response.ttlSeconds ? new Date(now.getTime() + response.ttlSeconds * 1000).toISOString() : null;
  const duplicate = await env.DB.prepare("SELECT id, status, expires_at FROM security_response_actions WHERE incident_id = ? AND action_type = ? AND status IN ('active','pending') AND COALESCE(target_hash, '') = COALESCE(?, '') ORDER BY created_at DESC LIMIT 1")
    .bind(incidentId, response.action, hash).first<{ id: string; status: "active" | "pending"; expires_at: string | null }>();
  if (duplicate) {
    if (duplicate.status === "active" && expiresAt && (!duplicate.expires_at || Date.parse(expiresAt) > Date.parse(duplicate.expires_at))) await env.DB.prepare("UPDATE security_response_actions SET expires_at = ?, updated_at = datetime('now') WHERE id = ?").bind(expiresAt, duplicate.id).run();
    return { id: duplicate.id, status: duplicate.status, action: response.action, expiresAt: expiresAt ?? duplicate.expires_at, deduplicated: true };
  }
  if (enforceable) {
    const existing = await env.DB.prepare("SELECT id, expires_at FROM security_response_actions WHERE scope_id = ? AND action_type = 'temporary_source_block' AND target_hash = ? AND status = 'active' AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1")
      .bind(connector.scope_id, hash).first<{ id: string; expires_at: string }>();
    if (existing) {
      if (expiresAt && Date.parse(expiresAt) > Date.parse(existing.expires_at)) await env.DB.prepare("UPDATE security_response_actions SET expires_at = ?, updated_at = datetime('now') WHERE id = ?").bind(expiresAt, existing.id).run();
      return { id: existing.id, status: "active" as const, action: response.action, expiresAt: expiresAt ?? existing.expires_at, deduplicated: true };
    }
  }
  const actionId = uuid("sra");
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO security_response_actions
      (id, workspace_id, scope_id, incident_id, action_type, autonomy, status, target_hash, reason, enforcement, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(actionId, connector.workspace_id, connector.scope_id, incidentId, response.action, response.autonomy, status, hash, response.reason, connector.enforcement, expiresAt, now.toISOString(), now.toISOString()),
    env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, incident_id, action_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(uuid("sde"), connector.workspace_id, connector.scope_id, incidentId, actionId, status === "active" ? "response.auto_applied" : "response.queued_for_review", JSON.stringify({ action: response.action, autonomy: response.autonomy, enforcement: connector.enforcement, expiresAt }), now.toISOString()),
  ]);
  if (status === "active") await env.DB.prepare("UPDATE security_defense_incidents SET status = 'contained', auto_contained = 1, updated_at = datetime('now') WHERE id = ? AND status IN ('open','investigating')").bind(incidentId).run();
  return { id: actionId, status, action: response.action, expiresAt, deduplicated: false };
}

export async function ingestDefenseSignal(env: SecurityDefenseEnv, connector: SecurityDefenseConnectorRow, raw: unknown) {
  const signal = parseDefenseSignal(raw);
  const hash = await sourceHash(env, signal.sourceIp);
  const decision = evaluateDefenseSignal(signal);
  const signalId = uuid("sds");
  const receivedAt = new Date().toISOString();
  const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO security_defense_signals
    (id, workspace_id, scope_id, connector_id, external_event_id, signal_type, confidence, severity, occurrence_count, window_seconds, source_hash, resource, summary, attributes_json, decision_json, policy_version, occurred_at, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(signalId, connector.workspace_id, connector.scope_id, connector.id, signal.eventId, signal.type, signal.confidence, decision.severity, signal.count, signal.windowSeconds, hash, signal.resource, signal.summary, JSON.stringify(signal.attributes), JSON.stringify(decision), decision.policyVersion, signal.occurredAt, receivedAt).run();
  if (Number(inserted.meta.changes ?? 0) !== 1) return { accepted: true, duplicate: true, eventId: signal.eventId };
  const { incident } = await createOrUpdateIncident(env, connector, signal, hash);
  const action = incident ? await createResponseAction(env, connector, incident.id, signal, hash) : null;
  await env.DB.prepare("UPDATE security_defense_connectors SET last_signal_at = ?, updated_at = ? WHERE id = ?").bind(receivedAt, receivedAt, connector.id).run();
  return { accepted: true, duplicate: false, eventId: signal.eventId, incidentId: incident?.id ?? null, action, decision };
}

export async function updateDefenseIncident(env: SecurityDefenseEnv, args: { workspaceId: number; scopeId: string; incidentId: unknown; actorUserId: number; status: unknown }) {
  if (typeof args.incidentId !== "string" || !/^sdi_[0-9a-f-]{36}$/i.test(args.incidentId) || !["open", "investigating", "contained", "resolved"].includes(String(args.status))) throw new Error("DEFENSE_INCIDENT_INVALID");
  const result = await env.DB.prepare("UPDATE security_defense_incidents SET status = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ? AND scope_id = ?")
    .bind(args.status, args.incidentId, args.workspaceId, args.scopeId).run();
  if (Number(result.meta.changes ?? 0) !== 1) throw new Error("DEFENSE_INCIDENT_NOT_FOUND");
  await env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, incident_id, actor_user_id, event_type, details_json) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(uuid("sde"), args.workspaceId, args.scopeId, args.incidentId, args.actorUserId, `incident.${args.status}`, JSON.stringify({ status: args.status })).run();
  return { id: args.incidentId, status: args.status };
}

export async function revokeDefenseAction(env: SecurityDefenseEnv, args: { workspaceId: number; scopeId: string; actionId: unknown; actorUserId: number }) {
  if (typeof args.actionId !== "string" || !/^sra_[0-9a-f-]{36}$/i.test(args.actionId)) throw new Error("DEFENSE_ACTION_INVALID");
  const result = await env.DB.prepare("UPDATE security_response_actions SET status = 'revoked', decided_by_user_id = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ? AND scope_id = ? AND status = 'active'")
    .bind(args.actorUserId, args.actionId, args.workspaceId, args.scopeId).run();
  if (Number(result.meta.changes ?? 0) !== 1) throw new Error("DEFENSE_ACTION_NOT_ACTIVE");
  await env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, action_id, actor_user_id, event_type, details_json) VALUES (?, ?, ?, ?, ?, 'response.revoked', '{}')")
    .bind(uuid("sde"), args.workspaceId, args.scopeId, args.actionId, args.actorUserId).run();
  return { id: args.actionId, status: "revoked" as const };
}

export async function expireDefenseActions(env: SecurityDefenseEnv) {
  const expired = await env.DB.prepare("SELECT id, workspace_id, scope_id, incident_id FROM security_response_actions WHERE status = 'active' AND expires_at <= datetime('now') LIMIT 100").all<{ id: string; workspace_id: number; scope_id: string; incident_id: string }>();
  for (const action of expired.results) {
    await env.DB.batch([
      env.DB.prepare("UPDATE security_response_actions SET status = 'expired', updated_at = datetime('now') WHERE id = ? AND status = 'active'").bind(action.id),
      env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, incident_id, action_id, event_type, details_json) VALUES (?, ?, ?, ?, ?, 'response.expired', '{}')")
        .bind(uuid("sde"), action.workspace_id, action.scope_id, action.incident_id, action.id),
    ]);
  }
  return { expired: expired.results.length };
}

export async function activeEdgeBlock(env: SecurityDefenseEnv, request: Request) {
  if (!new URL(request.url).pathname.startsWith("/api/")) return null;
  const ip = request.headers.get("cf-connecting-ip")?.trim();
  if (!ip) return null;
  try {
    const hash = await sourceHash(env, ip);
    const host = new URL(request.url).hostname.toLowerCase();
    return env.DB.prepare(`SELECT a.id, a.expires_at FROM security_response_actions a
      JOIN security_agent_scopes s ON s.id = a.scope_id
      JOIN security_defense_connectors c ON c.scope_id = a.scope_id
      WHERE a.action_type = 'temporary_source_block' AND a.status = 'active' AND a.target_hash = ? AND a.expires_at > datetime('now')
        AND s.domain = ? AND s.status = 'verified' AND s.authorization_expires_at > datetime('now') AND c.status = 'active' AND c.enforcement = 'cbshub_edge'
      ORDER BY a.expires_at DESC LIMIT 1`).bind(hash, host).first<{ id: string; expires_at: string }>();
  } catch (error) {
    console.error(JSON.stringify({ event: "security_defense.edge_check_failed", error: error instanceof Error ? error.name : "UnknownError" }));
    return null;
  }
}

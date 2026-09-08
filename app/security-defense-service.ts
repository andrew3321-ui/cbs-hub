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
  SECURITY_CONNECTOR_ENCRYPTION_KEY?: string;
  SECURITY_HASH_KEY?: string;
  PUBLIC_APP_URL?: string;
};

export type SecurityDefenseConnectorRow = {
  id: string;
  workspace_id: number;
  scope_id: string;
  provider: "signed_webhook" | "cloudflare";
  mode: "observe" | "protect";
  enforcement: "observe_only" | "cbshub_edge";
  status: "active" | "paused" | "revoked" | "error";
  key_salt: string;
  credential_ciphertext: string | null;
  credential_iv: string | null;
  write_credential_ciphertext: string | null;
  write_credential_iv: string | null;
  write_capabilities_json: string;
  write_last_health_at: string | null;
  write_last_error_code: string | null;
  external_account_id: string | null;
  external_zone_id: string | null;
  capabilities_json: string;
  last_health_at: string | null;
  last_error_code: string | null;
  last_signal_at: string | null;
  sync_cursor_at: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  sync_lease_until: string | null;
  events_ingested_total: number;
  created_by_user_id: number;
};

type CloudflareZone = { id: string; name: string; status?: string; account?: { id?: string } };
type CloudflareEnvelope<T> = { success?: boolean; result?: T; errors?: Array<{ code?: number; message?: string }> };
type CloudflareCapabilities = { zoneRead: boolean; rulesetsRead: boolean; analyticsRead: boolean; rulesetsEdit: boolean; automaticChanges: boolean };
type CloudflareFirewallEvent = {
  action?: string | null;
  clientCountryName?: string | null;
  clientIP?: string | null;
  clientRequestPath?: string | null;
  datetime?: string | null;
  source?: string | null;
};
type CloudflareGraphqlEnvelope<T> = { data?: T; errors?: Array<{ message?: string }> };
type CloudflareRule = { id?: string; action?: string; enabled?: boolean; description?: string; expression?: string; ratelimit?: Record<string, unknown> };
type CloudflareRuleset = { id?: string; name?: string; kind?: string; phase?: string; rules?: CloudflareRule[] };
type SecurityDefenseProposalRow = {
  id: string; workspace_id: number; scope_id: string; connector_id: string; category: string; status: string; risk: string;
  title: string; rationale: string; preview_json: string; rollback_json: string; idempotency_key: string;
  approved_by_user_id: number | null; approved_at: string | null; applied_at: string | null; base_fingerprint: string | null;
  approval_expires_at: string | null; external_ruleset_id: string | null; external_rule_id: string | null; apply_error_code: string | null;
};
type CloudflarePostureCheck = {
  code: string;
  title: string;
  status: "pass" | "warning" | "fail";
  severity: "low" | "medium" | "high";
  weight: number;
  earned: number;
  evidence: string;
  recommendation: string;
};

const CLOUDFLARE_EVENT_LIMIT = 200;
const CLOUDFLARE_INITIAL_WINDOW_MS = 15 * 60_000;
const CLOUDFLARE_OVERLAP_MS = 2 * 60_000;
const CLOUDFLARE_SYNC_INTERVAL_MS = 5 * 60_000;
const CLOUDFLARE_RETRY_INTERVAL_MS = 15 * 60_000;
const CLOUDFLARE_LEASE_MS = 2 * 60_000;
const CLOUDFLARE_APPROVAL_WINDOW_MS = 30 * 60_000;
const cloudflareMitigationActions = new Set(["block", "drop", "challenge", "js_challenge", "managed_challenge", "connection_close"]);

const uuid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const encoder = new TextEncoder();

function bytesToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(value: ArrayBuffer) {
  const binary = Array.from(new Uint8Array(value), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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

function requiredConnectorEncryptionKey(env: SecurityDefenseEnv) {
  const key = env.SECURITY_CONNECTOR_ENCRYPTION_KEY?.trim();
  if (!key || key.length < 32) throw new Error("DEFENSE_CONNECTOR_ENCRYPTION_KEY_NOT_CONFIGURED");
  return key;
}

async function connectorAesKey(env: SecurityDefenseEnv) {
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(requiredConnectorEncryptionKey(env)));
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptConnectorCredential(env: SecurityDefenseEnv, value: string, additionalData: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(additionalData) }, await connectorAesKey(env), encoder.encode(value));
  return { ciphertext: bytesToBase64Url(ciphertext), iv: bytesToBase64Url(iv.buffer) };
}

async function decryptConnectorCredential(env: SecurityDefenseEnv, row: SecurityDefenseConnectorRow) {
  if (!row.credential_ciphertext || !row.credential_iv || !row.external_zone_id) throw new Error("DEFENSE_CONNECTOR_CREDENTIAL_MISSING");
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(row.credential_iv), additionalData: encoder.encode(`cloudflare:${row.id}:${row.scope_id}:${row.external_zone_id}`) },
      await connectorAesKey(env),
      base64UrlToBytes(row.credential_ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("DEFENSE_CONNECTOR_CREDENTIAL_INVALID");
  }
}

async function decryptCloudflareWriteCredential(env: SecurityDefenseEnv, row: SecurityDefenseConnectorRow) {
  if (!row.write_credential_ciphertext || !row.write_credential_iv || !row.external_zone_id) throw new Error("CLOUDFLARE_WRITE_CREDENTIAL_MISSING");
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(row.write_credential_iv), additionalData: encoder.encode(`cloudflare-write:${row.id}:${row.scope_id}:${row.external_zone_id}`) },
      await connectorAesKey(env),
      base64UrlToBytes(row.write_credential_ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("CLOUDFLARE_WRITE_CREDENTIAL_INVALID");
  }
}

function parseCloudflareToken(raw: unknown) {
  if (typeof raw !== "string") throw new Error("CLOUDFLARE_TOKEN_INVALID");
  const token = raw.trim();
  if (token.length < 20 || token.length > 512 || /\s/.test(token)) throw new Error("CLOUDFLARE_TOKEN_INVALID");
  return token;
}

async function cloudflareRequest<T>(fetcher: typeof fetch, token: string, path: string) {
  let response: Response;
  try {
    response = await fetcher(`https://api.cloudflare.com/client/v4${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new Error("CLOUDFLARE_UNAVAILABLE");
  }
  const payload = await response.json().catch(() => null) as CloudflareEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    if (response.status === 401 || response.status === 403) throw new Error("CLOUDFLARE_TOKEN_REJECTED");
    throw new Error("CLOUDFLARE_API_ERROR");
  }
  return payload.result as T;
}

async function cloudflareRulesetRequest<T>(fetcher: typeof fetch, token: string, path: string, optional = false) {
  let response: Response;
  try {
    response = await fetcher(`https://api.cloudflare.com/client/v4${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new Error("CLOUDFLARE_UNAVAILABLE");
  }
  if (optional && response.status === 404) return null;
  const payload = await response.json().catch(() => null) as CloudflareEnvelope<T> | null;
  if (response.status === 401) throw new Error("CLOUDFLARE_TOKEN_REJECTED");
  if (response.status === 403) throw new Error("CLOUDFLARE_RULESETS_PERMISSION_REQUIRED");
  if (!response.ok || !payload?.success) throw new Error("CLOUDFLARE_API_ERROR");
  return payload.result as T;
}

async function cloudflareMutationRequest<T>(fetcher: typeof fetch, token: string, path: string, method: "POST" | "DELETE", body?: Record<string, unknown>) {
  if (!/^\/zones\/[A-Za-z0-9_-]+\/rulesets(?:\/[A-Za-z0-9_-]+\/rules(?:\/[A-Za-z0-9_-]+)?)?$/.test(path)) throw new Error("CLOUDFLARE_MUTATION_PATH_REJECTED");
  let response: Response;
  try {
    response = await fetcher(`https://api.cloudflare.com/client/v4${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new Error("CLOUDFLARE_UNAVAILABLE");
  }
  if (method === "DELETE" && response.status === 404) return null;
  const payload = await response.json().catch(() => null) as CloudflareEnvelope<T> | null;
  if (response.status === 401) throw new Error("CLOUDFLARE_WRITE_TOKEN_REJECTED");
  if (response.status === 403) throw new Error("CLOUDFLARE_WRITE_PERMISSION_REQUIRED");
  if (response.status === 429) throw new Error("CLOUDFLARE_WRITE_RATE_LIMITED");
  if (!response.ok || !payload?.success) throw new Error("CLOUDFLARE_MUTATION_FAILED");
  return payload.result as T;
}

async function cloudflareGraphql<T>(fetcher: typeof fetch, token: string, query: string, variables: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetcher("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new Error("CLOUDFLARE_UNAVAILABLE");
  }
  const payload = await response.json().catch(() => null) as CloudflareGraphqlEnvelope<T> | null;
  if (response.status === 401) throw new Error("CLOUDFLARE_TOKEN_REJECTED");
  if (response.status === 403 || payload?.errors?.length) throw new Error("CLOUDFLARE_ANALYTICS_PERMISSION_REQUIRED");
  if (!response.ok || !payload?.data) throw new Error("CLOUDFLARE_API_ERROR");
  return payload.data;
}

const cloudflareFirewallEventsQuery = `query FirewallEvents($zoneTag: string!, $start: Time!, $end: Time!, $limit: Int!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      firewallEventsAdaptive(filter: { datetime_geq: $start, datetime_leq: $end }, limit: $limit, orderBy: [datetime_ASC]) {
        action
        clientCountryName
        clientIP
        clientRequestPath
        datetime
        source
      }
    }
  }
}`;

async function fetchCloudflareFirewallEvents(fetcher: typeof fetch, token: string, zoneId: string, start: string, end: string, limit = CLOUDFLARE_EVENT_LIMIT) {
  const data = await cloudflareGraphql<{ viewer?: { zones?: Array<{ firewallEventsAdaptive?: CloudflareFirewallEvent[] }> } }>(
    fetcher,
    token,
    cloudflareFirewallEventsQuery,
    { zoneTag: zoneId, start, end, limit },
  );
  const zones = data.viewer?.zones;
  if (!Array.isArray(zones) || zones.length !== 1) throw new Error("CLOUDFLARE_ZONE_MISMATCH");
  return Array.isArray(zones[0]?.firewallEventsAdaptive) ? zones[0].firewallEventsAdaptive : [];
}

async function inspectCloudflareCapabilities(fetcher: typeof fetch, token: string, zoneId: string): Promise<CloudflareCapabilities> {
  let rulesetsRead = false;
  try {
    await cloudflareRequest<unknown[]>(fetcher, token, `/zones/${encodeURIComponent(zoneId)}/rulesets`);
    rulesetsRead = true;
  } catch (error) {
    const code = error instanceof Error ? error.message : "CLOUDFLARE_API_ERROR";
    if (code !== "CLOUDFLARE_TOKEN_REJECTED") throw error;
  }
  let analyticsRead = false;
  try {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 60_000).toISOString();
    await fetchCloudflareFirewallEvents(fetcher, token, zoneId, start, end, 1);
    analyticsRead = true;
  } catch (error) {
    const code = error instanceof Error ? error.message : "CLOUDFLARE_API_ERROR";
    if (code !== "CLOUDFLARE_ANALYTICS_PERMISSION_REQUIRED") throw error;
  }
  return { zoneRead: true, rulesetsRead, analyticsRead, rulesetsEdit: false, automaticChanges: false };
}

export async function connectCloudflareDefenseConnector(
  env: SecurityDefenseEnv,
  args: { scope: SecurityScopeRow; actorUserId: number; apiToken: unknown },
  fetcher: typeof fetch = fetch,
) {
  if (args.scope.status !== "verified") throw new Error("DEFENSE_SCOPE_NOT_VERIFIED");
  if (!args.scope.authorization_expires_at || Date.parse(args.scope.authorization_expires_at) <= Date.now()) throw new Error("DEFENSE_SCOPE_AUTHORIZATION_EXPIRED");
  requiredConnectorEncryptionKey(env);
  const token = parseCloudflareToken(args.apiToken);
  const verification = await cloudflareRequest<{ id?: string; status?: string }>(fetcher, token, "/user/tokens/verify");
  if (verification?.status !== "active") throw new Error("CLOUDFLARE_TOKEN_REJECTED");
  const zones = await cloudflareRequest<CloudflareZone[]>(fetcher, token, `/zones?name=${encodeURIComponent(args.scope.domain)}&status=active&per_page=5`);
  const zone = zones.find((candidate) => candidate.name.toLowerCase() === args.scope.domain && candidate.status !== "deleted");
  if (!zone) throw new Error("CLOUDFLARE_ZONE_NOT_FOUND");
  const capabilities = await inspectCloudflareCapabilities(fetcher, token, zone.id);
  const existing = await env.DB.prepare("SELECT * FROM security_defense_connectors WHERE scope_id = ? AND provider = 'cloudflare'")
    .bind(args.scope.id).first<SecurityDefenseConnectorRow>();
  const id = existing?.id ?? uuid("sdc");
  const additionalData = `cloudflare:${id}:${args.scope.id}:${zone.id}`;
  const encrypted = await encryptConnectorCredential(env, token, additionalData);
  const now = new Date().toISOString();
  const salt = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO security_defense_connectors
      (id, workspace_id, scope_id, provider, mode, enforcement, status, key_salt, credential_ciphertext, credential_iv, external_account_id, external_zone_id, capabilities_json, last_health_at, last_error_code, next_sync_at, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, 'cloudflare', 'observe', 'observe_only', 'active', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
      ON CONFLICT(scope_id, provider) DO UPDATE SET status = 'active', key_salt = excluded.key_salt,
        credential_ciphertext = excluded.credential_ciphertext, credential_iv = excluded.credential_iv,
        external_account_id = excluded.external_account_id, external_zone_id = excluded.external_zone_id,
        capabilities_json = excluded.capabilities_json, last_health_at = excluded.last_health_at,
        last_error_code = NULL, next_sync_at = excluded.next_sync_at, sync_lease_until = NULL, updated_at = excluded.updated_at`)
      .bind(id, args.scope.workspace_id, args.scope.id, salt, encrypted.ciphertext, encrypted.iv, zone.account?.id ?? null, zone.id, JSON.stringify(capabilities), now, now, args.actorUserId, now, now),
    env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uuid("sde"), args.scope.workspace_id, args.scope.id, args.actorUserId, existing ? "cloudflare.credential_rotated" : "cloudflare.connected", JSON.stringify({ zoneId: zone.id, zoneName: zone.name, capabilities }), now),
  ]);
  return { id, scopeId: args.scope.id, provider: "cloudflare" as const, status: "active" as const, zoneName: zone.name, zoneId: zone.id, mode: "observe" as const, enforcement: "observe_only" as const, capabilities, lastHealthAt: now };
}

export async function checkCloudflareDefenseConnector(
  env: SecurityDefenseEnv,
  args: { workspaceId: number; scope: SecurityScopeRow; connectorId: unknown; actorUserId: number },
  fetcher: typeof fetch = fetch,
) {
  if (typeof args.connectorId !== "string" || !/^sdc_[0-9a-f-]{36}$/i.test(args.connectorId)) throw new Error("DEFENSE_CONNECTOR_INVALID");
  const connector = await env.DB.prepare("SELECT * FROM security_defense_connectors WHERE id = ? AND workspace_id = ? AND scope_id = ? AND provider = 'cloudflare' AND status <> 'revoked'")
    .bind(args.connectorId, args.workspaceId, args.scope.id).first<SecurityDefenseConnectorRow>();
  if (!connector?.external_zone_id) throw new Error("DEFENSE_CONNECTOR_NOT_FOUND");
  try {
    const token = await decryptConnectorCredential(env, connector);
    const zone = await cloudflareRequest<CloudflareZone>(fetcher, token, `/zones/${encodeURIComponent(connector.external_zone_id)}`);
    if (zone.name.toLowerCase() !== args.scope.domain || zone.status === "deleted") throw new Error("CLOUDFLARE_ZONE_MISMATCH");
    const capabilities = await inspectCloudflareCapabilities(fetcher, token, connector.external_zone_id);
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE security_defense_connectors SET status = 'active', capabilities_json = ?, last_health_at = ?, last_error_code = NULL, next_sync_at = ?, updated_at = ? WHERE id = ?")
        .bind(JSON.stringify(capabilities), now, now, now, connector.id),
      env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'cloudflare.health_checked', ?, ?)")
        .bind(uuid("sde"), args.workspaceId, args.scope.id, args.actorUserId, JSON.stringify({ zoneId: connector.external_zone_id, capabilities }), now),
    ]);
    return { id: connector.id, status: "active" as const, zoneName: zone.name, capabilities, lastHealthAt: now };
  } catch (error) {
    const code = error instanceof Error ? error.message : "CLOUDFLARE_API_ERROR";
    await env.DB.prepare("UPDATE security_defense_connectors SET status = 'error', last_error_code = ?, updated_at = datetime('now') WHERE id = ?").bind(code, connector.id).run();
    throw error;
  }
}

export async function disconnectCloudflareDefenseConnector(env: SecurityDefenseEnv, args: { workspaceId: number; scopeId: string; connectorId: unknown; actorUserId: number }) {
  if (typeof args.connectorId !== "string" || !/^sdc_[0-9a-f-]{36}$/i.test(args.connectorId)) throw new Error("DEFENSE_CONNECTOR_INVALID");
  const result = await env.DB.prepare(`UPDATE security_defense_connectors SET status = 'revoked', credential_ciphertext = NULL, credential_iv = NULL,
    write_credential_ciphertext = NULL, write_credential_iv = NULL, write_capabilities_json = '{}', write_last_health_at = NULL, write_last_error_code = NULL,
    external_account_id = NULL, external_zone_id = NULL, capabilities_json = '{}', last_error_code = NULL, updated_at = datetime('now')
    WHERE id = ? AND workspace_id = ? AND scope_id = ? AND provider = 'cloudflare' AND status <> 'revoked'`)
    .bind(args.connectorId, args.workspaceId, args.scopeId).run();
  if (Number(result.meta.changes ?? 0) !== 1) throw new Error("DEFENSE_CONNECTOR_NOT_FOUND");
  await env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json) VALUES (?, ?, ?, ?, 'cloudflare.disconnected', ?)")
    .bind(uuid("sde"), args.workspaceId, args.scopeId, args.actorUserId, JSON.stringify({ connectorId: args.connectorId })).run();
  return { id: args.connectorId, status: "revoked" as const };
}

export async function connectCloudflareWriteCredential(
  env: SecurityDefenseEnv,
  args: { workspaceId: number; scope: SecurityScopeRow; connectorId: unknown; actorUserId: number; apiToken: unknown },
  fetcher: typeof fetch = fetch,
) {
  if (args.scope.status !== "verified") throw new Error("DEFENSE_SCOPE_NOT_VERIFIED");
  if (!args.scope.authorization_expires_at || Date.parse(args.scope.authorization_expires_at) <= Date.now()) throw new Error("DEFENSE_SCOPE_AUTHORIZATION_EXPIRED");
  if (typeof args.connectorId !== "string" || !/^sdc_[0-9a-f-]{36}$/i.test(args.connectorId)) throw new Error("DEFENSE_CONNECTOR_INVALID");
  const connector = await env.DB.prepare("SELECT * FROM security_defense_connectors WHERE id = ? AND workspace_id = ? AND scope_id = ? AND provider = 'cloudflare' AND status = 'active'")
    .bind(args.connectorId, args.workspaceId, args.scope.id).first<SecurityDefenseConnectorRow>();
  if (!connector?.external_zone_id) throw new Error("DEFENSE_CONNECTOR_NOT_FOUND");
  const token = parseCloudflareToken(args.apiToken);
  const verification = await cloudflareRequest<{ status?: string }>(fetcher, token, "/user/tokens/verify");
  if (verification?.status !== "active") throw new Error("CLOUDFLARE_WRITE_TOKEN_REJECTED");
  const zones = await cloudflareRequest<CloudflareZone[]>(fetcher, token, `/zones?name=${encodeURIComponent(args.scope.domain)}&status=active&per_page=5`);
  const zone = zones.find((candidate) => candidate.id === connector.external_zone_id && candidate.name.toLowerCase() === args.scope.domain && candidate.status !== "deleted");
  if (!zone) throw new Error("CLOUDFLARE_ZONE_MISMATCH");
  await cloudflareRulesetRequest<CloudflareRuleset[]>(fetcher, token, `/zones/${encodeURIComponent(zone.id)}/rulesets`);
  const encrypted = await encryptConnectorCredential(env, token, `cloudflare-write:${connector.id}:${connector.scope_id}:${zone.id}`);
  const now = new Date().toISOString();
  const capabilities = { zoneWafWrite: "unverified_until_first_apply", allowedOperations: ["create_rate_limit_managed_challenge", "delete_owned_rule"], automaticChanges: false };
  await env.DB.batch([
    env.DB.prepare("UPDATE security_defense_connectors SET write_credential_ciphertext = ?, write_credential_iv = ?, write_capabilities_json = ?, write_last_health_at = ?, write_last_error_code = NULL, updated_at = ? WHERE id = ?")
      .bind(encrypted.ciphertext, encrypted.iv, JSON.stringify(capabilities), now, now, connector.id),
    env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'cloudflare.write_credential_connected', ?, ?)")
      .bind(uuid("sde"), connector.workspace_id, connector.scope_id, args.actorUserId, JSON.stringify({ connectorId: connector.id, zoneId: zone.id, capabilities }), now),
  ]);
  return { id: connector.id, writeCredentialConfigured: true, writeCapabilities: capabilities, writeLastHealthAt: now };
}

export async function disconnectCloudflareWriteCredential(env: SecurityDefenseEnv, args: { workspaceId: number; scopeId: string; connectorId: unknown; actorUserId: number }) {
  if (typeof args.connectorId !== "string" || !/^sdc_[0-9a-f-]{36}$/i.test(args.connectorId)) throw new Error("DEFENSE_CONNECTOR_INVALID");
  const result = await env.DB.prepare("UPDATE security_defense_connectors SET write_credential_ciphertext = NULL, write_credential_iv = NULL, write_capabilities_json = '{}', write_last_health_at = NULL, write_last_error_code = NULL, updated_at = datetime('now') WHERE id = ? AND workspace_id = ? AND scope_id = ? AND provider = 'cloudflare' AND status = 'active'")
    .bind(args.connectorId, args.workspaceId, args.scopeId).run();
  if (Number(result.meta.changes ?? 0) !== 1) throw new Error("DEFENSE_CONNECTOR_NOT_FOUND");
  await env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json) VALUES (?, ?, ?, ?, 'cloudflare.write_credential_disconnected', ?)")
    .bind(uuid("sde"), args.workspaceId, args.scopeId, args.actorUserId, JSON.stringify({ connectorId: args.connectorId })).run();
  return { id: args.connectorId, writeCredentialConfigured: false };
}

function parsedCapabilities(value: string): Partial<CloudflareCapabilities> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Partial<CloudflareCapabilities> : {};
  } catch { return {}; }
}

function cloudflareResource(value: string | null | undefined) {
  if (!value) return "/";
  const path = value.split(/[?#]/, 1)[0]?.replace(/[\u0000-\u001f\u007f]/g, "").trim() || "/";
  return (path.startsWith("/") ? path : `/${path}`).slice(0, 200);
}

async function cloudflareEventId(connectorId: string, event: CloudflareFirewallEvent) {
  const material = [connectorId, event.action ?? "", event.clientCountryName ?? "", event.clientIP ?? "", cloudflareResource(event.clientRequestPath), event.datetime ?? "", event.source ?? ""].join("\u0000");
  return `cf:${bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(material)))}`;
}

function cloudflareSignalType(source: string) {
  const normalized = source.toLowerCase();
  return normalized.includes("ratelimit") || normalized.includes("ddos") ? "request_flood" as const : "exploit_attempt" as const;
}

function controlledCloudflareCode(error: unknown) {
  const code = error instanceof Error ? error.message : "CLOUDFLARE_SYNC_FAILED";
  return [
    "CLOUDFLARE_TOKEN_REJECTED",
    "CLOUDFLARE_ANALYTICS_PERMISSION_REQUIRED",
    "CLOUDFLARE_UNAVAILABLE",
    "CLOUDFLARE_API_ERROR",
    "CLOUDFLARE_ZONE_MISMATCH",
    "DEFENSE_CONNECTOR_CREDENTIAL_MISSING",
    "DEFENSE_CONNECTOR_CREDENTIAL_INVALID",
    "DEFENSE_CONNECTOR_ENCRYPTION_KEY_NOT_CONFIGURED",
  ].includes(code) ? code : "CLOUDFLARE_SYNC_FAILED";
}

export async function syncCloudflareDefenseConnector(
  env: SecurityDefenseEnv,
  args: { connectorId: string; workspaceId?: number; scopeId?: string; actorUserId?: number | null; now?: number },
  fetcher: typeof fetch = fetch,
) {
  if (!/^sdc_[0-9a-f-]{36}$/i.test(args.connectorId)) throw new Error("DEFENSE_CONNECTOR_INVALID");
  const connector = await env.DB.prepare(`SELECT c.* FROM security_defense_connectors c
    JOIN security_agent_scopes s ON s.id = c.scope_id
    WHERE c.id = ? AND c.provider = 'cloudflare' AND c.status = 'active'
      AND (? IS NULL OR c.workspace_id = ?) AND (? IS NULL OR c.scope_id = ?)
      AND s.status = 'verified' AND s.authorization_expires_at > datetime('now')`)
    .bind(args.connectorId, args.workspaceId ?? null, args.workspaceId ?? null, args.scopeId ?? null, args.scopeId ?? null).first<SecurityDefenseConnectorRow>();
  if (!connector?.external_zone_id) throw new Error("DEFENSE_CONNECTOR_NOT_FOUND");
  const nowMs = args.now ?? Date.now();
  const now = new Date(nowMs).toISOString();
  const leaseUntil = new Date(nowMs + CLOUDFLARE_LEASE_MS).toISOString();
  const claimed = await env.DB.prepare(`UPDATE security_defense_connectors SET sync_lease_until = ?, updated_at = ?
    WHERE id = ? AND status = 'active' AND (sync_lease_until IS NULL OR sync_lease_until <= ?)`)
    .bind(leaseUntil, now, connector.id, now).run();
  if (Number(claimed.meta.changes ?? 0) !== 1) throw new Error("CLOUDFLARE_SYNC_RUNNING");

  const cursorMs = connector.sync_cursor_at ? Date.parse(connector.sync_cursor_at) : Number.NaN;
  const earliest = nowMs - 23 * 60 * 60_000;
  const startMs = Math.max(earliest, Number.isFinite(cursorMs) ? cursorMs - CLOUDFLARE_OVERLAP_MS : nowMs - CLOUDFLARE_INITIAL_WINDOW_MS);
  const start = new Date(startMs).toISOString();
  let fetched = 0;
  let mitigated = 0;
  let inserted = 0;
  let duplicates = 0;
  let rejected = 0;
  try {
    const token = await decryptConnectorCredential(env, connector);
    const events = await fetchCloudflareFirewallEvents(fetcher, token, connector.external_zone_id, start, now);
    fetched = events.length;
    for (const event of events) {
      const action = typeof event.action === "string" ? event.action.toLowerCase() : "";
      if (!cloudflareMitigationActions.has(action)) continue;
      mitigated += 1;
      const source = typeof event.source === "string" ? event.source.slice(0, 80) : "waf";
      const normalizedSignal = {
        eventId: await cloudflareEventId(connector.id, event),
        occurredAt: event.datetime,
        type: cloudflareSignalType(source),
        confidence: "medium",
        count: 1,
        windowSeconds: 1,
        sourceIp: typeof event.clientIP === "string" ? event.clientIP : null,
        resource: cloudflareResource(event.clientRequestPath),
        summary: `A Cloudflare mitigou uma solicitação suspeita (${action || "ação de segurança"}).`,
        attributes: {
          provider: "cloudflare",
          action,
          source: source || "waf",
          country: typeof event.clientCountryName === "string" ? event.clientCountryName.slice(0, 80) : "unknown",
          sampled: true,
        },
      };
      try {
        parseDefenseSignal(normalizedSignal);
      } catch {
        rejected += 1;
        continue;
      }
      const result = await ingestDefenseSignal(env, connector, normalizedSignal);
      if (result.duplicate) duplicates += 1;
      else inserted += 1;
    }
    const saturated = fetched >= CLOUDFLARE_EVENT_LIMIT;
    const capabilities = { ...parsedCapabilities(connector.capabilities_json), analyticsRead: true, automaticChanges: false };
    const nextSync = new Date(nowMs + (saturated ? CLOUDFLARE_RETRY_INTERVAL_MS : CLOUDFLARE_SYNC_INTERVAL_MS)).toISOString();
    const lastErrorCode = saturated ? "CLOUDFLARE_EVENT_WINDOW_SATURATED" : null;
    await env.DB.batch([
      env.DB.prepare(`UPDATE security_defense_connectors SET sync_cursor_at = CASE WHEN ? = 1 THEN sync_cursor_at ELSE ? END,
        last_sync_at = ?, next_sync_at = ?, sync_lease_until = NULL, events_ingested_total = events_ingested_total + ?,
        capabilities_json = ?, last_health_at = ?, last_error_code = ?, updated_at = ? WHERE id = ?`)
        .bind(saturated ? 1 : 0, now, now, nextSync, inserted, JSON.stringify(capabilities), now, lastErrorCode, now, connector.id),
      env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'cloudflare.events_collected', ?, ?)")
        .bind(uuid("sde"), connector.workspace_id, connector.scope_id, args.actorUserId ?? null, JSON.stringify({ start, end: now, fetched, mitigated, inserted, duplicates, rejected, saturated }), now),
    ]);
    return { id: connector.id, start, end: now, fetched, mitigated, inserted, duplicates, rejected, saturated, nextSyncAt: nextSync };
  } catch (error) {
    const code = controlledCloudflareCode(error);
    const nextSync = new Date(nowMs + CLOUDFLARE_RETRY_INTERVAL_MS).toISOString();
    const terminalCredentialError = ["CLOUDFLARE_TOKEN_REJECTED", "DEFENSE_CONNECTOR_CREDENTIAL_MISSING", "DEFENSE_CONNECTOR_CREDENTIAL_INVALID"].includes(code);
    await env.DB.batch([
      env.DB.prepare("UPDATE security_defense_connectors SET status = CASE WHEN ? = 1 THEN 'error' ELSE status END, next_sync_at = ?, sync_lease_until = NULL, last_error_code = ?, updated_at = ? WHERE id = ?")
        .bind(terminalCredentialError ? 1 : 0, nextSync, code, now, connector.id),
      env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'cloudflare.collection_failed', ?, ?)")
        .bind(uuid("sde"), connector.workspace_id, connector.scope_id, args.actorUserId ?? null, JSON.stringify({ code, start, end: now }), now),
    ]);
    throw new Error(code);
  }
}

export async function runDueCloudflareDefenseSync(env: SecurityDefenseEnv, fetcher: typeof fetch = fetch, now = Date.now()) {
  const at = new Date(now).toISOString();
  const due = await env.DB.prepare(`SELECT c.id FROM security_defense_connectors c
    JOIN security_agent_scopes s ON s.id = c.scope_id
    WHERE c.provider = 'cloudflare' AND c.status = 'active' AND COALESCE(c.next_sync_at, ?) <= ?
      AND (c.sync_lease_until IS NULL OR c.sync_lease_until <= ?) AND s.status = 'verified' AND s.authorization_expires_at > ?
    ORDER BY COALESCE(c.next_sync_at, c.created_at), c.id LIMIT 3`)
    .bind(at, at, at, at).all<{ id: string }>();
  let completed = 0;
  let failed = 0;
  let inserted = 0;
  for (const item of due.results) {
    try {
      const result = await syncCloudflareDefenseConnector(env, { connectorId: item.id, now }, fetcher);
      completed += 1;
      inserted += result.inserted;
    } catch {
      failed += 1;
    }
  }
  return { attempted: due.results.length, completed, failed, inserted };
}

function rulesFrom(ruleset: CloudflareRuleset | null) {
  return Array.isArray(ruleset?.rules) ? ruleset.rules : [];
}

function enabledRules(ruleset: CloudflareRuleset | null) {
  return rulesFrom(ruleset).filter((rule) => rule.enabled !== false);
}

function postureGrade(score: number) {
  if (score >= 85) return "strong" as const;
  if (score >= 70) return "adequate" as const;
  if (score >= 45) return "attention" as const;
  return "critical" as const;
}

async function postureFingerprint(rulesets: CloudflareRuleset[], phaseRulesets: Array<CloudflareRuleset | null>) {
  const inventory = {
    rulesets: rulesets.map((item) => ({ id: item.id ?? "", kind: item.kind ?? "", phase: item.phase ?? "" }))
      .sort((left, right) => `${left.phase}:${left.kind}:${left.id}`.localeCompare(`${right.phase}:${right.kind}:${right.id}`)),
    phases: phaseRulesets.map((item) => ({
      id: item?.id ?? "",
      phase: item?.phase ?? "",
      rules: rulesFrom(item).map((rule) => ({ id: rule.id ?? "", action: rule.action ?? "", enabled: rule.enabled !== false, expression: rule.expression ?? "", ratelimit: rule.ratelimit ?? null }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    })),
  };
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify(inventory))));
}

async function createPostureProposal(env: SecurityDefenseEnv, connector: SecurityDefenseConnectorRow, proposal: {
  category: "managed_rules" | "rate_limit" | "exception_review";
  risk: "low" | "medium" | "high";
  title: string;
  rationale: string;
  preview: Record<string, unknown>;
  rollback: Record<string, unknown>;
  idempotencyKey: string;
}, now: string) {
  await env.DB.prepare(`INSERT INTO security_defense_change_proposals
    (id, workspace_id, scope_id, connector_id, category, status, risk, title, rationale, preview_json, rollback_json, idempotency_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(connector_id, idempotency_key) DO UPDATE SET risk = excluded.risk, title = excluded.title,
      rationale = excluded.rationale, preview_json = excluded.preview_json, rollback_json = excluded.rollback_json,
      updated_at = excluded.updated_at WHERE security_defense_change_proposals.status = 'draft'`)
    .bind(uuid("sdp"), connector.workspace_id, connector.scope_id, connector.id, proposal.category, proposal.risk, proposal.title, proposal.rationale, JSON.stringify(proposal.preview), JSON.stringify(proposal.rollback), proposal.idempotencyKey, now, now).run();
}

export async function auditCloudflareDefensePosture(
  env: SecurityDefenseEnv,
  args: { connectorId: string; workspaceId?: number; scopeId?: string; actorUserId?: number | null; now?: number },
  fetcher: typeof fetch = fetch,
) {
  if (!/^sdc_[0-9a-f-]{36}$/i.test(args.connectorId)) throw new Error("DEFENSE_CONNECTOR_INVALID");
  const connector = await env.DB.prepare(`SELECT c.* FROM security_defense_connectors c
    JOIN security_agent_scopes s ON s.id = c.scope_id
    WHERE c.id = ? AND c.provider = 'cloudflare' AND c.status = 'active'
      AND (? IS NULL OR c.workspace_id = ?) AND (? IS NULL OR c.scope_id = ?)
      AND s.status = 'verified' AND s.authorization_expires_at > datetime('now')`)
    .bind(args.connectorId, args.workspaceId ?? null, args.workspaceId ?? null, args.scopeId ?? null, args.scopeId ?? null).first<SecurityDefenseConnectorRow>();
  if (!connector?.external_zone_id) throw new Error("DEFENSE_CONNECTOR_NOT_FOUND");
  const token = await decryptConnectorCredential(env, connector);
  const zone = encodeURIComponent(connector.external_zone_id);
  const phase = (name: string) => `/zones/${zone}/rulesets/phases/${name}/entrypoint`;
  const [inventoryResult, customResult, rateResult, managedResult] = await Promise.all([
    cloudflareRulesetRequest<CloudflareRuleset[]>(fetcher, token, `/zones/${zone}/rulesets`),
    cloudflareRulesetRequest<CloudflareRuleset>(fetcher, token, phase("http_request_firewall_custom"), true),
    cloudflareRulesetRequest<CloudflareRuleset>(fetcher, token, phase("http_ratelimit"), true),
    cloudflareRulesetRequest<CloudflareRuleset>(fetcher, token, phase("http_request_firewall_managed"), true),
  ]);
  const inventory = Array.isArray(inventoryResult) ? inventoryResult : [];
  const custom = customResult ?? null;
  const rate = rateResult ?? null;
  const managed = managedResult ?? null;
  const customEnabled = enabledRules(custom);
  const rateEnabled = enabledRules(rate);
  const managedEnabled = enabledRules(managed).filter((rule) => rule.action === "execute");
  const skipEnabled = [...enabledRules(custom), ...enabledRules(managed)].filter((rule) => rule.action === "skip");
  const capabilities = parsedCapabilities(connector.capabilities_json);
  const checks: CloudflarePostureCheck[] = [
    capabilities.analyticsRead
      ? { code: "edge_visibility", title: "Visibilidade dos eventos", status: "pass", severity: "low", weight: 15, earned: 15, evidence: "A leitura de Security Events está disponível.", recommendation: "Manter a coleta ativa e revisar falhas de sincronização." }
      : { code: "edge_visibility", title: "Visibilidade dos eventos", status: "fail", severity: "high", weight: 15, earned: 0, evidence: "A permissão de Analytics não foi confirmada.", recommendation: "Adicionar Account Analytics: Read ao token restrito à zona." },
    managedEnabled.length
      ? { code: "managed_waf", title: "Managed Rules em execução", status: "pass", severity: "low", weight: 35, earned: 35, evidence: `${managedEnabled.length} referência(s) ativa(s) a rulesets gerenciados.`, recommendation: "Revisar overrides e falsos positivos periodicamente." }
      : { code: "managed_waf", title: "Managed Rules em execução", status: "fail", severity: "high", weight: 35, earned: 0, evidence: "Nenhum ruleset gerenciado em execução foi observado.", recommendation: "Avaliar o ruleset disponível no plano em modo controlado antes de bloquear." },
    rateEnabled.length
      ? { code: "rate_limiting", title: "Rate limiting configurado", status: "pass", severity: "low", weight: 25, earned: 25, evidence: `${rateEnabled.length} regra(s) de limitação ativa(s).`, recommendation: "Validar limites com tráfego real e objetivos de disponibilidade." }
      : { code: "rate_limiting", title: "Rate limiting configurado", status: "fail", severity: "high", weight: 25, earned: 0, evidence: "Nenhuma regra ativa de rate limiting foi observada.", recommendation: "Criar limites por rota somente após medir o tráfego legítimo." },
    customEnabled.length
      ? { code: "custom_controls", title: "Controles personalizados", status: "pass", severity: "low", weight: 15, earned: 15, evidence: `${customEnabled.length} regra(s) personalizada(s) ativa(s).`, recommendation: "Manter descrições, responsáveis e revisão de regras." }
      : { code: "custom_controls", title: "Controles personalizados", status: "warning", severity: "medium", weight: 15, earned: 5, evidence: "Nenhuma regra personalizada ativa foi observada.", recommendation: "Avaliar controles específicos apenas para riscos confirmados da aplicação." },
    skipEnabled.length === 0
      ? { code: "waf_exceptions", title: "Exceções do WAF", status: "pass", severity: "low", weight: 10, earned: 10, evidence: "Nenhuma exceção ativa foi observada nas fases inspecionadas.", recommendation: "Criar exceções restritas e temporárias quando necessárias." }
      : { code: "waf_exceptions", title: "Exceções do WAF", status: skipEnabled.length <= 2 ? "warning" : "fail", severity: skipEnabled.length <= 2 ? "medium" : "high", weight: 10, earned: skipEnabled.length <= 2 ? 5 : 0, evidence: `${skipEnabled.length} regra(s) de exceção ativa(s) exigem revisão.`, recommendation: "Confirmar escopo, justificativa e prazo de cada exceção antes de mantê-la." },
  ];
  const score = checks.reduce((total, check) => total + check.earned, 0);
  const grade = postureGrade(score);
  const summary = {
    inventoryCount: inventory.length,
    managedRulesEnabled: managedEnabled.length,
    rateLimitRulesEnabled: rateEnabled.length,
    customRulesEnabled: customEnabled.length,
    wafExceptionsEnabled: skipEnabled.length,
    expressionsStored: false,
  };
  const fingerprint = await postureFingerprint(inventory, [custom, rate, managed]);
  const now = new Date(args.now ?? Date.now()).toISOString();
  const snapshotId = uuid("sdps");
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO security_defense_posture_snapshots
      (id, workspace_id, scope_id, connector_id, provider, score, grade, checks_json, config_summary_json, config_fingerprint, observed_at)
      VALUES (?, ?, ?, ?, 'cloudflare', ?, ?, ?, ?, ?, ?)`)
      .bind(snapshotId, connector.workspace_id, connector.scope_id, connector.id, score, grade, JSON.stringify(checks), JSON.stringify(summary), fingerprint, now),
    env.DB.prepare("UPDATE security_defense_connectors SET last_health_at = ?, last_error_code = NULL, capabilities_json = ?, updated_at = ? WHERE id = ?")
      .bind(now, JSON.stringify({ ...capabilities, rulesetsRead: true, automaticChanges: false }), now, connector.id),
    env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'cloudflare.posture_audited', ?, ?)")
      .bind(uuid("sde"), connector.workspace_id, connector.scope_id, args.actorUserId ?? null, JSON.stringify({ snapshotId, score, grade, fingerprint, summary }), now),
  ]);
  if (!managedEnabled.length) await createPostureProposal(env, connector, {
    category: "managed_rules", risk: "medium", title: "Avaliar ativação de Managed Rules", rationale: "A auditoria não encontrou um ruleset gerenciado em execução na fase do WAF.",
    preview: { provider: "cloudflare", phase: "http_request_firewall_managed", operation: "deploy_available_managed_ruleset", initialMode: "log_or_challenge", requiresApproval: true, externalMutation: false },
    rollback: { operation: "restore_previous_ruleset_version", availableBeforeApply: false }, idempotencyKey: "managed-rules-missing",
  }, now);
  if (!rateEnabled.length) await createPostureProposal(env, connector, {
    category: "rate_limit", risk: "high", title: "Definir rate limiting por rota", rationale: "A auditoria não encontrou limites ativos; um valor genérico poderia bloquear tráfego legítimo.",
    preview: { provider: "cloudflare", phase: "http_ratelimit", operation: "create_route_specific_rate_limit", requiresTrafficBaseline: true, requiresApproval: true, externalMutation: false },
    rollback: { operation: "remove_created_rule", availableBeforeApply: false }, idempotencyKey: "rate-limit-missing",
  }, now);
  if (skipEnabled.length) await createPostureProposal(env, connector, {
    category: "exception_review", risk: skipEnabled.length <= 2 ? "medium" : "high", title: "Revisar exceções ativas do WAF", rationale: "Exceções podem reduzir a cobertura e precisam de justificativa, escopo e prazo.",
    preview: { provider: "cloudflare", operation: "review_exceptions", exceptionCount: skipEnabled.length, requiresApproval: true, externalMutation: false },
    rollback: { operation: "no_change_planned", availableBeforeApply: false }, idempotencyKey: "waf-exceptions-present",
  }, now);
  return { id: snapshotId, connectorId: connector.id, score, grade, checks, summary, fingerprint, observedAt: now };
}

export async function runDueCloudflarePostureAudit(env: SecurityDefenseEnv, fetcher: typeof fetch = fetch, now = Date.now()) {
  const cutoff = new Date(now - 24 * 60 * 60_000).toISOString();
  const due = await env.DB.prepare(`SELECT c.id FROM security_defense_connectors c
    JOIN security_agent_scopes s ON s.id = c.scope_id
    LEFT JOIN security_defense_posture_snapshots p ON p.id = (
      SELECT p2.id FROM security_defense_posture_snapshots p2 WHERE p2.connector_id = c.id ORDER BY p2.observed_at DESC, p2.id DESC LIMIT 1
    )
    WHERE c.provider = 'cloudflare' AND c.status = 'active' AND s.status = 'verified' AND s.authorization_expires_at > ?
      AND (p.observed_at IS NULL OR p.observed_at <= ?)
    ORDER BY COALESCE(p.observed_at, c.created_at), c.id LIMIT 2`)
    .bind(new Date(now).toISOString(), cutoff).all<{ id: string }>();
  let completed = 0;
  let failed = 0;
  for (const item of due.results) {
    try {
      await auditCloudflareDefensePosture(env, { connectorId: item.id, now }, fetcher);
      completed += 1;
    } catch {
      failed += 1;
    }
  }
  return { attempted: due.results.length, completed, failed };
}

function proposalId(raw: unknown) {
  if (typeof raw !== "string" || !/^sdp_[0-9a-f-]{36}$/i.test(raw)) throw new Error("CLOUDFLARE_PROPOSAL_INVALID");
  return raw;
}

function exactProtectedRoute(raw: unknown) {
  if (typeof raw !== "string") throw new Error("CLOUDFLARE_ROUTE_INVALID");
  const route = raw.trim();
  if (route.length < 2 || route.length > 120 || !/^\/[A-Za-z0-9/_{}.-]+$/.test(route) || route.includes("*") || route.includes("//")) throw new Error("CLOUDFLARE_ROUTE_INVALID");
  return route;
}

function rateLimitThreshold(raw: unknown) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 20 || value > 10_000) throw new Error("CLOUDFLARE_RATE_LIMIT_INVALID");
  return value;
}

function parseRateLimitPreview(value: string) {
  let raw: unknown;
  try { raw = JSON.parse(value); } catch { throw new Error("CLOUDFLARE_PROPOSAL_PREVIEW_INVALID"); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CLOUDFLARE_PROPOSAL_PREVIEW_INVALID");
  const preview = raw as Record<string, unknown>;
  const route = exactProtectedRoute(preview.route);
  const threshold = rateLimitThreshold(preview.requestsPerMinute);
  if (preview.provider !== "cloudflare" || preview.operation !== "create_rate_limit_managed_challenge" || preview.phase !== "http_ratelimit" || preview.action !== "managed_challenge" || preview.externalMutation !== true || preview.requiresApproval !== true || preview.periodSeconds !== 60 || preview.mitigationTimeout !== 0) throw new Error("CLOUDFLARE_PROPOSAL_PREVIEW_INVALID");
  return { route, threshold };
}

async function controlledProposal(env: SecurityDefenseEnv, args: { workspaceId: number; scopeId: string; connectorId: unknown; proposalId: unknown }) {
  const connector = typeof args.connectorId === "string" ? args.connectorId : "";
  if (!/^sdc_[0-9a-f-]{36}$/i.test(connector)) throw new Error("DEFENSE_CONNECTOR_INVALID");
  const proposal = await env.DB.prepare("SELECT * FROM security_defense_change_proposals WHERE id = ? AND workspace_id = ? AND scope_id = ? AND connector_id = ?")
    .bind(proposalId(args.proposalId), args.workspaceId, args.scopeId, connector).first<SecurityDefenseProposalRow>();
  if (!proposal) throw new Error("CLOUDFLARE_PROPOSAL_NOT_FOUND");
  const connectorRow = await env.DB.prepare(`SELECT c.* FROM security_defense_connectors c JOIN security_agent_scopes s ON s.id = c.scope_id
    WHERE c.id = ? AND c.workspace_id = ? AND c.scope_id = ? AND c.provider = 'cloudflare' AND c.status = 'active'
      AND s.status = 'verified' AND s.authorization_expires_at > datetime('now')`)
    .bind(connector, args.workspaceId, args.scopeId).first<SecurityDefenseConnectorRow>();
  if (!connectorRow?.external_zone_id) throw new Error("DEFENSE_CONNECTOR_NOT_FOUND");
  return { proposal, connector: connectorRow };
}

export async function configureCloudflareRateLimitProposal(env: SecurityDefenseEnv, args: { workspaceId: number; scopeId: string; connectorId: unknown; proposalId: unknown; actorUserId: number; route: unknown; requestsPerMinute: unknown }) {
  const { proposal, connector } = await controlledProposal(env, args);
  if (proposal.category !== "rate_limit" || proposal.status !== "draft") throw new Error("CLOUDFLARE_PROPOSAL_STATE_INVALID");
  if (!connector.write_credential_ciphertext || !connector.write_credential_iv) throw new Error("CLOUDFLARE_WRITE_CREDENTIAL_MISSING");
  const route = exactProtectedRoute(args.route);
  const threshold = rateLimitThreshold(args.requestsPerMinute);
  const snapshot = await env.DB.prepare("SELECT config_fingerprint FROM security_defense_posture_snapshots WHERE connector_id = ? ORDER BY observed_at DESC, id DESC LIMIT 1")
    .bind(connector.id).first<{ config_fingerprint: string }>();
  if (!snapshot?.config_fingerprint) throw new Error("CLOUDFLARE_POSTURE_REQUIRED");
  const preview = {
    provider: "cloudflare", operation: "create_rate_limit_managed_challenge", phase: "http_ratelimit", route,
    match: "exact_path", action: "managed_challenge", periodSeconds: 60, requestsPerMinute: threshold, mitigationTimeout: 0,
    characteristics: ["cf.colo.id", "ip.src"], requiresApproval: true, externalMutation: true,
  };
  const rollback = { operation: "delete_created_rule", resourceOwnership: "cbshub_created_only", availableAfterApply: true };
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE security_defense_change_proposals SET preview_json = ?, rollback_json = ?, base_fingerprint = ?,
      approved_by_user_id = NULL, approved_at = NULL, approval_expires_at = NULL, external_ruleset_id = NULL,
      external_rule_id = NULL, apply_error_code = NULL, updated_at = ? WHERE id = ? AND status = 'draft'`)
      .bind(JSON.stringify(preview), JSON.stringify(rollback), snapshot.config_fingerprint, now, proposal.id),
    env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'cloudflare.change_configured', ?, ?)")
      .bind(uuid("sde"), connector.workspace_id, connector.scope_id, args.actorUserId, JSON.stringify({ proposalId: proposal.id, operation: preview.operation, route, threshold, baseFingerprint: snapshot.config_fingerprint }), now),
  ]);
  return { id: proposal.id, status: "draft" as const, preview, rollback, baseFingerprint: snapshot.config_fingerprint };
}

export async function approveCloudflareChangeProposal(env: SecurityDefenseEnv, args: { workspaceId: number; scopeId: string; connectorId: unknown; proposalId: unknown; actorUserId: number; approvalConfirmed: unknown }) {
  if (args.approvalConfirmed !== true) throw new Error("CLOUDFLARE_APPROVAL_REQUIRED");
  const { proposal, connector } = await controlledProposal(env, args);
  if (proposal.status !== "draft" || !proposal.base_fingerprint) throw new Error("CLOUDFLARE_PROPOSAL_STATE_INVALID");
  parseRateLimitPreview(proposal.preview_json);
  if (!connector.write_credential_ciphertext || !connector.write_credential_iv) throw new Error("CLOUDFLARE_WRITE_CREDENTIAL_MISSING");
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + CLOUDFLARE_APPROVAL_WINDOW_MS).toISOString();
  const result = await env.DB.prepare("UPDATE security_defense_change_proposals SET status = 'approved', approved_by_user_id = ?, approved_at = ?, approval_expires_at = ?, apply_error_code = NULL, updated_at = ? WHERE id = ? AND status = 'draft'")
    .bind(args.actorUserId, now, expiresAt, now, proposal.id).run();
  if (Number(result.meta.changes ?? 0) !== 1) throw new Error("CLOUDFLARE_PROPOSAL_STATE_INVALID");
  await env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'cloudflare.change_approved', ?, ?)")
    .bind(uuid("sde"), connector.workspace_id, connector.scope_id, args.actorUserId, JSON.stringify({ proposalId: proposal.id, expiresAt, baseFingerprint: proposal.base_fingerprint }), now).run();
  return { id: proposal.id, status: "approved" as const, approvalExpiresAt: expiresAt };
}

function cloudflareChangeCode(error: unknown) {
  const code = error instanceof Error ? error.message : "CLOUDFLARE_CHANGE_FAILED";
  return ["CLOUDFLARE_WRITE_CREDENTIAL_MISSING", "CLOUDFLARE_WRITE_CREDENTIAL_INVALID", "CLOUDFLARE_WRITE_TOKEN_REJECTED", "CLOUDFLARE_WRITE_PERMISSION_REQUIRED", "CLOUDFLARE_WRITE_RATE_LIMITED", "CLOUDFLARE_UNAVAILABLE", "CLOUDFLARE_MUTATION_FAILED", "CLOUDFLARE_MUTATION_RESULT_INVALID", "CLOUDFLARE_CHANGE_VERIFICATION_FAILED", "CLOUDFLARE_CONFIGURATION_DRIFT"].includes(code) ? code : "CLOUDFLARE_CHANGE_FAILED";
}

export async function applyCloudflareChangeProposal(
  env: SecurityDefenseEnv,
  args: { workspaceId: number; scopeId: string; connectorId: unknown; proposalId: unknown; actorUserId: number; executionConfirmed: unknown },
  fetcher: typeof fetch = fetch,
) {
  if (args.executionConfirmed !== true) throw new Error("CLOUDFLARE_EXECUTION_CONFIRMATION_REQUIRED");
  const { proposal, connector } = await controlledProposal(env, args);
  if (proposal.status !== "approved" || !proposal.base_fingerprint) throw new Error("CLOUDFLARE_PROPOSAL_STATE_INVALID");
  if (!proposal.approval_expires_at || Date.parse(proposal.approval_expires_at) <= Date.now()) {
    await env.DB.prepare("UPDATE security_defense_change_proposals SET status = 'draft', approved_by_user_id = NULL, approved_at = NULL, approval_expires_at = NULL, apply_error_code = 'CLOUDFLARE_APPROVAL_EXPIRED', updated_at = datetime('now') WHERE id = ? AND status = 'approved'").bind(proposal.id).run();
    throw new Error("CLOUDFLARE_APPROVAL_EXPIRED");
  }
  const { route, threshold } = parseRateLimitPreview(proposal.preview_json);
  const current = await auditCloudflareDefensePosture(env, { connectorId: connector.id, workspaceId: connector.workspace_id, scopeId: connector.scope_id, actorUserId: args.actorUserId }, fetcher);
  if (current.fingerprint !== proposal.base_fingerprint) {
    await env.DB.prepare("UPDATE security_defense_change_proposals SET status = 'draft', approved_by_user_id = NULL, approved_at = NULL, approval_expires_at = NULL, apply_error_code = 'CLOUDFLARE_CONFIGURATION_DRIFT', base_fingerprint = ?, updated_at = datetime('now') WHERE id = ? AND status = 'approved'")
      .bind(current.fingerprint, proposal.id).run();
    throw new Error("CLOUDFLARE_CONFIGURATION_DRIFT");
  }
  const lock = await env.DB.prepare("UPDATE security_defense_change_proposals SET status = 'applying', updated_at = datetime('now') WHERE id = ? AND status = 'approved'").bind(proposal.id).run();
  if (Number(lock.meta.changes ?? 0) !== 1) throw new Error("CLOUDFLARE_PROPOSAL_STATE_INVALID");
  let rulesetId: string | null = null;
  let ruleId: string | null = null;
  try {
    const token = await decryptCloudflareWriteCredential(env, connector);
    const zone = encodeURIComponent(connector.external_zone_id!);
    const existing = await cloudflareRulesetRequest<CloudflareRuleset>(fetcher, token, `/zones/${zone}/rulesets/phases/http_ratelimit/entrypoint`, true);
    const description = `CBSHub controlled ${proposal.id}`;
    const rule = { description, expression: `(http.request.uri.path eq "${route}")`, action: "managed_challenge", enabled: true, ratelimit: { characteristics: ["cf.colo.id", "ip.src"], period: 60, requests_per_period: threshold, mitigation_timeout: 0 } };
    const changed = existing?.id
      ? await cloudflareMutationRequest<CloudflareRuleset>(fetcher, token, `/zones/${zone}/rulesets/${encodeURIComponent(existing.id)}/rules`, "POST", rule)
      : await cloudflareMutationRequest<CloudflareRuleset>(fetcher, token, `/zones/${zone}/rulesets`, "POST", { name: "CBSHub controlled rate limiting", description: "Rules created only after explicit customer approval", kind: "zone", phase: "http_ratelimit", rules: [rule] });
    rulesetId = changed?.id ?? existing?.id ?? null;
    ruleId = rulesFrom(changed ?? null).find((item) => item.description === description)?.id ?? null;
    if (!rulesetId || !ruleId) throw new Error("CLOUDFLARE_MUTATION_RESULT_INVALID");
    await env.DB.prepare("UPDATE security_defense_change_proposals SET external_ruleset_id = ?, external_rule_id = ?, updated_at = datetime('now') WHERE id = ? AND status = 'applying'").bind(rulesetId, ruleId, proposal.id).run();
    const verified = await cloudflareRulesetRequest<CloudflareRuleset>(fetcher, token, `/zones/${zone}/rulesets/phases/http_ratelimit/entrypoint`);
    const verifiedRule = rulesFrom(verified ?? null).find((item) => item.id === ruleId && item.description === description && item.action === "managed_challenge" && item.enabled !== false);
    if (!verifiedRule) throw new Error("CLOUDFLARE_CHANGE_VERIFICATION_FAILED");
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE security_defense_change_proposals SET status = 'applied', applied_at = ?, apply_error_code = NULL, rollback_json = ?, updated_at = ? WHERE id = ? AND status = 'applying'")
        .bind(now, JSON.stringify({ operation: "delete_created_rule", rulesetId, ruleId, resourceOwnership: "cbshub_created_only" }), now, proposal.id),
      env.DB.prepare("UPDATE security_defense_connectors SET write_capabilities_json = ?, write_last_health_at = ?, write_last_error_code = NULL, updated_at = ? WHERE id = ?")
        .bind(JSON.stringify({ zoneWafWrite: "verified", allowedOperations: ["create_rate_limit_managed_challenge", "delete_owned_rule"], automaticChanges: false }), now, now, connector.id),
      env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'cloudflare.change_applied', ?, ?)")
        .bind(uuid("sde"), connector.workspace_id, connector.scope_id, args.actorUserId, JSON.stringify({ proposalId: proposal.id, rulesetId, ruleId, operation: "create_rate_limit_managed_challenge", route, threshold, verified: true }), now),
    ]);
    return { id: proposal.id, status: "applied" as const, rulesetId, ruleId, verified: true };
  } catch (error) {
    const code = cloudflareChangeCode(error);
    await env.DB.batch([
      env.DB.prepare("UPDATE security_defense_change_proposals SET status = 'failed', external_ruleset_id = COALESCE(external_ruleset_id, ?), external_rule_id = COALESCE(external_rule_id, ?), apply_error_code = ?, updated_at = datetime('now') WHERE id = ? AND status = 'applying'").bind(rulesetId, ruleId, code, proposal.id),
      env.DB.prepare("UPDATE security_defense_connectors SET write_last_error_code = ?, updated_at = datetime('now') WHERE id = ?").bind(code, connector.id),
      env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json) VALUES (?, ?, ?, ?, 'cloudflare.change_failed', ?)").bind(uuid("sde"), connector.workspace_id, connector.scope_id, args.actorUserId, JSON.stringify({ proposalId: proposal.id, code, externalResourceRecorded: Boolean(rulesetId && ruleId) })),
    ]);
    throw new Error(code);
  }
}

export async function rollbackCloudflareChangeProposal(
  env: SecurityDefenseEnv,
  args: { workspaceId: number; scopeId: string; connectorId: unknown; proposalId: unknown; actorUserId: number; rollbackConfirmed: unknown },
  fetcher: typeof fetch = fetch,
) {
  if (args.rollbackConfirmed !== true) throw new Error("CLOUDFLARE_ROLLBACK_CONFIRMATION_REQUIRED");
  const { proposal, connector } = await controlledProposal(env, args);
  if (!["applied", "failed"].includes(proposal.status) || !proposal.external_ruleset_id || !proposal.external_rule_id) throw new Error("CLOUDFLARE_ROLLBACK_UNAVAILABLE");
  const token = await decryptCloudflareWriteCredential(env, connector);
  const zone = encodeURIComponent(connector.external_zone_id!);
  await cloudflareMutationRequest(fetcher, token, `/zones/${zone}/rulesets/${encodeURIComponent(proposal.external_ruleset_id)}/rules/${encodeURIComponent(proposal.external_rule_id)}`, "DELETE");
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE security_defense_change_proposals SET status = 'rolled_back', apply_error_code = NULL, updated_at = ? WHERE id = ? AND status IN ('applied','failed')").bind(now, proposal.id),
    env.DB.prepare("UPDATE security_defense_connectors SET write_last_health_at = ?, write_last_error_code = NULL, updated_at = ? WHERE id = ?").bind(now, now, connector.id),
    env.DB.prepare("INSERT INTO security_defense_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'cloudflare.change_rolled_back', ?, ?)")
      .bind(uuid("sde"), connector.workspace_id, connector.scope_id, args.actorUserId, JSON.stringify({ proposalId: proposal.id, rulesetId: proposal.external_ruleset_id, ruleId: proposal.external_rule_id }), now),
  ]);
  return { id: proposal.id, status: "rolled_back" as const, removedRuleId: proposal.external_rule_id };
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
    WHERE c.id = ? AND c.provider = 'signed_webhook' AND c.status = 'active' AND s.status = 'verified' AND s.authorization_expires_at > datetime('now')`)
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

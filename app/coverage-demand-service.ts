import { env } from "cloudflare:workers";
import { cityCoverage } from "../domain/national-tax-coverage";
import { fiscalExpansionBacklog, type ExpansionScope } from "../domain/fiscal-expansion";
import {
  COVERAGE_DEMAND_VERSION,
  deduplicateCoverageBacklog,
  summarizeCoverageGains,
  type DemandCandidate,
  type DemandTaxScope,
} from "../domain/coverage-demand-prioritization";
import type { FiscalIntelligenceOverrides } from "../domain/fiscal-intelligence";

type D1Result<T> = { results?: T[] };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
};
type D1 = {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
};
type CoverageOutcome = "supported" | "partial" | "not_supported";
type StructuredSignal = { dimensionType: DemandCandidate["dimensionType"]; dimensionKey: string; taxScope: DemandTaxScope };
type SignalAggregateRow = {
  id: string;
  dimension_type: DemandCandidate["dimensionType"];
  dimension_key: string;
  tax_scope: DemandTaxScope;
  occurrence_count: number;
  supported_count: number;
  partial_count: number;
  blocked_count: number;
  workspace_count: number;
  revenue_cents: number;
};

const scopeRisk: Record<DemandTaxScope, number> = { icms: 9000, st: 9800, iss: 8500, simples: 7600, pis_cofins: 8500, withholdings: 9200, ipi: 8600, reform: 9600, federal: 8200 };
const scopeSources: Record<DemandTaxScope, string[]> = {
  icms: ["CONSTITUICAO-1988", "RSF-13-2012"], st: ["CONVENIO-ICMS-142-2018"], iss: ["LC-116-2003"],
  simples: ["LC-123-2006", "CGSN-140-2018"], pis_cofins: ["LEI-9718-1998", "LEI-10637-2002", "LEI-10833-2003"],
  withholdings: ["LEI-9430-1996", "LEI-10833-2003"], ipi: ["IPI-RFB-TIPI-CONSOLIDATED"], reform: ["EC-132-2023", "LC-214-2025"], federal: ["RFB-FEDERAL"],
};

function monthKey(date = new Date()) { return date.toISOString().slice(0, 7); }
function normalizeText(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim(); }
function topicScope(topicCode: string | null | undefined): DemandTaxScope {
  const topic = String(topicCode ?? "").toUpperCase();
  if (topic.includes("ICMS") && topic.includes("ST")) return "st";
  if (topic.includes("ICMS")) return "icms";
  if (topic.includes("ISS")) return "iss";
  if (topic.includes("SIMPLES")) return "simples";
  if (topic.includes("PIS") || topic.includes("COFINS")) return "pis_cofins";
  if (topic.includes("RETEN") || topic.includes("WITHHOLD")) return "withholdings";
  if (topic.includes("IPI") || topic.includes("TIPI")) return "ipi";
  if (topic.includes("IBS") || topic.includes("CBS") || topic.includes("REFORM")) return "reform";
  return "federal";
}

const knownCities = new Map(cityCoverage.flatMap((city) => {
  const key = normalizeText(city.city);
  return [[key, city.ibgeCode], [`${key} ${city.uf}`, city.ibgeCode]] as Array<[string, string]>;
}));

function intelligenceSignals(topicCode: string | null | undefined, facts: FiscalIntelligenceOverrides): StructuredSignal[] {
  const taxScope = topicScope(topicCode);
  const signals: StructuredSignal[] = [{ dimensionType: "topic", dimensionKey: String(topicCode ?? "TOPIC-ROUTER").slice(0, 80), taxScope }];
  if (facts.originState && facts.destinationState && facts.originState !== facts.destinationState) signals.push({ dimensionType: "route", dimensionKey: `${facts.originState}-${facts.destinationState}`, taxScope: taxScope === "icms" ? "st" : taxScope });
  const ncm = String(facts.ncm ?? "").replace(/\D/g, "");
  if (ncm.length === 8) signals.push({ dimensionType: "ncm", dimensionKey: ncm, taxScope });
  const cest = String(facts.cest ?? "").replace(/\D/g, "");
  if (cest.length === 7) signals.push({ dimensionType: "cest", dimensionKey: cest, taxScope: "st" });
  for (const municipality of [facts.originMunicipality, facts.destinationMunicipality]) {
    const ibge = municipality ? knownCities.get(normalizeText(municipality)) : null;
    if (ibge) signals.push({ dimensionType: "city", dimensionKey: ibge, taxScope: "iss" });
  }
  if (facts.serviceNature && facts.serviceNature !== "unknown") signals.push({ dimensionType: "service", dimensionKey: facts.serviceNature, taxScope: taxScope === "iss" ? "iss" : "withholdings" });
  return [...new Map(signals.map((signal) => [`${signal.dimensionType}:${signal.dimensionKey}:${signal.taxScope}`, signal])).values()];
}

function labScope(module: string): DemandTaxScope {
  if (module.startsWith("simples")) return "simples";
  if (module.startsWith("pis_cofins")) return "pis_cofins";
  if (module === "federal_withholdings") return "withholdings";
  if (module === "ipi_tipi") return "ipi";
  if (module === "iss") return "iss";
  if (module === "icms_difal") return "icms";
  if (module === "rtc_2026") return "reform";
  return "federal";
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function workspaceRevenueCents(db: D1, workspaceId: number) {
  const row = await db.prepare(`SELECT coalesce(sum(latest.revenue_cents), 0) AS revenue_cents FROM scenarios latest
    INNER JOIN companies c ON c.id = latest.company_id
    WHERE c.workspace_id = ? AND latest.id IN (SELECT max(s2.id) FROM scenarios s2 INNER JOIN companies c2 ON c2.id = s2.company_id WHERE c2.workspace_id = ? GROUP BY s2.company_id)`)
    .bind(workspaceId, workspaceId).first<{ revenue_cents: number }>();
  return Math.max(0, Number(row?.revenue_cents ?? 0));
}

async function recordSignals(db: D1, workspaceId: number, signals: StructuredSignal[], outcome: CoverageOutcome) {
  if (!signals.length) return;
  const now = new Date().toISOString(); const month = monthKey(new Date(now));
  const secret = String((env as unknown as { SECURITY_HASH_KEY?: string }).SECURITY_HASH_KEY ?? "coverage-demand-v1");
  const workspaceHash = (await digest(`${secret}:${workspaceId}:${month}`)).slice(0, 48);
  const revenueCents = await workspaceRevenueCents(db, workspaceId);
  const statements: D1Statement[] = [];
  for (const signal of signals) {
    const signalId = (await digest(`${month}:${signal.dimensionType}:${signal.dimensionKey}:${signal.taxScope}`)).slice(0, 48);
    const claimId = (await digest(`${signalId}:${workspaceHash}`)).slice(0, 48);
    statements.push(db.prepare(`INSERT INTO coverage_demand_signals (id, month_key, dimension_type, dimension_key, tax_scope, occurrence_count, supported_count, partial_count, blocked_count, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
      ON CONFLICT(month_key, dimension_type, dimension_key, tax_scope) DO UPDATE SET occurrence_count = occurrence_count + 1,
      supported_count = supported_count + excluded.supported_count, partial_count = partial_count + excluded.partial_count,
      blocked_count = blocked_count + excluded.blocked_count, last_seen_at = excluded.last_seen_at`)
      .bind(signalId, month, signal.dimensionType, signal.dimensionKey, signal.taxScope, outcome === "supported" ? 1 : 0, outcome === "partial" ? 1 : 0, outcome === "not_supported" ? 1 : 0, now, now));
    statements.push(db.prepare(`INSERT INTO coverage_demand_claims (id, signal_id, month_key, workspace_hash, revenue_cents, hit_count, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(signal_id, workspace_hash) DO UPDATE SET hit_count = hit_count + 1, revenue_cents = max(revenue_cents, excluded.revenue_cents), last_seen_at = excluded.last_seen_at`)
      .bind(claimId, signalId, month, workspaceHash, revenueCents, now, now));
  }
  await db.batch(statements);
}

export async function recordIntelligenceCoverageDemand(input: { workspaceId: number; topicCode?: string | null; facts: FiscalIntelligenceOverrides; outcome: CoverageOutcome }) {
  await recordSignals(env.DB as unknown as D1, input.workspaceId, intelligenceSignals(input.topicCode, input.facts), input.outcome);
}

export async function recordLabCoverageDemand(input: { workspaceId: number; module: string; outcome: "calculated_reference" | "blocked" | "not_supported" }) {
  const scope = labScope(input.module);
  await recordSignals(env.DB as unknown as D1, input.workspaceId, [{ dimensionType: "module", dimensionKey: input.module.slice(0, 80), taxScope: scope }], input.outcome === "calculated_reference" ? "supported" : input.outcome === "blocked" ? "partial" : "not_supported");
}

async function sourceHealth(db: D1) {
  const row = await db.prepare(`WITH latest AS (SELECT source_code, max(checked_at) checked_at FROM normative_source_snapshots GROUP BY source_code)
    SELECT count(*) total, sum(CASE WHEN s.capture_status = 'checked' THEN 1 ELSE 0 END) healthy
    FROM normative_source_snapshots s INNER JOIN latest l ON l.source_code = s.source_code AND l.checked_at = s.checked_at`).first<{ total: number; healthy: number }>();
  const total = Number(row?.total ?? 0); return total ? Math.round((Number(row?.healthy ?? 0) / total) * 10_000) : 5000;
}

function expansionScope(scope: ExpansionScope): DemandTaxScope { return scope === "sources" ? "federal" : scope === "federal" ? "federal" : scope; }
function stageCoverage(stage: string) { return ({ catalogued: 1000, source_connected: 3000, structured: 5500, tested: 7800, automatically_verified: 10000, blocked: 0 } as Record<string, number>)[stage] ?? 0; }

export async function refreshCoverageBacklog(db: D1 = env.DB as unknown as D1, referenceDate = new Date()) {
  const month = monthKey(referenceDate); const refreshedAt = referenceDate.toISOString(); const healthBps = await sourceHealth(db);
  const result = await db.prepare(`SELECT s.id, s.dimension_type, s.dimension_key, s.tax_scope, s.occurrence_count, s.supported_count, s.partial_count, s.blocked_count,
    count(c.id) workspace_count, coalesce(sum(c.revenue_cents), 0) revenue_cents FROM coverage_demand_signals s
    LEFT JOIN coverage_demand_claims c ON c.signal_id = s.id WHERE s.month_key = ? GROUP BY s.id`).bind(month).all<SignalAggregateRow>();
  const demandCandidates: DemandCandidate[] = (result.results ?? []).map((row) => {
    const total = Number(row.supported_count) + Number(row.partial_count) + Number(row.blocked_count);
    const currentCoverageBps = total ? Math.round((Number(row.supported_count) / total) * 10_000) : 0;
    const itemCode = `DEMAND-${row.dimension_type.toUpperCase()}-${row.dimension_key}`.replace(/[^A-Z0-9-]/g, "-").slice(0, 100);
    return { itemCode, dimensionType: row.dimension_type, dimensionKey: row.dimension_key, taxScope: row.tax_scope, frequency: Number(row.occurrence_count), workspaceCount: Number(row.workspace_count), revenueCents: Number(row.revenue_cents), blockedCount: Number(row.blocked_count), partialCount: Number(row.partial_count), supportedCount: Number(row.supported_count), riskScore: scopeRisk[row.tax_scope], sourceHealthBps: healthBps, currentCoverageBps, expectedCaseCount: 3, sourceCodes: scopeSources[row.tax_scope], ruleCodes: [`RULE-GAP:${itemCode}`], testCodes: [`TEST-GAP:${itemCode}`], implementationRef: `https://trello.com/c/tvPJ2wEe#${encodeURIComponent(itemCode)}` };
  });
  const catalogCandidates: DemandCandidate[] = fiscalExpansionBacklog.map((item) => {
    const taxScope = expansionScope(item.scope); const currentCoverageBps = stageCoverage(item.defaultStage);
    return { itemCode: item.code, dimensionType: "catalog_gap", dimensionKey: item.code, taxScope, frequency: 0, workspaceCount: 0, revenueCents: 0, blockedCount: item.blockers.length ? 1 : 0, partialCount: item.supportStatus === "partial" ? 1 : 0, supportedCount: item.supportStatus === "supported" ? 1 : 0, riskScore: item.risk * 2000, sourceHealthBps: healthBps, currentCoverageBps, expectedCaseCount: 2, sourceCodes: item.sourceUrl ? [`SOURCE:${item.code}`] : [], ruleCodes: [`RULE-GAP:${item.code}`], testCodes: [`TEST-GAP:${item.code}`], implementationRef: `https://trello.com/c/tvPJ2wEe#${encodeURIComponent(item.code)}` };
  });
  const ranked = deduplicateCoverageBacklog([...demandCandidates, ...catalogCandidates]).slice(0, 120);
  const statements: D1Statement[] = [];
  for (const item of ranked) {
    const fingerprint = (await digest(item.fingerprintMaterial)).slice(0, 48);
    statements.push(db.prepare(`INSERT INTO coverage_monthly_backlog (id, month_key, item_code, dimension_type, dimension_key, tax_scope, priority_score, frequency_count, workspace_count, revenue_cents, blocked_count, partial_count, supported_count, risk_score, source_health_bps, current_coverage_bps, projected_gain_bps, verified_gain_bps, expected_case_count, source_codes_json, rule_codes_json, test_codes_json, implementation_ref, justification_json, fingerprint, status, refreshed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'planned', ?)
      ON CONFLICT(month_key, item_code) DO UPDATE SET priority_score=excluded.priority_score, frequency_count=excluded.frequency_count, workspace_count=excluded.workspace_count, revenue_cents=excluded.revenue_cents, blocked_count=excluded.blocked_count, partial_count=excluded.partial_count, supported_count=excluded.supported_count, risk_score=excluded.risk_score, source_health_bps=excluded.source_health_bps, current_coverage_bps=excluded.current_coverage_bps, projected_gain_bps=excluded.projected_gain_bps, expected_case_count=excluded.expected_case_count, source_codes_json=excluded.source_codes_json, rule_codes_json=excluded.rule_codes_json, test_codes_json=excluded.test_codes_json, implementation_ref=excluded.implementation_ref, justification_json=excluded.justification_json, verified_gain_bps=CASE WHEN coverage_monthly_backlog.fingerprint=excluded.fingerprint THEN coverage_monthly_backlog.verified_gain_bps ELSE 0 END, status=CASE WHEN coverage_monthly_backlog.fingerprint=excluded.fingerprint THEN coverage_monthly_backlog.status ELSE 'planned' END, fingerprint=excluded.fingerprint, refreshed_at=excluded.refreshed_at`)
      .bind(`${month}:${item.itemCode}`, month, item.itemCode, item.dimensionType, item.dimensionKey, item.taxScope, item.priorityScore, item.frequency, item.workspaceCount, item.revenueCents, item.blockedCount, item.partialCount, item.supportedCount, item.riskScore, item.sourceHealthBps, item.currentCoverageBps, item.projectedGainBps, item.expectedCaseCount, JSON.stringify(item.sourceCodes), JSON.stringify(item.ruleCodes), JSON.stringify(item.testCodes), item.implementationRef, JSON.stringify(item.justification), fingerprint, refreshedAt));
  }
  for (let index = 0; index < statements.length; index += 40) await db.batch(statements.slice(index, index + 40));
  await persistGoals(db, month, refreshedAt);
  return { month, backlogCount: ranked.length, version: COVERAGE_DEMAND_VERSION };
}

export async function ensureCoverageBacklogFresh(db: D1 = env.DB as unknown as D1, referenceDate = new Date()) {
  const month = monthKey(referenceDate);
  const current = await db.prepare("SELECT max(refreshed_at) refreshed_at, count(*) backlog_count FROM coverage_monthly_backlog WHERE month_key = ?")
    .bind(month).first<{ refreshed_at: string | null; backlog_count: number }>();
  if (current?.refreshed_at?.slice(0, 10) === referenceDate.toISOString().slice(0, 10) && Number(current.backlog_count) > 0) {
    return { month, backlogCount: Number(current.backlog_count), version: COVERAGE_DEMAND_VERSION, reused: true };
  }
  return { ...(await refreshCoverageBacklog(db, referenceDate)), reused: false };
}

async function persistGoals(db: D1, month: string, refreshedAt: string) {
  const rows = await listCoverageBacklog(db, month);
  const scopes = [...new Set(rows.map((row) => row.taxScope))];
  for (const scope of scopes) {
    const scoped = rows.filter((row) => row.taxScope === scope);
    const starting = scoped.length ? Math.round(scoped.reduce((sum, row) => sum + row.currentCoverageBps, 0) / scoped.length) : 0;
    const gains = summarizeCoverageGains(scoped);
    const fingerprint = (await digest(JSON.stringify({ version: COVERAGE_DEMAND_VERSION, month, scope, starting, gains, count: scoped.length }))).slice(0, 48);
    await db.prepare(`INSERT INTO coverage_expansion_goals (id, month_key, tax_scope, target_gain_bps, starting_coverage_bps, projected_gain_bps, verified_gain_bps, backlog_count, fingerprint, refreshed_at)
      VALUES (?, ?, ?, 500, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(month_key, tax_scope) DO UPDATE SET starting_coverage_bps=excluded.starting_coverage_bps, projected_gain_bps=excluded.projected_gain_bps, verified_gain_bps=excluded.verified_gain_bps, backlog_count=excluded.backlog_count, fingerprint=excluded.fingerprint, refreshed_at=excluded.refreshed_at`)
      .bind(`${month}:${scope}`, month, scope, starting, gains.projectedGainBps, gains.verifiedGainBps, scoped.length, fingerprint, refreshedAt).run();
  }
}

export async function listCoverageBacklog(db: D1 = env.DB as unknown as D1, month = monthKey()) {
  const result = await db.prepare("SELECT * FROM coverage_monthly_backlog WHERE month_key = ? ORDER BY priority_score DESC, item_code LIMIT 120").bind(month).all<Record<string, unknown>>();
  return (result.results ?? []).map((row) => ({
    itemCode: String(row.item_code), dimensionType: String(row.dimension_type), dimensionKey: String(row.dimension_key), taxScope: String(row.tax_scope) as DemandTaxScope,
    priorityScore: Number(row.priority_score), frequency: Number(row.frequency_count), workspaceCount: Number(row.workspace_count), revenueCents: Number(row.revenue_cents), blockedCount: Number(row.blocked_count), partialCount: Number(row.partial_count), supportedCount: Number(row.supported_count), riskScore: Number(row.risk_score), sourceHealthBps: Number(row.source_health_bps), currentCoverageBps: Number(row.current_coverage_bps), projectedGainBps: Number(row.projected_gain_bps), verifiedGainBps: Number(row.verified_gain_bps), expectedCaseCount: Number(row.expected_case_count), sourceCodes: JSON.parse(String(row.source_codes_json)), ruleCodes: JSON.parse(String(row.rule_codes_json)), testCodes: JSON.parse(String(row.test_codes_json)), implementationRef: String(row.implementation_ref), justification: JSON.parse(String(row.justification_json)), fingerprint: String(row.fingerprint), status: String(row.status), refreshedAt: String(row.refreshed_at), eligibleForGain: Number(row.projected_gain_bps) > 0,
  }));
}

export async function listCoverageGoals(db: D1 = env.DB as unknown as D1, month = monthKey()) {
  const result = await db.prepare("SELECT * FROM coverage_expansion_goals WHERE month_key = ? ORDER BY tax_scope").bind(month).all<Record<string, unknown>>();
  return (result.results ?? []).map((row) => ({ taxScope: String(row.tax_scope), targetGainBps: Number(row.target_gain_bps), startingCoverageBps: Number(row.starting_coverage_bps), projectedGainBps: Number(row.projected_gain_bps), verifiedGainBps: Number(row.verified_gain_bps), backlogCount: Number(row.backlog_count), fingerprint: String(row.fingerprint), refreshedAt: String(row.refreshed_at) }));
}

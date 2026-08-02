export const FISCAL_IMPACT_GRAPH_VERSION = "fiscal-impact-graph.v1";

export type FiscalImpactNodeType = "normative_source" | "rule" | "engine" | "scenario" | "dossier" | "report";
export type FiscalImpactArtifactType = "scenario" | "dossier" | "report";
export type FiscalImpactDisposition = "historical_notice" | "blocked_pending_reprocess";

export type FiscalImpactArtifact = {
  type: FiscalImpactArtifactType;
  id: string;
  workspaceId: number;
  companyId: number | null;
  competence: string | null;
  status: string;
  contentHash: string;
  snapshot: unknown;
  immutable: boolean;
  parentId?: string | null;
  parentType?: "scenario" | "dossier" | null;
};

export type FiscalImpactNode = {
  key: string;
  type: FiscalImpactNodeType;
  externalId: string;
  workspaceId: number | null;
  companyId: number | null;
  competence: string | null;
  immutable: boolean;
  contentHash: string | null;
  metadata: Record<string, unknown>;
};

export type FiscalImpactEdge = {
  key: string;
  from: string;
  to: string;
  relation: "defines" | "executes" | "produces" | "freezes" | "publishes";
};

function safePart(value: string) {
  return encodeURIComponent(value.trim()).slice(0, 240);
}

export function impactNodeKey(type: FiscalImpactNodeType, externalId: string) {
  return `${type}:${safePart(externalId)}`;
}

export function impactEdgeKey(from: string, relation: FiscalImpactEdge["relation"], to: string) {
  return `${from}>${relation}>${to}`;
}

export function classifyFiscalArtifactImpact(artifact: FiscalImpactArtifact): FiscalImpactDisposition {
  return artifact.immutable || artifact.status === "approved" || artifact.status === "delivered"
    ? "historical_notice"
    : "blocked_pending_reprocess";
}

export function buildFiscalImpactGraph(input: {
  sourceCode: string;
  ruleCodes: readonly string[];
  engineCodes: readonly string[];
  artifacts: readonly FiscalImpactArtifact[];
}) {
  const nodes = new Map<string, FiscalImpactNode>();
  const edges = new Map<string, FiscalImpactEdge>();
  const addNode = (node: FiscalImpactNode) => nodes.set(node.key, node);
  const addEdge = (from: string, relation: FiscalImpactEdge["relation"], to: string) => {
    const key = impactEdgeKey(from, relation, to);
    edges.set(key, { key, from, to, relation });
  };
  const sourceKey = impactNodeKey("normative_source", input.sourceCode);
  addNode({ key: sourceKey, type: "normative_source", externalId: input.sourceCode, workspaceId: null, companyId: null, competence: null, immutable: true, contentHash: null, metadata: { graphVersion: FISCAL_IMPACT_GRAPH_VERSION } });

  const ruleKeys = input.ruleCodes.map((ruleCode) => {
    const key = impactNodeKey("rule", ruleCode);
    addNode({ key, type: "rule", externalId: ruleCode, workspaceId: null, companyId: null, competence: null, immutable: true, contentHash: null, metadata: {} });
    addEdge(sourceKey, "defines", key);
    return key;
  });
  const engineKeys = input.engineCodes.map((engineCode) => {
    const key = impactNodeKey("engine", engineCode);
    addNode({ key, type: "engine", externalId: engineCode, workspaceId: null, companyId: null, competence: null, immutable: true, contentHash: null, metadata: {} });
    for (const ruleKey of ruleKeys) addEdge(ruleKey, "executes", key);
    return key;
  });
  for (const artifact of input.artifacts) {
    const key = impactNodeKey(artifact.type, artifact.id);
    addNode({ key, type: artifact.type, externalId: artifact.id, workspaceId: artifact.workspaceId, companyId: artifact.companyId, competence: artifact.competence, immutable: artifact.immutable, contentHash: artifact.contentHash, metadata: { status: artifact.status, disposition: classifyFiscalArtifactImpact(artifact) } });
    if (artifact.parentId) {
      const parentType: FiscalImpactNodeType = artifact.parentType ?? (artifact.type === "report" ? "dossier" : "scenario");
      addEdge(impactNodeKey(parentType, artifact.parentId), artifact.type === "report" ? "publishes" : "freezes", key);
    } else {
      for (const producerKey of engineKeys.length ? engineKeys : ruleKeys) addEdge(producerKey, "produces", key);
    }
  }
  return { version: FISCAL_IMPACT_GRAPH_VERSION, nodes: [...nodes.values()], edges: [...edges.values()] };
}

function walkCentValues(value: unknown, path: string, output: Record<string, number>) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkCentValues(item, `${path}[${index}]`, output));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (/cents$/i.test(key) && Number.isSafeInteger(item)) output[nextPath] = item as number;
    else walkCentValues(item, nextPath, output);
  }
}

export function extractFiscalCentLedger(snapshot: unknown) {
  const output: Record<string, number> = {};
  walkCentValues(snapshot, "", output);
  return Object.fromEntries(Object.entries(output).sort(([left], [right]) => left.localeCompare(right)));
}

export function compareFiscalCentSnapshots(before: unknown, after: unknown) {
  const beforeLedger = extractFiscalCentLedger(before);
  const afterLedger = extractFiscalCentLedger(after);
  const paths = [...new Set([...Object.keys(beforeLedger), ...Object.keys(afterLedger)])].sort();
  const changes = paths.flatMap((path) => {
    const beforeCents = beforeLedger[path] ?? null;
    const afterCents = afterLedger[path] ?? null;
    return beforeCents === afterCents ? [] : [{ path, beforeCents, afterCents, deltaCents: beforeCents === null || afterCents === null ? null : afterCents - beforeCents }];
  });
  return { moneyUnit: "cent" as const, before: beforeLedger, after: afterLedger, changes, changed: changes.length > 0 };
}

export function assessReexecutionClaim(input: { expectedJobStatus: string; lockTokenMatches: boolean; afterHashMatches: boolean; ruleVersionChanged: boolean }) {
  const blockers: string[] = [];
  if (input.expectedJobStatus !== "processing") blockers.push("job_not_processing");
  if (!input.lockTokenMatches) blockers.push("concurrent_worker_lost_lock");
  if (!input.afterHashMatches) blockers.push("after_snapshot_hash_mismatch");
  if (!input.ruleVersionChanged) blockers.push("rule_version_not_changed");
  return { allowed: blockers.length === 0, blockers };
}

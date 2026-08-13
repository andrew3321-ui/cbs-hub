import type { WorkspaceAuthorizationRole } from "./workspace-authorization";

export const reportStatuses = ["draft", "ready_for_review", "changes_requested", "approved"] as const;
export const reportArtifactTypes = ["document", "dossier", "tax_period", "rule_set", "scenario"] as const;
export type ReportStatus = typeof reportStatuses[number];
export type ReportArtifactType = typeof reportArtifactTypes[number];

export function isReportPeriod(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 2020 && year <= 2100;
}

export function isReportArtifactType(value: unknown): value is ReportArtifactType {
  return typeof value === "string" && reportArtifactTypes.includes(value as ReportArtifactType);
}

export function reportPermissions(role: WorkspaceAuthorizationRole, createdByUserId: number, actorUserId: number) {
  const manages = role === "owner" || role === "admin";
  return {
    canCreate: manages || role === "preparer",
    canEdit: manages || (role === "preparer" && createdByUserId === actorUserId),
    canReview: manages || role === "reviewer",
  };
}

export function normalizePendingItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((item, index) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: typeof row.id === "string" && row.id ? row.id.slice(0, 80) : `pending-${index + 1}`,
      text: typeof row.text === "string" ? row.text.trim().slice(0, 300) : "",
      resolved: row.resolved === true,
    };
  }).filter((item) => item.text.length > 0);
}

export function normalizeIndicators(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 30).map(([key, item]) => [
    key.trim().slice(0, 60),
    typeof item === "number" && Number.isFinite(item) ? item : String(item ?? "").trim().slice(0, 160),
  ]).filter(([key]) => Boolean(key)));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  return value;
}

export function canonicalReportSnapshot(value: Record<string, unknown>) {
  return JSON.stringify(canonicalize(value));
}

export function reportReviewReadiness(input: { conclusion: string; snapshotHash: string | null; pendingItems: Array<{ resolved?: boolean }> }) {
  const blockers: string[] = [];
  if (!input.snapshotHash) blockers.push("snapshot_missing");
  if (input.conclusion.trim().length < 10) blockers.push("conclusion_incomplete");
  if (input.pendingItems.some((item) => item.resolved !== true)) blockers.push("pending_items_open");
  return { ready: blockers.length === 0, blockers };
}

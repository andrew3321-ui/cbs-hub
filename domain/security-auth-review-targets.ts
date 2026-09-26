import { parseAuthReviewPath } from "./security-auth-review-policy.ts";
import type { AttackSurfaceRoute } from "./repository-attack-surface.ts";

export type AuthReviewCandidate = { path: string; repositoryId: string; repositoryName: string; sourceFile: string; priority: "high" | "medium" | "low" };

function isCandidateRoute(value: unknown): value is AttackSurfaceRoute {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const route = value as Record<string, unknown>;
  if (route.method !== "GET" || typeof route.route !== "string" || typeof route.sourceFile !== "string"
    || !["high", "medium", "low"].includes(String(route.priority))
    || route.route.includes(":") || route.route.includes("*")) return false;
  try { parseAuthReviewPath(route.route); return true; } catch { return false; }
}

export function selectAuthReviewCandidates(input: { repositoryId: string; repositoryName: string; coverageJson: string }[], limit = 12): AuthReviewCandidate[] {
  const candidates: AuthReviewCandidate[] = [];
  const seen = new Set<string>();
  for (const repository of input) {
    if (!/^srp_[0-9a-f-]{36}$/i.test(repository.repositoryId)) continue;
    let coverage: unknown;
    try { coverage = JSON.parse(repository.coverageJson); } catch { continue; }
    if (!coverage || typeof coverage !== "object" || Array.isArray(coverage)) continue;
    const attackSurface = (coverage as Record<string, unknown>).attackSurface;
    if (!attackSurface || typeof attackSurface !== "object" || Array.isArray(attackSurface)) continue;
    const routes = (attackSurface as Record<string, unknown>).routes;
    if (!Array.isArray(routes)) continue;
    for (const route of routes) {
      if (!isCandidateRoute(route) || seen.has(`${repository.repositoryId}:${route.route}`)) continue;
      seen.add(`${repository.repositoryId}:${route.route}`);
      candidates.push({ path: route.route, repositoryId: repository.repositoryId, repositoryName: repository.repositoryName.slice(0, 120), sourceFile: route.sourceFile.slice(0, 240), priority: route.priority });
    }
  }
  return candidates.sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.priority] - ({ high: 0, medium: 1, low: 2 })[b.priority]).slice(0, Math.max(0, Math.min(24, limit)));
}

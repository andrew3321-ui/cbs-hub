import { parseAuthContractId } from "./security-auth-contracts.ts";
import { parseAuthReviewPath } from "./security-auth-review-policy.ts";
import { discoverWebRoutes, isWebRouteFile } from "./repository-attack-surface.ts";

export const AUTH_CODE_MAP_VERSION = "authorization-code-map.1";
export const AUTH_CODE_MAP_LIMITS = { sourceFiles: 4, sourceBytes: 40_000, treeEntries: 10_000, directImports: 24, referencesPerFile: 12, mappingsPerDay: 10, importDepth: 1, deadlineMs: 60_000 } as const;
export type CodeTreeEntry = { path: string; type: string; mode: string; size: number; sha: string };
export type CodeRouteCandidate = { sourceFile: string; routePattern: string; line: number };
export type CodeReference = { category: "authentication" | "authorization" | "tenant_or_owner"; line: number };
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const extensions = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"];

export function isCodeMapPath(path: unknown): path is string {
  return typeof path === "string" && path.length > 0 && path.length <= 240 && /^[A-Za-z0-9_@()[\]./-]+$/.test(path)
    && !path.startsWith("/") && !path.split("/").some((part) => !part || part === "." || part === ".."
      || /^(?:node_modules|vendor|dist|build|\.git|\.next|fixtures|coverage)$/i.test(part)) && extensions.some((extension) => path.endsWith(extension));
}

export function parseAuthCodeMapInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AUTH_CODE_MAP_INPUT_INVALID");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 5 || input.relationshipConfirmed !== true || typeof input.repositoryId !== "string" || !new RegExp(`^srp_${uuid}$`, "i").test(input.repositoryId)
    || typeof input.sourceJobId !== "string" || !new RegExp(`^srj_${uuid}$`, "i").test(input.sourceJobId) || !isCodeMapPath(input.sourceFile) || !isWebRouteFile(input.sourceFile)) throw new Error("AUTH_CODE_MAP_INPUT_INVALID");
  return { contractId: parseAuthContractId(input.contractId), repositoryId: input.repositoryId, sourceJobId: input.sourceJobId, sourceFile: input.sourceFile };
}

export function codeRouteMatches(pattern: unknown, path: string) {
  parseAuthReviewPath(path);
  if (typeof pattern !== "string" || pattern.length > 200 || !/^\/(?:[A-Za-z0-9._~-]+|:[A-Za-z0-9_-]+)(?:\/(?:[A-Za-z0-9._~-]+|:[A-Za-z0-9_-]+))*\/?$/.test(pattern)) return false;
  const route = pattern.replace(/\/$/, "").split("/");
  const target = path.replace(/\/$/, "").split("/");
  return route.length === target.length && route.every((part, index) => part.startsWith(":") ? Boolean(target[index]) : part === target[index]);
}

export function selectCodeRouteCandidates(coverageJson: string, path: string): CodeRouteCandidate[] {
  parseAuthReviewPath(path);
  if (coverageJson.length > 200_000) return [];
  let coverage;
  try { coverage = JSON.parse(coverageJson); } catch { return []; }
  const routes: unknown = coverage?.attackSurface?.routes;
  if (!Array.isArray(routes)) return [];
  const selected = new Map<string, CodeRouteCandidate>();
  for (const value of routes.slice(0, 60)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const route = value as Record<string, unknown>;
    if (route.method !== "GET" || !isCodeMapPath(route.sourceFile) || !isWebRouteFile(route.sourceFile) || !codeRouteMatches(route.route, path)
      || !Number.isSafeInteger(route.line) || Number(route.line) < 1 || Number(route.line) > 20_000) continue;
    selected.set(route.sourceFile, { sourceFile: route.sourceFile, routePattern: String(route.route), line: Number(route.line) });
  }
  return [...selected.values()].slice(0, 8);
}

type Token = { kind: "word" | "string" | "symbol"; value: string; line: number };
// Conservative lexical inventory, not an AST, call graph or semantic authorization proof.
function lex(source: string) {
  const tokens: Token[] = [];
  const masked = source.split("");
  let index = 0, line = 1;
  const skip = (end: number) => { while (index < end) { if (source[index] === "\n") line++; else masked[index] = " "; index++; } };
  while (index < source.length) {
    const character = source[index];
    if (character === "\n") { line++; index++; continue; }
    if (/\s/.test(character)) { index++; continue; }
    if (source.startsWith("//", index)) { const end = source.indexOf("\n", index); skip(end === -1 ? source.length : end); continue; }
    if (source.startsWith("/*", index)) { const end = source.indexOf("*/", index + 2); skip(end === -1 ? source.length : end + 2); continue; }
    if (["'", '"', "`"].includes(character)) {
      const start = index, startLine = line;
      let end = index + 1;
      while (end < source.length) { if (source[end] === "\\") { end += 2; continue; } if (source[end++] === character) break; }
      if (character !== "`") tokens.push({ kind: "string", value: source.slice(start + 1, end - 1), line: startLine });
      skip(Math.min(end, source.length)); continue;
    }
    if (/[A-Za-z_$]/.test(character)) {
      const start = index++;
      while (index < source.length && /[A-Za-z0-9_$]/.test(source[index])) index++;
      tokens.push({ kind: "word", value: source.slice(start, index), line });
    } else { tokens.push({ kind: "symbol", value: character, line }); index++; }
  }
  return { tokens, masked: masked.join("") };
}

const referenceWords: Record<CodeReference["category"], readonly string[]> = {
  authentication: ["getCurrentUser", "requireAuth", "authenticate", "verifyToken", "getSession", "auth"],
  authorization: ["canManageWorkspace", "requireRole", "hasPermission", "authorize", "checkPermission", "canAccess", "assertOwner"],
  tenant_or_owner: ["workspaceId", "workspace_id", "tenantId", "tenant_id", "organizationId", "orgId", "accountId", "ownerId", "userId"],
};

export function inspectAuthCodeSource(path: string, source: string) {
  if (!isCodeMapPath(path) || new TextEncoder().encode(source).byteLength > AUTH_CODE_MAP_LIMITS.sourceBytes || source.includes("\0")) throw new Error("AUTH_CODE_MAP_SOURCE_INVALID");
  const { tokens, masked } = lex(source);
  const references: CodeReference[] = [];
  const imports: { specifier: string; line: number }[] = [];
  let unsupportedImports = 0, skippedImports = 0;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.kind !== "word") continue;
    for (const [category, words] of Object.entries(referenceWords)) {
      if (words.includes(token.value) && references.length < AUTH_CODE_MAP_LIMITS.referencesPerFile
        && !references.some((reference) => reference.category === category && reference.line === token.line)) references.push({ category: category as CodeReference["category"], line: token.line });
    }
    if (!["import", "export"].includes(token.value)) continue;
    if (tokens[index + 1]?.value === "(") { unsupportedImports++; continue; }
    if (token.value === "export" && !["{", "*", "type"].includes(tokens[index + 1]?.value)) continue;
    let literal: Token | undefined;
    if (token.value === "import" && tokens[index + 1]?.kind === "string") literal = tokens[index + 1];
    else for (let cursor = index + 1; cursor < Math.min(index + 80, tokens.length); cursor++) {
      if (tokens[cursor].value === ";" || ["import", "export"].includes(tokens[cursor].value) || tokens[cursor].line > token.line + 8) break;
      if (tokens[cursor].value === "from" && tokens[cursor + 1]?.kind === "string") { literal = tokens[cursor + 1]; break; }
    }
    if (literal) {
      if (imports.length < AUTH_CODE_MAP_LIMITS.directImports) imports.push({ specifier: literal.value, line: token.line });
      else skippedImports++;
    }
  }
  return { references, imports, unsupportedImports, skippedImports, declarations: discoverWebRoutes(path, masked) };
}

export function eligibleCodeTree(input: unknown, truncated: unknown): CodeTreeEntry[] {
  if (truncated !== false || !Array.isArray(input) || input.length > AUTH_CODE_MAP_LIMITS.treeEntries) throw new Error("AUTH_CODE_MAP_TREE_INCOMPLETE");
  const entries = input.filter((entry): entry is CodeTreeEntry => Boolean(entry && typeof entry === "object" && entry.type === "blob"
    && ["100644", "100755"].includes(entry.mode) && isCodeMapPath(entry.path) && Number.isSafeInteger(entry.size) && entry.size >= 0
    && entry.size <= AUTH_CODE_MAP_LIMITS.sourceBytes && typeof entry.sha === "string" && /^[0-9a-f]{40}$/.test(entry.sha)));
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length) throw new Error("AUTH_CODE_MAP_TREE_INVALID");
  return entries;
}

export function resolveCodeImport(fromPath: string, specifier: string, entries: CodeTreeEntry[]) {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) return null;
  if (specifier.length > 240 || !/^[A-Za-z0-9_@()[\]./-]+$/.test(specifier)) return null;
  const parts = fromPath.split("/").slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (segment === ".") continue;
    if (segment === "..") { if (!parts.length) return null; parts.pop(); }
    else { if (!segment) return null; parts.push(segment); }
  }
  const base = parts.join("/");
  const exact = entries.filter((entry) => entry.path === base);
  if (exact.length === 1) return exact[0];
  const candidates = entries.filter((entry) => extensions.some((extension) => entry.path === `${base}${extension}` || entry.path === `${base}/index${extension}`));
  return candidates.length === 1 ? candidates[0] : null;
}

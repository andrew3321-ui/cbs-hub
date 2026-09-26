import { digest, github, installationToken, repoPath, type GitHubEnv, type Fetcher } from "./github-client.ts";
import { repositoryFor } from "./github-repository-service.ts";
import { authContractSpecHash, parseAuthContractId } from "../domain/security-auth-contracts.ts";
import { AUTH_CODE_MAP_LIMITS, AUTH_CODE_MAP_VERSION, eligibleCodeTree, inspectAuthCodeSource, parseAuthCodeMapInput, resolveCodeImport, selectCodeRouteCandidates, type CodeTreeEntry } from "../domain/security-auth-code-map.ts";
import type { AuthContractRow } from "./security-auth-contracts.ts";

export type MapRow = { id: string; contract_id: string; repository_id: string; source_job_id: string; source_file: string; route_pattern: string; commit_sha: string; policy_version: string;
  spec_sha256: string; status: string; result_json: string; evidence_sha256: string | null; error_code: string | null; created_at: string; completed_at: string | null };
type JobRow = { id: string; repository_id: string; repository_name: string; commit_sha: string; coverage_json: string };

async function contractFor(DB: D1Database, workspaceId: number, contractId: string, requireCurrent = false): Promise<AuthContractRow> {
  parseAuthContractId(contractId);
  const row = await DB.prepare(`SELECT c.* FROM security_auth_contracts c JOIN security_agent_scopes s ON s.id = c.scope_id AND s.workspace_id = c.workspace_id
    WHERE c.id = ? AND c.workspace_id = ? ${requireCurrent ? "AND s.status = 'verified' AND julianday(s.authorization_expires_at) > julianday('now')" : ""}`)
    .bind(contractId, workspaceId).first<AuthContractRow>();
  if (!row || row.spec_sha256 !== await authContractSpecHash({ scopeId: row.scope_id, path: row.path, reviewMode: row.review_mode, markerSha256: row.marker_sha256 })) throw new Error("AUTH_CODE_MAP_CONTRACT_INVALID");
  return row;
}

async function latestJobs(DB: D1Database, workspaceId: number): Promise<JobRow[]> {
  const rows = await DB.prepare(`SELECT j.id, r.id repository_id, r.full_name repository_name, j.commit_sha, j.coverage_json
    FROM security_repositories r JOIN github_connections g ON g.id = r.connection_id AND g.workspace_id = r.workspace_id
    JOIN security_repository_jobs j ON j.id = (SELECT j2.id FROM security_repository_jobs j2 WHERE j2.repository_id = r.id AND j2.workspace_id = r.workspace_id
      AND j2.status = 'completed' ORDER BY j2.completed_at DESC, j2.id DESC LIMIT 1)
    WHERE r.workspace_id = ? AND r.enabled = 1 AND g.status = 'active' AND julianday(r.authorized_until) > julianday('now')
    ORDER BY j.completed_at DESC LIMIT 20`).bind(workspaceId).all<JobRow>();
  return rows.results.filter((row: JobRow) => /^[0-9a-f]{40}$/.test(row.commit_sha ?? ""));
}

export function publicAuthCodeMap(row: MapRow) {
  let result: unknown = null;
  if (row.status === "completed") { try { result = JSON.parse(row.result_json); } catch { /* No fabricated graph. */ } }
  return { id: row.id, contractId: row.contract_id, repositoryId: row.repository_id, sourceJobId: row.source_job_id, sourceFile: row.source_file,
    routePattern: row.route_pattern, commitSha: row.commit_sha, specSha256: row.spec_sha256, status: row.status, result, evidenceSha256: row.evidence_sha256,
    errorCode: row.error_code, createdAt: row.created_at, completedAt: row.completed_at, deploymentVerified: false };
}

export async function authCodeMapCatalog(DB: D1Database, workspaceId: number, contractId: string) {
  const contract = await contractFor(DB, workspaceId, contractId);
  const jobs = await latestJobs(DB, workspaceId);
  const rows = await DB.prepare("SELECT * FROM security_auth_code_maps WHERE workspace_id = ? AND contract_id = ? ORDER BY created_at DESC, id DESC LIMIT 20").bind(workspaceId, contractId).all<MapRow>();
  return { candidates: jobs.flatMap((job) => selectCodeRouteCandidates(job.coverage_json, contract.path).map((candidate) => ({ ...candidate, repositoryId: job.repository_id,
    repositoryName: job.repository_name, sourceJobId: job.id, commitSha: job.commit_sha }))),
    mappings: rows.results.map((row: MapRow) => ({ ...publicAuthCodeMap(row), scanState: !jobs.some((job) => job.repository_id === row.repository_id) ? "authorization_or_scan_unavailable"
      : jobs.some((job) => job.repository_id === row.repository_id && job.commit_sha === row.commit_sha) ? "matches_latest_scan" : "newer_scan_available" })) };
}

async function readCodeBlob(token: string, base: string, entry: CodeTreeEntry, fetcher: Fetcher) {
  const blob = await github<{ sha: string; encoding: string; size: number; content: string }>(`${base}/git/blobs/${entry.sha}`, token, {}, fetcher);
  if (blob.sha !== entry.sha || blob.encoding !== "base64" || blob.size !== entry.size || typeof blob.content !== "string"
    || blob.content.length > Math.ceil(AUTH_CODE_MAP_LIMITS.sourceBytes / 3) * 4 + 2_000) throw new Error("AUTH_CODE_MAP_SOURCE_INVALID");
  const bytes = Buffer.from(blob.content, "base64");
  if (bytes.byteLength !== entry.size || bytes.byteLength > AUTH_CODE_MAP_LIMITS.sourceBytes) throw new Error("AUTH_CODE_MAP_SOURCE_INVALID");
  const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
  const gitObject = new Uint8Array(header.byteLength + bytes.byteLength); gitObject.set(header); gitObject.set(bytes, header.byteLength);
  const actualSha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", gitObject)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actualSha !== entry.sha) throw new Error("AUTH_CODE_MAP_BLOB_MISMATCH");
  let source: string;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new Error("AUTH_CODE_MAP_SOURCE_INVALID"); }
  return { source, sourceSha256: await digest(source) };
}

export async function mapAuthContractCode(env: GitHubEnv, workspaceId: number, actorId: number, rawInput: unknown, fetcher: Fetcher = fetch) {
  const input = parseAuthCodeMapInput(rawInput);
  const contract = await contractFor(env.DB, workspaceId, input.contractId, true);
  const repo = await repositoryFor(env, workspaceId, input.repositoryId);
  if (!repo.enabled) throw new Error("GITHUB_REPOSITORY_DISABLED");
  const job = (await latestJobs(env.DB, workspaceId)).find((row) => row.id === input.sourceJobId && row.repository_id === repo.id);
  const candidate = job ? selectCodeRouteCandidates(job.coverage_json, contract.path).find((route) => route.sourceFile === input.sourceFile) : null;
  if (!job || !candidate) throw new Error("AUTH_CODE_MAP_RESCAN_REQUIRED");
  const lookup = () => env.DB.prepare("SELECT * FROM security_auth_code_maps WHERE workspace_id = ? AND contract_id = ? AND repository_id = ? AND commit_sha = ? AND source_file = ? AND policy_version = ? AND status IN ('pending','completed')")
    .bind(workspaceId, contract.id, repo.id, job.commit_sha, input.sourceFile, AUTH_CODE_MAP_VERSION).first<MapRow>();
  // Reconcile an interrupted read on a new explicit request; never auto-run it.
  await env.DB.prepare("UPDATE security_auth_code_maps SET status = 'failed', error_code = 'AUTH_CODE_MAP_INTERRUPTED', completed_at = ? WHERE workspace_id = ? AND status = 'pending' AND created_at < ?")
    .bind(new Date().toISOString(), workspaceId, new Date(Date.now() - 600_000).toISOString()).run();
  const cached = await lookup();
  if (cached) return { ...publicAuthCodeMap(cached), cached: true };
  const id = `scm_${crypto.randomUUID()}`, now = new Date().toISOString();
  const reserved = await env.DB.prepare(`INSERT INTO security_auth_code_maps (id, workspace_id, contract_id, repository_id, source_job_id, source_file, route_pattern, commit_sha, spec_sha256, policy_version, created_by_user_id, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM security_auth_code_maps WHERE workspace_id = ? AND created_at > ?) < ?
    ON CONFLICT DO NOTHING`).bind(id, workspaceId, contract.id, repo.id, job.id, input.sourceFile, candidate.routePattern, job.commit_sha, contract.spec_sha256, AUTH_CODE_MAP_VERSION, actorId, now,
      workspaceId, new Date(Date.now() - 86_400_000).toISOString(), AUTH_CODE_MAP_LIMITS.mappingsPerDay).run();
  if (Number(reserved.meta.changes) !== 1) { const raced = await lookup(); if (raced) return { ...publicAuthCodeMap(raced), cached: true }; throw new Error("AUTH_CODE_MAP_DAILY_LIMIT"); }
  try {
    const startedAt = Date.now();
    const checkDeadline = () => { if (Date.now() - startedAt >= AUTH_CODE_MAP_LIMITS.deadlineMs) throw new Error("AUTH_CODE_MAP_DEADLINE"); };
    const checkedFetch: Fetcher = async (request, init) => {
      checkDeadline();
      await contractFor(env.DB, workspaceId, contract.id, true);
      const current = await repositoryFor(env, workspaceId, repo.id);
      if (!current.enabled || current.installation_id !== repo.installation_id || current.github_id !== repo.github_id || current.full_name !== repo.full_name) throw new Error("GITHUB_REPOSITORY_DISABLED");
      return fetcher(request, init);
    };
    const token = await installationToken(env, repo.installation_id, repo.github_id, false, checkedFetch);
    const base = repoPath(repo.full_name);
    const commit = await github<{ sha: string; commit: { tree: { sha: string } } }>(`${base}/commits/${job.commit_sha}`, token, {}, checkedFetch);
    if (commit.sha !== job.commit_sha || !/^[0-9a-f]{40}$/.test(commit.commit?.tree?.sha ?? "")) throw new Error("AUTH_CODE_MAP_COMMIT_INVALID");
    const tree = await github<{ tree: unknown; truncated: boolean }>(`${base}/git/trees/${commit.commit.tree.sha}?recursive=1`, token, {}, checkedFetch);
    const entries = eligibleCodeTree(tree.tree, tree.truncated);
    const root = entries.find((entry) => entry.path === input.sourceFile);
    if (!root) throw new Error("AUTH_CODE_MAP_SOURCE_INVALID");
    const rootBlob = await readCodeBlob(token, base, root, checkedFetch);
    const rootInspection = inspectAuthCodeSource(root.path, rootBlob.source);
    const declaration = rootInspection.declarations.find((route) => route.method === "GET" && route.route === candidate.routePattern);
    if (!declaration) throw new Error("AUTH_CODE_MAP_ROUTE_MISMATCH");
    const files = [{ path: root.path, role: "route", blobSha: root.sha, sourceSha256: rootBlob.sourceSha256, references: rootInspection.references }];
    const edges: { from: string; to: string; line: number }[] = [];
    let unresolvedImports = rootInspection.unsupportedImports, skippedByBudget = rootInspection.skippedImports;
    for (const imported of rootInspection.imports) {
      const target = resolveCodeImport(root.path, imported.specifier, entries);
      if (!target) { unresolvedImports++; continue; }
      if (!files.some((file) => file.path === target.path)) {
        if (files.length >= AUTH_CODE_MAP_LIMITS.sourceFiles) { skippedByBudget++; continue; }
        const blob = await readCodeBlob(token, base, target, checkedFetch);
        const inspection = inspectAuthCodeSource(target.path, blob.source);
        files.push({ path: target.path, role: "direct_import", blobSha: target.sha, sourceSha256: blob.sourceSha256, references: inspection.references });
      }
      if (edges.length < 12 && !edges.some((edge) => edge.to === target.path && edge.line === imported.line)) edges.push({ from: root.path, to: target.path, line: imported.line });
    }
    const result = { version: AUTH_CODE_MAP_VERSION, repositoryName: repo.full_name, commitSha: job.commit_sha, specSha256: contract.spec_sha256,
      route: { path: contract.path, pattern: declaration.route, method: "GET", sourceFile: root.path, line: declaration.line }, files, edges,
      coverage: { sourceFilesRead: files.length, sourceFileLimit: AUTH_CODE_MAP_LIMITS.sourceFiles, directImportsFound: rootInspection.imports.length + rootInspection.skippedImports,
        unresolvedImports, skippedByBudget, importDepth: 1, modelCalls: 0 }, deploymentVerified: false,
      limitation: "Inventário lexical de uma rota e imports diretos no commit do scan. Referências não comprovam controle de acesso, fluxo de dados ou versão implantada; aliases e dependências transitivas não são resolvidos." };
    const json = JSON.stringify(result), evidenceSha256 = await digest(json);
    checkDeadline();
    if (json.length > 18_000) throw new Error("AUTH_CODE_MAP_RESULT_TOO_LARGE");
    const persisted = await env.DB.prepare("UPDATE security_auth_code_maps SET status = 'completed', result_json = ?, evidence_sha256 = ?, completed_at = ? WHERE id = ? AND status = 'pending'")
      .bind(json, evidenceSha256, new Date().toISOString(), id).run();
    if (Number(persisted.meta.changes) !== 1) throw new Error("AUTH_CODE_MAP_INTERRUPTED");
    return { ...publicAuthCodeMap((await lookup())!), cached: false };
  } catch (error) {
    const code = error instanceof Error && /^(?:GITHUB|AUTH_CODE_MAP)_[A-Z0-9_]+$/.test(error.message) ? error.message : "AUTH_CODE_MAP_FAILED";
    await env.DB.prepare("UPDATE security_auth_code_maps SET status = 'failed', error_code = ?, completed_at = ? WHERE id = ? AND status = 'pending'").bind(code, new Date().toISOString(), id).run();
    throw new Error(code);
  }
}

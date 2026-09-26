import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { codeRouteMatches, eligibleCodeTree, inspectAuthCodeSource, parseAuthCodeMapInput, resolveCodeImport, selectCodeRouteCandidates } from "../domain/security-auth-code-map.ts";
import { authCodeMapCatalog, mapAuthContractCode } from "../app/security-auth-code-map.ts";
import { authContractProofPack, createAuthContract } from "../app/security-auth-contracts.ts";

const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const configured = { GITHUB_APP_ID: "12", GITHUB_APP_PRIVATE_KEY: pair.privateKey.export({ type: "pkcs8", format: "pem" }) };
const sha = "a".repeat(40), treeSha = "b".repeat(40);
const path = "app/api/reports/[id]/route.ts";
const route = "/api/reports/:id";
const privateLiteral = "SYNTHETIC-NOT-A-REAL-CREDENTIAL-do-not-export";
const root = `import { getCurrentUser, canAccess } from "../../../auth";
// getSession tenantId: comment, not evidence
const secret = "${privateLiteral}";
export async function GET() {
  const user = await getCurrentUser();
  if (!canAccess(user.workspaceId)) return new Response(null, { status: 403 });
  return Response.json({ ok: true });
}`;
const helper = `export function getCurrentUser() { return { workspaceId: 42 }; }
export function canAccess(workspaceId) { return Boolean(workspaceId); }`;
const blob = (filePath, source, mode = "100644") => ({ path: filePath, type: "blob", mode, size: Buffer.byteLength(source),
  sha: createHash("sha1").update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest("hex"), source });

async function fixture(sources = [blob(path, root), blob("app/auth.ts", helper)]) {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0054_security_findings_workflow.sql", "0063_github_repository_security.sql", "0068_authenticated_access_review.sql", "0069_auth_review_agent_pipeline.sql", "0070_auth_review_modes.sql", "0071_authorization_contracts.sql", "0072_authorization_code_maps.sql", "0073_authorization_regression_drafts.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const stmt = sqlite.prepare(sql); const bound = values => ({ first: async () => stmt.get(...values) ?? null,
    all: async () => ({ results: stmt.all(...values) }), run: async () => ({ meta: { changes: Number(stmt.run(...values).changes) } }) }); return { ...bound([]), bind: (...values) => bound(values) }; } };
  const scopeId = `sas_${crypto.randomUUID()}`, repositoryId = `srp_${crypto.randomUUID()}`, sourceJobId = `srj_${crypto.randomUUID()}`, baseline = `sarv_${crypto.randomUUID()}`;
  const now = new Date().toISOString(), until = new Date(Date.now() + 86_400_000).toISOString();
  sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_expires_at) VALUES (?, 42, 'example.com', 'verified', 'synthetic', 1, ?)").run(scopeId, until);
  sqlite.prepare("INSERT INTO security_auth_reviews (id, workspace_id, scope_id, actor_user_id, path, bucket_start, status, marker_sha256, review_mode) VALUES (?, 42, ?, 1, '/api/reports/synthetic-one', 'synthetic', 'running', ?, 'horizontal')").run(baseline, scopeId, "c".repeat(64));
  sqlite.prepare("UPDATE security_auth_reviews SET status = 'completed', anonymous_status = 403, limited_status = 403, privileged_status = 200, anonymous_marker_observed = 0, limited_marker_observed = 0, privileged_marker_observed = 1, verdict = 'access_restricted' WHERE id = ?").run(baseline);
  const contract = await createAuthContract(DB, 42, 1, { title: "Synthetic isolation", baselineReviewId: baseline });
  sqlite.prepare("INSERT INTO github_connections VALUES ('connection',42,123,'acme','active',1,?,?)").run(now, now);
  sqlite.prepare("INSERT INTO security_repositories (id,workspace_id,connection_id,github_id,full_name,default_branch,enabled,authorized_until,created_at,updated_at) VALUES (?,42,'connection',987,'acme/portal','main',1,?,?,?)").run(repositoryId, until, now, now);
  const coverage = JSON.stringify({ attackSurface: { routes: [{ route, method: "GET", sourceFile: path, line: 4 }] } });
  const addJob = (id = sourceJobId, commit = sha, time = now) => sqlite.prepare("INSERT INTO security_repository_jobs (id,workspace_id,repository_id,commit_sha,status,trigger_kind,coverage_json,created_at,completed_at) VALUES (?,42,?,?,'completed','manual',?,?,?)").run(id, repositoryId, commit, coverage, time, time);
  addJob();
  const calls = [], input = { contractId: contract.id, repositoryId, sourceJobId, sourceFile: path, relationshipConfirmed: true }, env = { ...configured, DB };
  const fetcher = async (request, init = {}) => {
    const url = String(request); calls.push({ url, init });
    assert.equal(new URL(url).origin, "https://api.github.com");
    if (url.endsWith("/access_tokens")) {
      assert.deepEqual(JSON.parse(init.body), { repository_ids: [987], permissions: { contents: "read", metadata: "read" } });
      return Response.json({ token: "synthetic-read-token" });
    }
    assert.equal(init.method ?? "GET", "GET");
    if (url.endsWith(`/commits/${sha}`)) return Response.json({ sha, commit: { tree: { sha: treeSha } } });
    if (url.endsWith(`/git/trees/${treeSha}?recursive=1`)) return Response.json({ truncated: false, tree: sources.map(file => ({ path: file.path, type: file.type, mode: file.mode, size: file.size, sha: file.sha })) });
    const entry = sources.find(file => url.endsWith(`/git/blobs/${file.sha}`));
    if (entry) return Response.json({ sha: entry.sha, encoding: "base64", size: entry.size, content: Buffer.from(entry.source).toString("base64") });
    throw new Error("Unexpected test request");
  };
  return { sqlite, DB, env, input, fetcher, calls, contract, scopeId, addJob };
}

test("code mapping accepts exact and parameterized routes, never catchall or unrelated paths", () => {
  assert.equal(codeRouteMatches(route, "/api/reports/synthetic-one"), true);
  for (const pattern of ["/api/reports/*", "/api/reports/:id/edit", "/api/report/:id", "/api/reports/other"]) assert.equal(codeRouteMatches(pattern, "/api/reports/synthetic-one"), false);
  const routes = [{ route, method: "GET", sourceFile: path, line: 4 }, { route, method: "GET", sourceFile: "docs/openapi.json", line: 1 }, { route, method: "POST", sourceFile: path, line: 5 }];
  assert.deepEqual(selectCodeRouteCandidates(JSON.stringify({ attackSurface: { routes } }), "/api/reports/synthetic-one"), [{ sourceFile: path, routePattern: route, line: 4 }]);
  assert.deepEqual(selectCodeRouteCandidates("null", "/api/reports/synthetic-one"), []);
});

test("strict mapping input requires explicit relationship and rejects extra fields and arbitrary files", () => {
  const input = { contractId: `sac_${crypto.randomUUID()}`, repositoryId: `srp_${crypto.randomUUID()}`, sourceJobId: `srj_${crypto.randomUUID()}`, sourceFile: path, relationshipConfirmed: true };
  assert.equal(parseAuthCodeMapInput(input).sourceFile, path);
  for (const change of [{ relationshipConfirmed: false }, { sourceFile: "../auth.ts" }, { sourceFile: "docs/openapi.json" }, { repositoryId: "srp_fake" }, { tokens: "never" }]) assert.throws(() => parseAuthCodeMapInput({ ...input, ...change }));
});

test("lexical map excludes comments and literals, caps references and ignores dynamic imports", () => {
  const inspected = inspectAuthCodeSource(path, root + '\nconst ignored = import("../../../dynamic");');
  assert.deepEqual(inspected.imports, [{ specifier: "../../../auth", line: 1 }]);
  assert.equal(inspected.unsupportedImports, 1);
  assert.equal(inspected.references.some(ref => ref.line === 2 || ref.line === 3), false);
  assert.equal(JSON.stringify(inspected).includes(privateLiteral), false);
  assert.equal(inspectAuthCodeSource(path, '/* export function GET() {} */\nconst template = `getSession workspaceId`').declarations[0].method, "UNKNOWN");
  assert.ok(inspectAuthCodeSource(path, root + "\n" + Array.from({ length: 30 }, () => "getCurrentUser(workspaceId);").join("\n")).references.length <= 12);
  assert.throws(() => inspectAuthCodeSource(path, "x".repeat(40_001)));
  const excessive = inspectAuthCodeSource(path, Array.from({ length: 40 }, () => 'import x from "./helper";').join("\n"));
  assert.equal(excessive.imports.length, 24); assert.equal(excessive.skippedImports, 16);
});

test("import resolution rejects ambiguous sources, symlinks, aliases and escaping the repository", () => {
  const files = eligibleCodeTree([blob("app/auth.ts", helper), blob("app/auth.js", helper), blob("app/link.ts", helper, "120000"), blob("node_modules/a.ts", helper)], false);
  assert.equal(files.length, 2);
  assert.equal(resolveCodeImport(path, "../../../auth", files), null);
  assert.equal(resolveCodeImport(path, "../../../auth.ts", files).path, "app/auth.ts");
  for (const specifier of ["@/auth", "../../../../../auth", "../../../link", "../../../auth?raw"]) assert.equal(resolveCodeImport(path, specifier, files), null);
  assert.throws(() => eligibleCodeTree(files, true), /TREE_INCOMPLETE/);
  assert.throws(() => eligibleCodeTree([...files, files[0]], false), /TREE_INVALID/);
});

test("authorized immutable commit produces metadata-only map and cache without additional model or GitHub calls", async () => {
  const f = await fixture();
  try {
    const result = await mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher);
    assert.equal(result.status, "completed"); assert.equal(result.commitSha, sha); assert.equal(result.deploymentVerified, false);
    assert.equal(result.result.coverage.modelCalls, 0); assert.equal(result.result.files.length, 2);
    assert.ok(result.result.files[1].references.some(ref => ref.category === "authorization"));
    assert.equal(f.calls.length, 5);
    const serialized = JSON.stringify(result);
    for (const secret of [privateLiteral, root, helper, "synthetic-read-token", "c".repeat(64)]) assert.equal(serialized.includes(secret), false);
    const repeat = await mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher);
    assert.equal(repeat.id, result.id); assert.equal(repeat.cached, true); assert.equal(f.calls.length, 5);
    assert.equal((await authCodeMapCatalog(f.DB, 42, f.contract.id)).mappings[0].scanState, "matches_latest_scan");
    assert.equal((await authContractProofPack(f.DB, 42, f.contract.id)).codeMappings[0].id, result.id);
    assert.throws(() => f.sqlite.prepare("UPDATE security_auth_code_maps SET commit_sha = ? WHERE id = ?").run("d".repeat(40), result.id), /IMMUTABLE/);
    assert.throws(() => f.sqlite.prepare("UPDATE security_auth_code_maps SET result_json = '{}' WHERE id = ?").run(result.id), /IMMUTABLE/);
    f.sqlite.prepare("UPDATE security_auth_code_maps SET created_by_user_id = 0 WHERE id = ?").run(result.id);
  } finally { f.sqlite.close(); }
});

test("bounded import map never reads transitives or more than four source files", async () => {
  const source = Array.from({ length: 6 }, (_, index) => `import x${index} from "../../../helper${index}";`).join("\n") + "\nexport function GET() {}";
  const f = await fixture([blob(path, source), ...Array.from({ length: 6 }, (_, index) => blob(`app/helper${index}.ts`, 'import deeper from "./transitive"; export const canAccess = true;')), blob("app/transitive.ts", helper)]);
  try {
    const result = await mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher);
    assert.equal(result.result.files.length, 4); assert.equal(result.result.coverage.skippedByBudget, 3); assert.equal(f.calls.length, 7);
    assert.equal(result.result.files.some(file => file.path === "app/transitive.ts"), false);
  } finally { f.sqlite.close(); }
});

test("workspace, current scan and authorization are validated before any source reads", async () => {
  const f = await fixture();
  try {
    await assert.rejects(mapAuthContractCode(f.env, 43, 1, f.input, f.fetcher), /CONTRACT_INVALID/);
    await assert.rejects(authCodeMapCatalog(f.DB, 43, f.contract.id), /CONTRACT_INVALID/);
    f.addJob(`srj_${crypto.randomUUID()}`, "d".repeat(40), new Date(Date.now() + 1000).toISOString());
    await assert.rejects(mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher), /RESCAN_REQUIRED/);
    assert.equal(f.calls.length, 0);
  } finally { f.sqlite.close(); }
});

test("historical maps detect newer scans without claiming deployment or silently changing evidence", async () => {
  const f = await fixture();
  try {
    const first = await mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher);
    f.addJob(`srj_${crypto.randomUUID()}`, "d".repeat(40), new Date(Date.now() + 1000).toISOString());
    const catalog = await authCodeMapCatalog(f.DB, 42, f.contract.id);
    assert.equal(catalog.mappings[0].scanState, "newer_scan_available"); assert.equal(catalog.mappings[0].evidenceSha256, first.evidenceSha256);
    f.sqlite.prepare("UPDATE security_repositories SET enabled = 0 WHERE id = ?").run(f.input.repositoryId);
    assert.equal((await authCodeMapCatalog(f.DB, 42, f.contract.id)).mappings[0].scanState, "authorization_or_scan_unavailable");
  } finally { f.sqlite.close(); }
});

test("expired or revoked domain scope blocks mapping before any GitHub call", async () => {
  for (const mode of ["expired", "revoked"]) {
    const f = await fixture();
    try {
      if (mode === "expired") f.sqlite.prepare("UPDATE security_agent_scopes SET authorization_expires_at = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), f.scopeId);
      else f.sqlite.prepare("UPDATE security_agent_scopes SET status = 'pending' WHERE id = ?").run(f.scopeId);
      await assert.rejects(mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher), /CONTRACT_INVALID/);
      assert.equal(f.calls.length, 0);
    } finally { f.sqlite.close(); }
  }
});

test("installation identity changing during a read prevents access through the previous token", async () => {
  const f = await fixture();
  try {
    const fetcher = async (request, init) => {
      const response = await f.fetcher(request, init);
      if (String(request).endsWith("/access_tokens")) f.sqlite.prepare("UPDATE github_connections SET installation_id = 456 WHERE id = 'connection'").run();
      return response;
    };
    await assert.rejects(mapAuthContractCode(f.env, 42, 1, f.input, fetcher), /DISABLED/);
    assert.equal(f.calls.length, 1);
    assert.equal(f.sqlite.prepare("SELECT status FROM security_auth_code_maps").get().status, "failed");
  } finally { f.sqlite.close(); }
});

test("truncated tree, mismatching blobs and false route inventory fail without a fabricated map", async () => {
  for (const mode of ["tree", "blob", "route"]) {
    const f = await fixture(mode === "route" ? [blob(path, "export function POST() {}"), blob("app/auth.ts", helper)] : undefined);
    try {
      const fetcher = async (request, init) => {
        if (mode === "tree" && String(request).includes("/git/trees/")) return Response.json({ truncated: true, tree: [] });
        if (mode === "blob" && String(request).includes("/git/blobs/")) return Response.json({ sha: blob(path, root).sha, encoding: "base64", size: Buffer.byteLength(root), content: Buffer.from("x".repeat(Buffer.byteLength(root))).toString("base64") });
        return f.fetcher(request, init);
      };
      await assert.rejects(mapAuthContractCode(f.env, 42, 1, f.input, fetcher), /TREE_INCOMPLETE|BLOB_MISMATCH|ROUTE_MISMATCH/);
      const row = f.sqlite.prepare("SELECT * FROM security_auth_code_maps").get();
      assert.equal(row.status, "failed"); assert.equal(row.result_json, "{}"); assert.equal(row.evidence_sha256, null);
    } finally { f.sqlite.close(); }
  }
});

test("mid-read revocation blocks subsequent calls and completion guard prevents stale authorization", async () => {
  for (const revokeAt of ["tree", "last_blob"]) {
    const f = await fixture();
    try {
      const fetcher = async (request, init) => {
        const response = await f.fetcher(request, init);
        if (revokeAt === "tree" && String(request).includes("/git/trees/") || revokeAt === "last_blob" && String(request).endsWith(blob("app/auth.ts", helper).sha)) f.sqlite.prepare("UPDATE security_repositories SET enabled = 0 WHERE id = ?").run(f.input.repositoryId);
        return response;
      };
      await assert.rejects(mapAuthContractCode(f.env, 42, 1, f.input, fetcher), /DISABLED|AUTHORIZATION_INVALID/);
      const row = f.sqlite.prepare("SELECT * FROM security_auth_code_maps").get();
      assert.equal(row.status, "failed"); assert.equal(row.result_json, "{}");
      if (revokeAt === "tree") assert.equal(f.calls.length, 3);
    } finally { f.sqlite.close(); }
  }
});

test("concurrent identical requests reuse one reservation and one GitHub read sequence", async () => {
  const f = await fixture();
  try {
    const results = await Promise.all([mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher), mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher)]);
    assert.equal(results[0].id, results[1].id); assert.equal(f.calls.length, 5);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) total FROM security_auth_code_maps").get().total, 1);
  } finally { f.sqlite.close(); }
});

test("failed attempts count toward daily quota and interrupted pending reads can be retried explicitly", async () => {
  const f = await fixture();
  try {
    // Fail then simulate an interrupted reservation by copying its immutable binding.
    await assert.rejects(mapAuthContractCode(f.env, 42, 1, f.input, async () => { throw new Error("synthetic interruption"); }));
    const row = f.sqlite.prepare("SELECT * FROM security_auth_code_maps").get();
    const insert = f.sqlite.prepare("INSERT INTO security_auth_code_maps (id,workspace_id,contract_id,repository_id,source_job_id,source_file,route_pattern,commit_sha,spec_sha256,status,created_by_user_id,created_at) VALUES (?,42,?,?,?,?,?,?,?,'pending',1,?)");
    insert.run(`scm_${crypto.randomUUID()}`, row.contract_id, row.repository_id, row.source_job_id, row.source_file, row.route_pattern, row.commit_sha, row.spec_sha256, new Date(Date.now() - 700_000).toISOString());
    assert.equal((await mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher)).status, "completed");
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) total FROM security_auth_code_maps WHERE status = 'failed'").get().total, 2);
    // Completed cache stays available without spending quota.
    for (let i = 0; i < 7; i++) f.sqlite.prepare("INSERT INTO security_auth_code_maps (id,workspace_id,contract_id,repository_id,source_job_id,source_file,route_pattern,commit_sha,spec_sha256,status,created_by_user_id,created_at) VALUES (?,42,?,?,?,?,?,?,?,'failed',1,?)").run(`scm_${crypto.randomUUID()}`, row.contract_id, row.repository_id, row.source_job_id, row.source_file, row.route_pattern, row.commit_sha, row.spec_sha256, new Date().toISOString());
    assert.equal((await mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher)).cached, true);
    f.sqlite.prepare("DELETE FROM security_auth_code_maps WHERE status = 'completed'").run();
    // Preserve quota count after deletion for this synthetic test.
    f.sqlite.prepare("INSERT INTO security_auth_code_maps (id,workspace_id,contract_id,repository_id,source_job_id,source_file,route_pattern,commit_sha,spec_sha256,status,created_by_user_id,created_at) VALUES (?,42,?,?,?,?,?,?,?,'failed',1,?)").run(`scm_${crypto.randomUUID()}`, row.contract_id, row.repository_id, row.source_job_id, row.source_file, row.route_pattern, row.commit_sha, row.spec_sha256, new Date().toISOString());
    await assert.rejects(mapAuthContractCode(f.env, 42, 1, f.input, f.fetcher), /DAILY_LIMIT/);
  } finally { f.sqlite.close(); }
});

test("API and lifecycle include private responses, administrative mutation, export and retention", () => {
  const api = readFileSync(new URL("../app/api/security/auth-contracts/code-map/route.ts", import.meta.url), "utf8");
  assert.match(api, /githubApiContext\(true\)/); assert.match(api, /sec-fetch-site/); assert.match(api, /no-store/); assert.match(api, /parseAuthCodeMapInput/);
  const account = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
  assert.match(account, /authorizationCodeMaps:/); assert.match(account, /DELETE FROM security_auth_code_maps WHERE workspace_id/); assert.match(account, /UPDATE security_auth_code_maps SET created_by_user_id = 0/);
  assert.match(readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8"), /DELETE FROM security_auth_code_maps WHERE julianday\(created_at\)/);
});

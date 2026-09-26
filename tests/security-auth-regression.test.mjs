import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { AUTH_REGRESSION_VERSION, buildAuthorizationRegression, parseRegressionCreate } from "../domain/security-auth-regression.ts";
import { authorizationRegressionBundle, authorizationRegressionCatalog, createAuthorizationRegressionDraft } from "../app/security-auth-regression.ts";
import { authContractSpecHash } from "../domain/security-auth-contracts.ts";
import { authContractProofPack } from "../app/security-auth-contracts.ts";
import { digest } from "../app/github-client.ts";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";

const commit = "a".repeat(40), sourceFile = "app/api/reports/[id]/route.ts", path = "/api/reports/synthetic-one";
const directSpec = (reviewMode = "horizontal") => ({ contractId: `sac_${crypto.randomUUID()}`, codeMapId: `scm_${crypto.randomUUID()}`, commitSha: commit,
  specSha256: "b".repeat(64), evidenceSha256: "c".repeat(64), sourceFile, path, reviewMode });
async function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0054_security_findings_workflow.sql", "0063_github_repository_security.sql", "0068_authenticated_access_review.sql", "0069_auth_review_agent_pipeline.sql", "0070_auth_review_modes.sql", "0071_authorization_contracts.sql", "0072_authorization_code_maps.sql", "0073_authorization_regression_drafts.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  const DB = { prepare(sql) { const stmt = sqlite.prepare(sql), bound = values => ({ first: async () => stmt.get(...values) ?? null,
    all: async () => ({ results: stmt.all(...values) }), run: async () => ({ meta: { changes: Number(stmt.run(...values).changes) } }) }); return { ...bound([]), bind: (...values) => bound(values) }; } };
  const scopeId = `sas_${crypto.randomUUID()}`, repositoryId = `srp_${crypto.randomUUID()}`, jobId = `srj_${crypto.randomUUID()}`, baseline = `sarv_${crypto.randomUUID()}`, contractId = `sac_${crypto.randomUUID()}`;
  const now = new Date().toISOString(), until = new Date(Date.now() + 86_400_000).toISOString(), markerHash = "f".repeat(64);
  sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_expires_at) VALUES (?,42,'example.com','verified','synthetic',1,?)").run(scopeId, until);
  sqlite.prepare("INSERT INTO security_auth_reviews (id, workspace_id, scope_id, actor_user_id, path, bucket_start, status, marker_sha256, review_mode) VALUES (?,42,?,1,?,'synthetic','running',?,'horizontal')").run(baseline, scopeId, path, markerHash);
  sqlite.prepare("UPDATE security_auth_reviews SET status = 'completed', anonymous_status = 403, limited_status = 403, privileged_status = 200, anonymous_marker_observed = 0, limited_marker_observed = 0, privileged_marker_observed = 1, verdict = 'access_restricted' WHERE id = ?").run(baseline);
  const specHash = await authContractSpecHash({ scopeId, path, reviewMode: "horizontal", markerSha256: markerHash });
  sqlite.prepare("INSERT INTO security_auth_contracts (id,workspace_id,scope_id,title,path,review_mode,marker_sha256,spec_sha256,baseline_review_id,created_by_user_id) VALUES (?,42,?,'Synthetic isolation',?,'horizontal',?,?,?,1)").run(contractId, scopeId, path, markerHash, specHash, baseline);
  sqlite.prepare("INSERT INTO github_connections VALUES ('connection',42,123,'acme','active',1,?,?)").run(now, now);
  sqlite.prepare("INSERT INTO security_repositories (id,workspace_id,connection_id,github_id,full_name,default_branch,enabled,authorized_until,created_at,updated_at) VALUES (?,42,'connection',987,'acme/portal','main',1,?,?,?)").run(repositoryId, until, now, now);
  const addJob = (sha = commit) => sqlite.prepare("INSERT INTO security_repository_jobs (id,workspace_id,repository_id,commit_sha,status,trigger_kind,created_at,completed_at) VALUES (?,42,?,?,'completed','manual',?,?)").run(`srj_${crypto.randomUUID()}`, repositoryId, sha, new Date(Date.now() + 1000).toISOString(), new Date(Date.now() + 1000).toISOString());
  sqlite.prepare("INSERT INTO security_repository_jobs (id,workspace_id,repository_id,commit_sha,status,trigger_kind,created_at,completed_at) VALUES (?,42,?,?,'completed','manual',?,?)").run(jobId, repositoryId, commit, now, now);
  async function addMap(entry = sourceFile, corruptHash = false) {
    const id = `scm_${crypto.randomUUID()}`;
    const graph = { version: "authorization-code-map.1", repositoryName: "acme/portal", commitSha: commit, specSha256: specHash,
      route: { path, sourceFile: entry, method: "GET" }, files: [{ path: entry, role: "route", blobSha: "a".repeat(40), sourceSha256: "b".repeat(64), references: [] }], deploymentVerified: false };
    const json = JSON.stringify(graph);
    sqlite.prepare("INSERT INTO security_auth_code_maps (id,workspace_id,contract_id,repository_id,source_job_id,source_file,route_pattern,commit_sha,spec_sha256,status,result_json,evidence_sha256,created_by_user_id,created_at) VALUES (?,42,?,?,?,?,?,?,?,?,?,?,1,?)")
      .run(id, contractId, repositoryId, jobId, entry, "/api/reports/:id", commit, specHash, "completed", json, corruptHash ? "0".repeat(64) : await digest(json), now);
    return id;
  }
  const mapId = await addMap();
  return { sqlite, DB, scopeId, repositoryId, mapId, contractId, markerHash, addMap, addJob };
}

function executeGenerated(spec, scenario = "fixed", adapterRequired = false) {
  const files = buildAuthorizationRegression(spec), directory = mkdtempSync(join(tmpdir(), "cbshub-regression-"));
  assert.ok(dirname(resolve(directory)) === resolve(tmpdir()) && basename(directory).startsWith("cbshub-regression-"), "Temporary test directory must stay inside its explicit target");
  try {
    for (const file of files) { const target = join(directory, file.path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, file.content); }
    const adapter = files.find(file => file.path.endsWith("/adapter.mjs"));
    if (!adapterRequired) writeFileSync(join(directory, adapter.path), `import { createAuthorizationLab, LAB_MARKER, LAB_TOKENS } from ${JSON.stringify(new URL("./fixtures/authorization-lab.mjs", import.meta.url).href)};
export async function createFixture({ path, reviewMode, marker }) {
  const scenario = process.env.CBSHUB_SYNTHETIC_SCENARIO;
  const lab = createAuthorizationLab({ mode: reviewMode, vulnerable: scenario === "vulnerable", ownerMissingMarker: scenario === "owner-missing", otherStatusOnly: scenario === "generic", redirectOther: scenario === "redirect", deniedMarker: scenario === "denied-marker", oversizedOther: scenario === "oversized" });
  return { transport: "in-process", identities: {
    owner: { id: "synthetic-owner", role: "synthetic-admin", tenant: "synthetic-a" },
    other: { id: scenario === "same-identity" ? "synthetic-owner" : "synthetic-other", role: "synthetic-reader", tenant: reviewMode === "horizontal" ? "synthetic-b" : "synthetic-a" }
  }, async requestAs(identity) {
    const token = identity === "owner" ? LAB_TOKENS.privileged : identity === "other" ? LAB_TOKENS.limited : null;
    const response = await lab.fetcher("https://example.com" + path, { method: "GET", redirect: "manual", headers: token ? { Authorization: "Bearer " + token } : {} });
    return new Response((await response.text()).replaceAll(LAB_MARKER, marker), { status: response.status, headers: response.headers });
  }, async dispose() {} };
}
`);
    const script = files.find(file => file.path.endsWith("/authorization.test.mjs"));
    const child = spawnSync(process.execPath, ["--experimental-strip-types", "--test", join(directory, script.path)], { encoding: "utf8", timeout: 20_000,
      env: { SYSTEMROOT: process.env.SYSTEMROOT, TEMP: tmpdir(), TMP: tmpdir(), CBSHUB_SYNTHETIC_SCENARIO: scenario } });
    return { status: child.status, output: (child.stdout ?? "") + (child.stderr ?? ""), error: child.error };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("regression input is confirmed, bounded and cannot choose arbitrary generated code", () => {
  const valid = { codeMapId: `scm_${crypto.randomUUID()}`, reviewConfirmed: true };
  assert.equal(parseRegressionCreate(valid).codeMapId, valid.codeMapId);
  for (const change of [{ reviewConfirmed: false }, { codeMapId: "scm_fake" }, { content: "eval()" }, { tokens: "never" }]) assert.throws(() => parseRegressionCreate({ ...valid, ...change }));
  for (const change of [{ sourceFile: "../outside.ts" }, { path: "/api/logout" }, { reviewMode: undefined }, { specSha256: "x" }, { commitSha: "main" }]) assert.throws(() => buildAuthorizationRegression({ ...directSpec(), ...change }));
});

test("deterministic package is four safe files with explicit incomplete state and no additional dependency", () => {
  const spec = directSpec(), files = buildAuthorizationRegression(spec);
  assert.deepEqual(files, buildAuthorizationRegression({ ...spec })); assert.equal(files.length, 4);
  for (const file of files) assert.ok(file.path.startsWith(`.cbshub/authorization/${spec.contractId}/`));
  assert.equal(files.some(file => /package\.json|workflows|\.sh$/.test(file.path)), false);
  const profile = JSON.parse(files[0].content);
  assert.equal(profile.version, AUTH_REGRESSION_VERSION);
  assert.equal(profile.requiresAdapter, true); assert.equal(profile.testsExecutedByPlatform, false); assert.equal(profile.deploymentVerified, false);
  const source = files.find(file => file.path.endsWith("authorization.test.mjs")).content;
  assert.doesNotMatch(source, /\bfetch\(|\.skip\(|OPENAI|Bearer/);
  assert.match(source, /65536/); assert.match(source, /timeout: 15000/);
  const zip = zipSync(Object.fromEntries(files.map(file => [file.path, strToU8(file.content)])));
  const unpacked = unzipSync(zip);
  assert.deepEqual(Object.keys(unpacked), files.map(file => file.path));
  for (const file of files) assert.equal(strFromU8(unpacked[file.path]), file.content);
});

test("unimplemented adapter fails, never skips or produces a green test", () => {
  const execution = executeGenerated(directSpec(), "fixed", true);
  assert.equal(execution.status, 1); assert.match(execution.output, /CBSHUB_ADAPTER_REQUIRED/);
});

test("generated executable test detects vulnerability, accepts real offline policy fix and detects regression", () => {
  for (const mode of ["horizontal", "vertical"]) {
    const spec = directSpec(mode);
    for (const scenario of ["vulnerable", "fixed", "vulnerable"]) {
      const execution = executeGenerated(spec, scenario);
      assert.equal(execution.error, undefined); assert.equal(execution.status, scenario === "fixed" ? 0 : 1, execution.output);
      assert.equal(execution.output.includes("synthetic-other-identity-token-123"), false);
      assert.equal(execution.output.includes("CBSTEST-laboratoryresource123"), false);
    }
  }
});

test("generated test cannot pass a missing owner, generic success, redirect, contradictory denial or oversized body", () => {
  for (const scenario of ["owner-missing", "generic", "redirect", "denied-marker", "oversized", "same-identity"]) {
    const execution = executeGenerated(directSpec(), scenario);
    assert.equal(execution.status, 1, execution.output);
  }
});

test("valid map prepares one immutable draft, no external calls, and keeps bundle in the proof export", async () => {
  const f = await database();
  try {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("External request forbidden in regression preparation"); };
    let draft;
    try { draft = await createAuthorizationRegressionDraft(f.DB, 42, 1, f.mapId); } finally { globalThis.fetch = originalFetch; }
    assert.equal(draft.status, "adapter_required"); assert.equal(draft.testsExecuted, false); assert.equal(draft.modelCalls, 0);
    assert.equal((await createAuthorizationRegressionDraft(f.DB, 42, 1, f.mapId)).id, draft.id);
    const bundle = await authorizationRegressionBundle(f.DB, 42, draft.id);
    assert.equal(bundle.files.length, 4); assert.equal(await digest(JSON.stringify(bundle.files)), draft.bundleSha256);
    assert.equal(JSON.stringify(bundle).includes(f.markerHash), false);
    assert.equal((await authContractProofPack(f.DB, 42, f.contractId)).regressionDrafts[0].id, draft.id);
    assert.throws(() => f.sqlite.prepare("UPDATE security_auth_regression_drafts SET files_json = '[]' WHERE id = ?").run(draft.id), /IMMUTABLE/);
    f.sqlite.prepare("UPDATE security_auth_regression_drafts SET created_by_user_id = 0 WHERE id = ?").run(draft.id);
    assert.equal(f.sqlite.prepare("SELECT created_by_user_id FROM security_auth_regression_drafts WHERE id = ?").get(draft.id).created_by_user_id, 0);
  } finally { f.sqlite.close(); }
});

test("foreign workspace, stale scan, corrupted evidence and expired authorization cannot prepare a draft", async () => {
  const f = await database();
  try {
    await assert.rejects(createAuthorizationRegressionDraft(f.DB, 43, 1, f.mapId), /MAPPING_INVALID/);
    await assert.rejects(authorizationRegressionCatalog(f.DB, 43, f.repositoryId), /NOT_FOUND/);
    const badMap = await f.addMap("other/app/api/reports/[id]/route.ts", true);
    await assert.rejects(createAuthorizationRegressionDraft(f.DB, 42, 1, badMap), /MAPPING_INVALID/);
    f.addJob("d".repeat(40));
    await assert.rejects(createAuthorizationRegressionDraft(f.DB, 42, 1, f.mapId), /MAPPING_INVALID/);
    assert.equal((await authorizationRegressionCatalog(f.DB, 42, f.repositoryId)).candidates.length, 0);
    f.sqlite.prepare("UPDATE security_agent_scopes SET authorization_expires_at = ? WHERE id = ?").run(new Date(Date.now() - 60000).toISOString(), f.scopeId);
    await assert.rejects(createAuthorizationRegressionDraft(f.DB, 42, 1, f.mapId), /MAPPING_INVALID/);
  } finally { f.sqlite.close(); }
});

test("quota and concurrent duplicate preparation are enforced atomically", async () => {
  const f = await database();
  try {
    const pair = await Promise.all([createAuthorizationRegressionDraft(f.DB, 42, 1, f.mapId), createAuthorizationRegressionDraft(f.DB, 42, 1, f.mapId)]);
    assert.equal(pair[0].id, pair[1].id);
    for (let i = 1; i < 10; i++) await createAuthorizationRegressionDraft(f.DB, 42, 1, await f.addMap(`project-${i}/${sourceFile}`));
    await assert.rejects(createAuthorizationRegressionDraft(f.DB, 42, 1, await f.addMap(`project-over/${sourceFile}`)), /DAILY_LIMIT/);
    assert.equal((await createAuthorizationRegressionDraft(f.DB, 42, 1, f.mapId)).id, pair[0].id);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) total FROM security_auth_regression_drafts").get().total, 10);
  } finally { f.sqlite.close(); }
});

test("revocation at the write boundary is rejected by the migration guard", async () => {
  const f = await database();
  try {
    const guarded = { prepare(sql) {
      if (sql.startsWith("INSERT INTO security_auth_regression_drafts")) f.sqlite.prepare("UPDATE security_repositories SET enabled = 0 WHERE id = ?").run(f.repositoryId);
      return f.DB.prepare(sql);
    } };
    await assert.rejects(createAuthorizationRegressionDraft(guarded, 42, 1, f.mapId), /AUTHORIZATION_INVALID/);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) total FROM security_auth_regression_drafts").get().total, 0);
  } finally { f.sqlite.close(); }
});

test("historical download stays tenant-scoped after revocation and corrupted payload cannot become arbitrary code", async () => {
  const f = await database();
  try {
    const draft = await createAuthorizationRegressionDraft(f.DB, 42, 1, f.mapId);
    assert.equal(await authorizationRegressionBundle(f.DB, 43, draft.id), null);
    f.addJob("d".repeat(40));
    assert.equal((await authorizationRegressionCatalog(f.DB, 42, f.repositoryId)).drafts[0].scanState, "newer_scan_available");
    f.sqlite.prepare("UPDATE security_repositories SET enabled = 0 WHERE id = ?").run(f.repositoryId);
    assert.equal((await authorizationRegressionBundle(f.DB, 42, draft.id)).files.length, 4);
    f.sqlite.exec("DROP TRIGGER security_auth_regression_immutable");
    const row = f.sqlite.prepare("SELECT * FROM security_auth_regression_drafts WHERE id = ?").get(draft.id);
    const files = JSON.parse(row.files_json); files[1].content = "arbitrary code must not be downloadable";
    const json = JSON.stringify(files);
    f.sqlite.prepare("UPDATE security_auth_regression_drafts SET files_json = ?, bundle_sha256 = ? WHERE id = ?").run(json, await digest(json), draft.id);
    await assert.rejects(authorizationRegressionBundle(f.DB, 42, draft.id), /BUNDLE_INVALID/);
  } finally { f.sqlite.close(); }
});

test("regression API and project UI disclose incomplete integration and lifecycle retention", () => {
  const source = readFileSync(new URL("../app/api/security/auth-contracts/regression/route.ts", import.meta.url), "utf8");
  assert.match(source, /githubApiContext\(true\)/); assert.match(source, /no-store/); assert.match(source, /size > 1000/); assert.match(source, /sec-fetch-site/); assert.match(source, /zipSync/);
  const ui = readFileSync(new URL("../app/app/SecurityAuthorizationRegressionPanel.tsx", import.meta.url), "utf8");
  assert.match(ui, /Adaptador obrigatório · teste não executado/); assert.match(ui, /sem produção ou credenciais reais/);
  const account = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
  assert.match(account, /authorizationRegressionDrafts:/); assert.match(account, /DELETE FROM security_auth_regression_drafts WHERE workspace_id/); assert.match(account, /UPDATE security_auth_regression_drafts SET created_by_user_id = 0/);
  assert.match(readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8"), /DELETE FROM security_auth_regression_drafts WHERE julianday\(created_at\)/);
});

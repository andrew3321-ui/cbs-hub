import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { authContractSpecHash, evaluateAuthContract, parseAuthContractCreate, parseAuthContractId } from "../domain/security-auth-contracts.ts";
import { authReviewMarkerHash } from "../domain/security-auth-review-policy.ts";
import { createAuthContract, requireAuthContractBinding, authContractProofPack } from "../app/security-auth-contracts.ts";
import { authenticatedAccessReview } from "../security-runner/worker.ts";
import { executeAuthenticatedAccessReview } from "../security-runner/executor.ts";
import { hmacHex } from "../domain/security-runner-policy.ts";
import { createAuthorizationLab, evaluateAuthorizationLaboratory, LAB_MARKER, LAB_PATH, LAB_DOMAIN, LAB_TOKENS } from "./fixtures/authorization-lab.mjs";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0054_security_findings_workflow.sql", "0063_github_repository_security.sql", "0068_authenticated_access_review.sql", "0069_auth_review_agent_pipeline.sql", "0070_auth_review_modes.sql", "0071_authorization_contracts.sql", "0072_authorization_code_maps.sql", "0073_authorization_regression_drafts.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  const DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bound = (values) => ({ first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }), run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) });
      return { ...bound([]), bind: (...values) => bound(values) };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  const scopeId = `sas_${crypto.randomUUID()}`;
  sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_expires_at) VALUES (?, 42, ?, 'verified', 'synthetic-dns-ownership', 1, ?)")
    .run(scopeId, LAB_DOMAIN, new Date(Date.now() + 86_400_000).toISOString());
  let bucket = 0;
  async function insertReview(contractId = null, overrides = {}) {
    const id = `sarv_${crypto.randomUUID()}`;
    const input = { workspaceId: 42, scopeId, path: LAB_PATH, reviewMode: "horizontal", markerHash: await authReviewMarkerHash(LAB_MARKER), ...overrides };
    sqlite.prepare(`INSERT INTO security_auth_reviews (id, workspace_id, scope_id, actor_user_id, path, bucket_start, status, marker_sha256, review_mode, contract_id, created_at)
      VALUES (?, ?, ?, 1, ?, ?, 'running', ?, ?, ?, ?)`).run(id, input.workspaceId, input.scopeId, input.path, `synthetic-bucket-${bucket++}`, input.markerHash, input.reviewMode, contractId, new Date(Date.now() + bucket * 1000).toISOString());
    return id;
  }
  async function runReview(reviewId, lab, expectedStatus = 200) {
    const secret = "synthetic-runner-signing-key-with-at-least-thirty-two-characters";
    const body = JSON.stringify({ reviewId, workspaceId: 42, scopeId, reviewMode: "horizontal", ...lab.input });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await hmacHex(secret, `${timestamp}.${body}`);
    const request = new Request("https://security-runner.internal/v1/auth-review", { method: "POST", headers: { "X-CBSHub-Timestamp": timestamp, "X-CBSHub-Signature": `sha256=${signature}` }, body });
    const response = await authenticatedAccessReview(request, { DB, SECURITY_RUNNER_SIGNING_KEY: secret }, {
      ownershipFetcher: async () => Response.json({ Status: 0, Answer: [{ type: 16, data: '"cbshub-verification=synthetic-dns-ownership"' }] }), targetFetcher: lab.fetcher,
    });
    assert.equal(response.status, expectedStatus);
    return response.json();
  }
  return { sqlite, DB, scopeId, insertReview, runReview };
}

test("contract parser rejects nonconfirmed, oversized, personal contact and executable input", () => {
  const valid = { title: "Isolamento do relatório", baselineReviewId: `sarv_${crypto.randomUUID()}`, confirmed: true };
  assert.equal(parseAuthContractCreate(valid).title, valid.title);
  for (const change of [{ confirmed: false }, { title: " " }, { title: "a".repeat(81) }, { title: "contact@example.com" }, { title: "<script>" }, { title: "rule\n" }, { extra: "token" }, { baselineReviewId: "sarv_" + "-".repeat(36) }]) assert.throws(() => parseAuthContractCreate({ ...valid, ...change }));
  assert.throws(() => parseAuthContractId("sac_" + "-".repeat(36)));
});

test("spec hash is stable and changes for scope, route, mode or synthetic fixture", async () => {
  const spec = { scopeId: `sas_${crypto.randomUUID()}`, path: LAB_PATH, reviewMode: "horizontal", markerSha256: await authReviewMarkerHash(LAB_MARKER) };
  const hash = await authContractSpecHash(spec);
  assert.equal(hash, await authContractSpecHash({ ...spec }));
  for (const change of [{ scopeId: `sas_${crypto.randomUUID()}` }, { path: "/api/reports/synthetic-two" }, { reviewMode: "vertical" }, { markerSha256: "0".repeat(64) }]) assert.notEqual(hash, await authContractSpecHash({ ...spec, ...change }));
  await assert.rejects(authContractSpecHash({ ...spec, path: "/api/logout" }));
});

test("offline laboratory evaluates real role/tenant policies and conservative failure controls", async () => {
  const report = await evaluateAuthorizationLaboratory();
  assert.equal(report.scenarios, 18);
  assert.equal(report.passed, 18);
  assert.equal(report.failed, 0);
  assert.equal(report.modelCalls, 0);
  assert.equal(report.externalRequests, 0);
});

test("same fixture detects a vulnerability, its fix and subsequent regression", async () => {
  const lab = createAuthorizationLab({ mode: "horizontal", vulnerable: true });
  const outcome = async () => evaluateAuthContract({ ...await executeAuthenticatedAccessReview(lab.input, lab.fetcher), status: "completed" });
  assert.equal(await outcome(), "violated");
  lab.state.vulnerable = false;
  assert.equal(await outcome(), "respected");
  lab.state.vulnerable = true;
  assert.equal(await outcome(), "violated");
  assert.equal(lab.state.calls.length, 9);
});

test("completed status, owner marker and exact denial controls are required to respect the rule", () => {
  const observation = { status: "completed", statuses: { anonymous: 403, limited: 401, privileged: 200 }, markerObserved: { anonymous: false, limited: false, privileged: true } };
  assert.equal(evaluateAuthContract(observation), "respected");
  for (const status of [200, 302, 404, 429, 500, null, "403"]) assert.equal(evaluateAuthContract({ ...observation, statuses: { ...observation.statuses, limited: status } }), "inconclusive");
  assert.equal(evaluateAuthContract({ ...observation, status: "failed" }), "inconclusive");
  assert.equal(evaluateAuthContract({ ...observation, markerObserved: { ...observation.markerObserved, privileged: false } }), "inconclusive");
  assert.equal(evaluateAuthContract({ ...observation, markerObserved: { ...observation.markerObserved, limited: 0 } }), "inconclusive");
});

test("contracts bind runner executions and retain regression history without auto-closing findings", async () => {
  const { sqlite, DB, scopeId, insertReview, runReview } = database();
  try {
    const baselineId = await insertReview();
    await runReview(baselineId, createAuthorizationLab({ mode: "horizontal", vulnerable: true }));
    const contract = await createAuthContract(DB, 42, 1, { title: "Isolamento do relatório", baselineReviewId: baselineId });
    assert.equal((await createAuthContract(DB, 42, 1, { title: "Outra etiqueta", baselineReviewId: baselineId })).id, contract.id);
    const binding = { scopeId, path: LAB_PATH, reviewMode: "horizontal", markerSha256: await authReviewMarkerHash(LAB_MARKER) };
    await requireAuthContractBinding(DB, 42, contract.id, binding);
    await assert.rejects(requireAuthContractBinding(DB, 43, contract.id, binding), /MISMATCH/);
    for (const change of [{ path: "/api/reports/synthetic-two" }, { reviewMode: "vertical" }, { markerSha256: "0".repeat(64) }, { markerSha256: null }, { scopeId: `sas_${crypto.randomUUID()}` }]) await assert.rejects(requireAuthContractBinding(DB, 42, contract.id, { ...binding, ...change }), /MISMATCH/);
    const fixedId = await insertReview(contract.id);
    await runReview(fixedId, createAuthorizationLab({ mode: "horizontal" }));
    const regressedId = await insertReview(contract.id);
    await runReview(regressedId, createAuthorizationLab({ mode: "horizontal", vulnerable: true }));
    const expiredId = await insertReview(contract.id);
    await runReview(expiredId, createAuthorizationLab({ mode: "horizontal", ownerExpired: true }));
    const proof = await authContractProofPack(DB, 42, contract.id);
    assert.deepEqual(proof.runs.map((run) => run.outcome), ["inconclusive", "violated", "respected"]);
    assert.equal(proof.contract.specSha256, contract.specSha256);
    assert.equal(proof.runs.some((run) => run.reviewId === baselineId), false);
    assert.equal(await authContractProofPack(DB, 43, contract.id), null);
    const serialized = JSON.stringify(proof);
    for (const secret of [LAB_MARKER, LAB_TOKENS.limited, LAB_TOKENS.privileged]) assert.equal(serialized.includes(secret), false);
    assert.equal(serialized.includes("marker_sha256"), false);
    assert.equal(sqlite.prepare("SELECT status FROM security_findings WHERE workspace_id = 42").get().status, "open");
    assert.throws(() => sqlite.prepare("UPDATE security_auth_contracts SET path = '/different' WHERE id = ?").run(contract.id), /IMMUTABLE/);
    assert.throws(() => sqlite.prepare("UPDATE security_auth_reviews SET marker_sha256 = ? WHERE id = ?").run("0".repeat(64), regressedId), /IMMUTABLE/);
    await assert.rejects(insertReview(contract.id, { workspaceId: 43 }), /MISMATCH/);
    await assert.rejects(insertReview(contract.id, { reviewMode: "vertical" }), /MISMATCH/);
    await assert.rejects(insertReview(contract.id, { markerHash: "0".repeat(64) }), /MISMATCH/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_auth_reviews WHERE workspace_id = 43").get().total, 0);
    // Baseline retention does not break immutable contracts or their newer history.
    sqlite.prepare("DELETE FROM security_auth_reviews WHERE id = ?").run(baselineId);
    assert.equal((await authContractProofPack(DB, 42, contract.id)).runs.length, 3);
    sqlite.prepare("UPDATE security_auth_contracts SET created_by_user_id = 0 WHERE id = ?").run(contract.id);
    assert.equal(sqlite.prepare("SELECT created_by_user_id FROM security_auth_contracts WHERE id = ?").get(contract.id).created_by_user_id, 0);
  } finally { sqlite.close(); }
});

test("baseline creation rejects foreign workspace, missing marker and expired scope", async () => {
  const { sqlite, DB, scopeId, insertReview, runReview } = database();
  try {
    const id = await insertReview();
    await assert.rejects(createAuthContract(DB, 42, 1, { title: "Incomplete", baselineReviewId: id }), /BASELINE_INVALID/);
    await runReview(id, createAuthorizationLab({ mode: "horizontal" }));
    await assert.rejects(createAuthContract(DB, 43, 1, { title: "Foreign", baselineReviewId: id }), /BASELINE_INVALID/);
    sqlite.prepare("UPDATE security_auth_reviews SET privileged_status = 401 WHERE id = ?").run(id);
    await assert.rejects(createAuthContract(DB, 42, 1, { title: "Invalid owner control", baselineReviewId: id }), /BASELINE_INVALID/);
    sqlite.prepare("UPDATE security_auth_reviews SET privileged_status = 200 WHERE id = ?").run(id);
    sqlite.prepare("UPDATE security_agent_scopes SET authorization_expires_at = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), scopeId);
    await assert.rejects(createAuthContract(DB, 42, 1, { title: "Expired", baselineReviewId: id }), /BASELINE_INVALID/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_auth_contracts").get().total, 0);
  } finally { sqlite.close(); }
});

test("quota is enforced by the insertion statement and repeated specs are idempotent", async () => {
  const { sqlite, DB, insertReview, runReview } = database();
  try {
    const id = await insertReview();
    await runReview(id, createAuthorizationLab({ mode: "horizontal" }));
    const first = await createAuthContract(DB, 42, 1, { title: "First contract", baselineReviewId: id });
    const row = sqlite.prepare("SELECT * FROM security_auth_contracts WHERE id = ?").get(first.id);
    const insert = sqlite.prepare("INSERT INTO security_auth_contracts (id, workspace_id, scope_id, title, path, review_mode, marker_sha256, spec_sha256, baseline_review_id, created_by_user_id) VALUES (?, 42, ?, 'Synthetic quota fixture', ?, ?, ?, ?, ?, 1)");
    for (let index = 1; index < 50; index++) insert.run(`sac_${crypto.randomUUID()}`, row.scope_id, row.path, row.review_mode, row.marker_sha256, index.toString(16).padStart(64, "0"), id);
    assert.equal((await createAuthContract(DB, 42, 1, { title: "Repeat", baselineReviewId: id })).id, first.id);
    // A different fixture would exceed the quota.
    const other = await insertReview(null, { path: "/api/reports/synthetic-two" });
    sqlite.prepare("UPDATE security_auth_reviews SET status = 'completed', anonymous_status = 403, limited_status = 403, privileged_status = 200, anonymous_marker_observed = 0, limited_marker_observed = 0, privileged_marker_observed = 1, verdict = 'access_restricted' WHERE id = ?").run(other);
    await assert.rejects(createAuthContract(DB, 42, 1, { title: "Over quota", baselineReviewId: other }), /AUTH_CONTRACT_LIMIT/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_auth_contracts WHERE workspace_id = 42").get().total, 50);
  } finally { sqlite.close(); }
});

test("a saved contract cannot bypass revoked domain authorization at the runner", async () => {
  const { sqlite, DB, scopeId, insertReview, runReview } = database();
  try {
    const id = await insertReview();
    await runReview(id, createAuthorizationLab({ mode: "horizontal" }));
    const contract = await createAuthContract(DB, 42, 1, { title: "Temporary authorization", baselineReviewId: id });
    const next = await insertReview(contract.id);
    sqlite.prepare("UPDATE security_agent_scopes SET status = 'pending' WHERE id = ?").run(scopeId);
    const lab = createAuthorizationLab({ mode: "horizontal", vulnerable: true });
    assert.equal((await runReview(next, lab, 403)).code, "RUNNER_SCOPE_AUTHORIZATION_INVALID");
    assert.equal(lab.state.calls.length, 0);
  } finally { sqlite.close(); }
});

test("contract endpoint gates mutation, confirms intent and exports no raw fixture", () => {
  const source = readFileSync(new URL("../app/api/security/auth-contracts/route.ts", import.meta.url), "utf8");
  assert.match(source, /getCurrentUser/);
  assert.match(source, /workspaceAccessAllowed/);
  assert.match(source, /canManageWorkspace\(current.workspace.role\)/);
  assert.match(source, /origin !== new URL\(request.url\).origin/);
  assert.match(source, /parseAuthContractCreate/);
  assert.match(source, /Cache-Control.*no-store/);
  const account = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
  assert.match(account, /DELETE FROM security_auth_contracts WHERE workspace_id/);
  assert.match(account, /UPDATE security_auth_contracts SET created_by_user_id = 0/);
  assert.match(account, /authorizationContracts:/);
});

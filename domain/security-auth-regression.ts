import { parseAuthContractId } from "./security-auth-contracts.ts";
import { parseAuthReviewMode, parseAuthReviewPath } from "./security-auth-review-policy.ts";
import { isCodeMapPath } from "./security-auth-code-map.ts";

export const AUTH_REGRESSION_VERSION = "authorization-regression.1";
export const AUTH_REGRESSION_DAILY_LIMIT = 10;
export type RegressionFile = { path: string; content: string };
export type RegressionSpec = { contractId: string; codeMapId: string; commitSha: string; specSha256: string; evidenceSha256: string;
  sourceFile: string; path: string; reviewMode: "horizontal" | "vertical" };
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export function parseCodeMapId(value: unknown) {
  if (typeof value !== "string" || !new RegExp(`^scm_${uuid}$`, "i").test(value)) throw new Error("AUTH_REGRESSION_INPUT_INVALID");
  return value;
}
export function parseRegressionId(value: unknown) {
  if (typeof value !== "string" || !new RegExp(`^srg_${uuid}$`, "i").test(value)) throw new Error("AUTH_REGRESSION_INPUT_INVALID");
  return value;
}
export function parseRegressionCreate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AUTH_REGRESSION_INPUT_INVALID");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 2 || input.reviewConfirmed !== true) throw new Error("AUTH_REGRESSION_INPUT_INVALID");
  return { codeMapId: parseCodeMapId(input.codeMapId) };
}

/** Fixed recipe only. No model output, repository code or credentials are interpolated. */
export function buildAuthorizationRegression(spec: RegressionSpec): RegressionFile[] {
  parseAuthContractId(spec.contractId); parseCodeMapId(spec.codeMapId); parseAuthReviewPath(spec.path); parseAuthReviewMode(spec.reviewMode);
  if (!["horizontal", "vertical"].includes(spec.reviewMode)) throw new Error("AUTH_REGRESSION_INPUT_INVALID");
  if (!/^[a-f0-9]{40}$/.test(spec.commitSha) || !/^[a-f0-9]{64}$/.test(spec.specSha256) || !/^[a-f0-9]{64}$/.test(spec.evidenceSha256) || !isCodeMapPath(spec.sourceFile)) throw new Error("AUTH_REGRESSION_INPUT_INVALID");
  const directory = `.cbshub/authorization/${spec.contractId}`;
  const profile = JSON.stringify({ version: AUTH_REGRESSION_VERSION, contractId: spec.contractId, codeMapId: spec.codeMapId, baseCommit: spec.commitSha,
    contractSpecSha256: spec.specSha256, codeEvidenceSha256: spec.evidenceSha256, sourceFile: spec.sourceFile, path: spec.path, reviewMode: spec.reviewMode,
    expectation: "anonymous_and_other_identity_denied", requiresAdapter: true, testsExecutedByPlatform: false, deploymentVerified: false }, null, 2);
  const test = `// Generated recipe: review adapter.mjs before adding this test to CI.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createFixture } from "./adapter.mjs";

const profile = JSON.parse(await readFile(new URL("./profile.json", import.meta.url), "utf8"));
const synthetic = (value) => typeof value === "string" && /^synthetic-[a-z0-9_-]{1,60}$/.test(value);
async function observe(response, marker) {
  assert.ok(response instanceof Response, "Adapter must return a native Response");
  assert.ok(!response.redirected, "Redirected responses are not an access-control result");
  const reader = response.body?.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, text = "";
  try {
    if (reader) while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      assert.ok(bytes <= 65536, "Fixture response exceeded 64 KiB; result is not a pass");
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } catch { throw new Error("Fixture body could not be read within the limit; result is not a pass"); }
  finally { await reader?.cancel().catch(() => undefined); }
  return { status: response.status, markerObserved: text.includes(marker) };
}

test("Restricted GET: owner positive control and two denied identities", { timeout: 15000 }, async (t) => {
  // Fresh synthetic fixture, not the original live marker or its credential.
  const marker = "CBSTEST-" + randomUUID().replaceAll("-", "");
  let fixture;
  try {
    try { fixture = await createFixture({ path: profile.path, reviewMode: profile.reviewMode, marker, signal: AbortSignal.timeout(10000) }); }
    catch { throw new Error("CBSHUB_ADAPTER_REQUIRED: connect the reviewed adapter to an isolated application fixture"); }
    assert.ok(fixture && fixture.transport === "in-process" && typeof fixture.requestAs === "function" && typeof fixture.dispose === "function", "Isolated in-process fixture and cleanup are required");
    const { owner, other } = fixture.identities ?? {};
    assert.ok(owner && other && synthetic(owner.id) && synthetic(other.id) && owner.id !== other.id, "Two distinct synthetic identities are required");
    assert.ok(synthetic(owner.role) && synthetic(other.role) && synthetic(owner.tenant) && synthetic(other.tenant), "Use only synthetic role and tenant metadata");
    assert.ok(profile.reviewMode === "horizontal" ? owner.tenant !== other.tenant : owner.role !== other.role, "Fixture identities must exercise the selected isolation boundary");
    const request = async (identity) => {
      let response;
      try { response = await fixture.requestAs(identity, { path: profile.path, method: "GET", signal: AbortSignal.timeout(10000) }); }
      catch { throw new Error("Fixture request failed; result is not a pass"); }
      return observe(response, marker);
    };
    await t.test("owner can read the synthetic marker", async () => {
      const observation = await request("owner");
      assert.ok(observation.status >= 200 && observation.status < 300 && observation.markerObserved, "Owner positive control missing; do not declare the access rule protected");
    });
    for (const identity of ["anonymous", "other"]) await t.test(identity + " is denied without marker", async () => {
      const observation = await request(identity);
      assert.ok([401, 403].includes(observation.status) && !observation.markerObserved, "Restricted identity was not explicitly denied without the marker");
    });
  } finally {
    if (fixture && typeof fixture.dispose === "function") {
      try { await fixture.dispose(); } catch { throw new Error("Fixture cleanup failed; inspect the isolated test environment"); }
    }
  }
});
`;
  const adapter = `// REQUIRED: connect this adapter to YOUR application's real handler and authorization.
// Do not return fabricated status codes or compare the role only inside this adapter.
// No live domain, real user, production database, API token or external network.
// Use ${JSON.stringify(spec.sourceFile)} as the review entry point at the base commit.
// createFixture receives { path, reviewMode, marker, signal }.
// Seed an isolated synthetic resource containing marker and two distinct identities.
// Return { transport: "in-process", identities: { owner: { id, role, tenant }, other: { id, role, tenant } },
//   requestAs(identity, { path, method, signal }): Promise<Response>, dispose(): Promise<void> }.
// Identity strings: "owner", "other", "anonymous". Metadata values start with "synthetic-".
// Horizontal mode requires different tenants; vertical mode requires different roles.
// requestAs must invoke the real application's handler, session and policy logic.
// Honor AbortSignal, isolate fixtures and remove them in dispose. Never log tokens or bodies.
export async function createFixture() {
  throw new Error("CBSHUB_ADAPTER_REQUIRED");
}
`;
  const readme = `# Authorization regression draft — human integration required

Base commit: ${spec.commitSha}
Entry point: ${spec.sourceFile}
Path: ${spec.path}
Mode: ${spec.reviewMode}
Contract specification SHA-256: ${spec.specSha256}
Code evidence SHA-256: ${spec.evidenceSha256}

This is a deterministic TEST RECIPE, not a tested fix or automatic project integration.
The platform has NOT run the client's tests, created a PR, or confirmed a deployment.
The fixture generates a NEW marker. It tests the same access expectation, not the original live fixture.

## Integrate and review
1. Check out the base commit and review the route plus its authorization dependencies.
2. Implement adapter.mjs against the real application handler/session/policy in an isolated fixture.
   Do not hardcode a fake authorization check in the adapter: that would only test the adapter itself.
3. Provide distinct synthetic identities and a resource containing the supplied marker.
   Horizontal: different tenants. Vertical: different roles. No production data or real credentials.
4. Run with Node.js 22 or later: node --test ${directory}/authorization.test.mjs
5. Verify the test FAILS when the real authorization control is removed, then PASSES after fixing it.
6. Add this exact command to the existing CI in a human-reviewed branch/PR. No workflow or package script is changed by this bundle.
7. Review teardown, cancellation and isolation. The test recipe is NOT a sandbox for an arbitrary adapter.

## Limits
Only one GET and three fixture identities are checked. Bodies are bounded to 64 KiB and never printed by the recipe.
Setup/request signals are 10 seconds; the test has a 15-second timeout. The adapter must honor cancellation and clean up.
401/403 without marker are required for denied identities; 404, redirects, 429, 5xx or generic 2xx cannot pass.
The owner must return 2xx with the marker. A placeholder adapter deliberately fails instead of skipping.
No network client or model call is generated. No token, original marker/hash, repository source or personal identity is in this bundle.
No automatic merge, vulnerability closure, CI-result ingestion or deployment attestation is implemented in this version.
`;
  return [{ path: `${directory}/profile.json`, content: profile }, { path: `${directory}/authorization.test.mjs`, content: test },
    { path: `${directory}/adapter.mjs`, content: adapter }, { path: `${directory}/README.md`, content: readme }];
}

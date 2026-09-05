import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { personalDataInventory, PRIVACY_GOVERNANCE_VERSION } from "../domain/privacy-governance.ts";
import { authorizeWorkspaceResource, roleHasPermission, workspaceRoles } from "../domain/workspace-authorization.ts";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("privacy inventory documents purpose, legal basis, storage, retention and deletion", () => {
  assert.match(PRIVACY_GOVERNANCE_VERSION, /^\d{4}\.\d{2}\.\d{2}-v\d+$/);
  assert.ok(personalDataInventory.length >= 7);
  for (const item of personalDataInventory) {
    assert.ok(item.category);
    assert.ok(item.examples.length);
    assert.ok(item.purposes.length);
    assert.ok(item.legalBases.every((basis) => basis.includes("LGPD")));
    assert.ok(item.stores.length);
    assert.ok(item.retention);
    assert.ok(item.deletionBehavior);
  }
});

test("cross-workspace access is denied before role evaluation can grant it", () => {
  for (const role of workspaceRoles) {
    assert.equal(authorizeWorkspaceResource({ actorWorkspaceId: 10, resourceWorkspaceId: 11, actorRole: role, permission: "manage_workspace" }), false);
    assert.equal(authorizeWorkspaceResource({ actorWorkspaceId: 10, resourceWorkspaceId: 11, actorRole: role, permission: "prepare_scenario" }), false);
    assert.equal(authorizeWorkspaceResource({ actorWorkspaceId: 10, resourceWorkspaceId: 11, actorRole: role, permission: "review_scenario" }), false);
    assert.equal(authorizeWorkspaceResource({ actorWorkspaceId: 10, resourceWorkspaceId: 11, actorRole: role, permission: "manage_billing" }), false);
  }
});

test("workspace roles follow least privilege", () => {
  assert.equal(roleHasPermission("owner", "manage_billing"), true);
  assert.equal(roleHasPermission("admin", "manage_billing"), false);
  assert.equal(roleHasPermission("preparer", "prepare_scenario"), true);
  assert.equal(roleHasPermission("preparer", "review_scenario"), false);
  assert.equal(roleHasPermission("reviewer", "review_scenario"), true);
  assert.equal(roleHasPermission("reviewer", "prepare_scenario"), false);
  assert.equal(roleHasPermission("unknown", "manage_workspace"), false);
  assert.equal(authorizeWorkspaceResource({ actorWorkspaceId: 10, resourceWorkspaceId: 10, actorRole: "reviewer", permission: "review_scenario" }), true);
  const workspace = read("../app/workspace.ts");
  assert.match(workspace, /roleHasPermission\(role, "manage_workspace"\)/);
  assert.match(workspace, /roleHasPermission\(role, "prepare_scenario"\)/);
  assert.match(workspace, /roleHasPermission\(role, "review_scenario"\)/);
});

test("sensitive workspace routes keep database-level tenant predicates", () => {
  const routes = [
    ["../app/api/audit-events/route.ts", /WHERE id = \? AND workspace_id = \?/],
    ["../app/api/security-agent/route.ts", /id = \? AND workspace_id = \?/],
  ];
  for (const [path, predicate] of routes) assert.match(read(path), predicate, path);
});

test("account rights rotate sessions, preserve a pseudonymous trail and restrict member exports", () => {
  const account = read("../app/api/account/route.ts");
  const governance = read("../app/security-governance.ts");
  assert.match(account, /individual_account_only/);
  assert.match(account, /memberWorkspaceDataExcluded/);
  assert.match(account, /verifyPassword/);
  assert.match(account, /createSession\(user\.id\)/);
  assert.match(account, /account_correction/);
  assert.match(account, /account_deletion/);
  assert.match(account, /findingEvents/);
  assert.match(account, /DELETE FROM security_finding_events WHERE workspace_id/);
  assert.match(account, /UPDATE security_findings SET assigned_user_id = NULL/);
  assert.match(governance, /privacy_request_events|privacyRequestEvents/);
  assert.match(governance, /HMAC/);
  assert.doesNotMatch(governance, /detailsJson:\s*JSON\.stringify\(\{[^}]*email/);
});

test("incident register is admin-only, append-only in events and tracks notification decisions", () => {
  const route = read("../app/api/admin/security/incidents/route.ts");
  const privacyRequests = read("../app/api/admin/security/privacy-requests/route.ts");
  const plan = read("../docs/security/incident-response.md");
  assert.match(route, /getPlatformAdminUser/);
  assert.match(route, /securityIncidentEvents/);
  assert.match(route, /authorityNotification/);
  assert.match(route, /dataSubjectNotification/);
  assert.match(route, /incident\.created/);
  assert.match(plan, /preservando request IDs|preservando request IDs/i);
  assert.match(plan, /revisão pós-incidente/i);
  assert.match(privacyRequests, /getPlatformAdminUser/);
  assert.doesNotMatch(privacyRequests, /users\.email|users\.name|detailsJson/);
});

test("edge telemetry gives every request one correlation id without logging query strings", () => {
  const worker = read("../worker/index.ts");
  const telemetry = read("../app/api-infrastructure.ts");
  assert.match(worker, /instrumentedHeaders\.set\("x-request-id", requestId\)/);
  assert.match(worker, /event: "edge\.request"/);
  assert.match(worker, /route: url\.pathname/);
  assert.doesNotMatch(worker, /route: request\.url/);
  assert.match(telemetry, /request\.headers\.get\("x-request-id"\)/);
});

test("backup verification refuses production as restore destination", () => {
  const script = read("../scripts/d1-backup-verify.mjs");
  const policy = read("../docs/security/backup-restore.md");
  assert.match(script, /restoreDatabase === database/);
  assert.match(script, /RESTORE_DEDICATED_TEST_DATABASE/);
  assert.match(script, /rmSync\(backupDirectory/);
  assert.match(policy, /Teste de restauração.*mensal/i);
});

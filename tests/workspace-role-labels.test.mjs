import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { workspaceAccountRoleLabel } from "../domain/workspace-role-labels.ts";

test("only a platform administrator is presented as the platform owner", () => {
  assert.equal(workspaceAccountRoleLabel("individual", "owner", true), "Proprietário");
  assert.equal(workspaceAccountRoleLabel("individual", "owner", false), "Contador independente");
  assert.equal(workspaceAccountRoleLabel("office", "owner", false), "Responsável pelo escritório");
});

test("workspace team roles keep their operational labels", () => {
  assert.equal(workspaceAccountRoleLabel("office", "admin", false), "Administrador");
  assert.equal(workspaceAccountRoleLabel("office", "reviewer", false), "Revisor");
  assert.equal(workspaceAccountRoleLabel("office", "preparer", false), "Preparador");
});

test("the app decides platform ownership on the server and does not infer it from workspace ownership", () => {
  const page = fs.readFileSync(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app/app/CBSHubApp.tsx", import.meta.url), "utf8");
  assert.match(page, /isPlatformAdminEmail\(user\.email\)/);
  assert.match(app, /workspaceAccountRoleLabel\(workspace\.type, workspace\.role, isPlatformAdmin\)/);
  assert.doesNotMatch(app, /workspace\.role === "owner" \? "Proprietário"/);
});

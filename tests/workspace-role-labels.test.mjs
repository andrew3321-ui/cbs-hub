import assert from "node:assert/strict";
import test from "node:test";
import { workspaceAccountRoleLabel } from "../domain/workspace-role-labels.ts";

test("only a platform administrator is presented as the platform owner", () => {
  assert.equal(workspaceAccountRoleLabel("individual", "owner", true), "Proprietário");
  assert.equal(workspaceAccountRoleLabel("individual", "owner", false), "Responsável pelo ambiente");
  assert.equal(workspaceAccountRoleLabel("office", "owner", false), "Responsável pelo workspace");
});

test("workspace team roles keep their operational labels", () => {
  assert.equal(workspaceAccountRoleLabel("office", "admin", false), "Administrador");
  assert.equal(workspaceAccountRoleLabel("office", "reviewer", false), "Analista");
  assert.equal(workspaceAccountRoleLabel("office", "preparer", false), "Operador");
});

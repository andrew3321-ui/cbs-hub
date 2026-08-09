import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { planDefinitions } from "../domain/plan-entitlements.ts";

test("office plan has unlimited workspace members without per-seat billing", async () => {
  const [membersRoute, pricing, app] = await Promise.all([
    readFile(new URL("../app/api/office/members/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/planos/PricingClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/CBSHubApp.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(planDefinitions.escritorio.officeCollaborationEnabled, true);
  assert.equal(planDefinitions.escritorio.workspaceMemberLimit, null);
  assert.match(membersRoute, /officeCollaborationEnabled/);
  assert.doesNotMatch(membersRoute, /memberLimit|seatLimit|limite_de_membros/);
  assert.match(pricing, /sem pagar por usuário/);
  assert.match(pricing, /Pessoas e convites ilimitados no workspace/);
  assert.match(app, /ativos · ilimitado/);
});

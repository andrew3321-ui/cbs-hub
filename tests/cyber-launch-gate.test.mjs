import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("launch offer is explicit, non-purchasable and consistently gated", async () => {
  const [offer, appPage, agentRoute, auth, landing, migration, register, entitlements] = await Promise.all([
    source("domain/cyber-commercial.ts"),
    source("app/app/page.tsx"),
    source("app/api/security-agent/route.ts"),
    source("app/auth-ui/AuthScreen.tsx"),
    source("app/CybersecurityLanding.tsx"),
    source("drizzle/0061_cyber_launch_gate.sql"),
    source("app/api/auth/register/route.ts"),
    source("app/plan-entitlements.ts"),
  ]);
  assert.match(offer, /priceCents:\s*29_700/);
  assert.match(offer, /purchaseEnabled:\s*false/);
  assert.match(appPage, /workspaceAccessAllowed/);
  assert.match(appPage, /CyberLaunchGate/);
  assert.match(agentRoute, /CYBER_LAUNCH_GATE/);
  assert.match(auth, /Nenhuma cobrança começa agora/);
  assert.match(landing, /formatCyberPrice/);
  assert.match(migration, /cyber_launch_gate_enabled', 'true'/);
  assert.match(register, /trialReserved/);
  assert.match(register, /status: operation\.cyberLaunchGateEnabled \? "reserved" : "active"/);
  assert.match(entitlements, /trial\?\.status === "reserved"/);
});

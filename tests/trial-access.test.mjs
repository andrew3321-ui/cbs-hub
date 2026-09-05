import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { applyPlanUsage, resolveWorkspacePlan } from "../domain/plan-entitlements.ts";
import {
  TRIAL_SCOPE_LIMIT,
  TRIAL_DURATION_DAYS,
  trialAccessIsActive,
  trialDaysRemaining,
  trialDeviceIdIsValid,
  trialEndsAt,
  trialFingerprintIsValid,
} from "../domain/trial.ts";

const startedAt = "2026-07-25T12:00:00.000Z";
const endsAt = "2026-07-30T12:00:00.000Z";
const trial = { startedAt, endsAt, status: "active" };
const noBilling = { planKey: "beta", status: "beta", providerSubscriptionId: null, nextPaymentAt: null };

test("trial lasts exactly five days and expires at the boundary", () => {
  assert.equal(TRIAL_DURATION_DAYS, 5);
  assert.equal(TRIAL_SCOPE_LIMIT, 3);
  assert.equal(trialEndsAt(startedAt), endsAt);
  assert.equal(trialAccessIsActive(trial, Date.parse(startedAt)), true);
  assert.equal(trialAccessIsActive(trial, Date.parse(endsAt) - 1), true);
  assert.equal(trialAccessIsActive(trial, Date.parse(endsAt)), false);
  assert.equal(trialDaysRemaining(trial, Date.parse(startedAt)), 5);
  assert.equal(trialDaysRemaining(trial, Date.parse(endsAt) - 1), 1);
  assert.equal(trialDaysRemaining(trial, Date.parse(endsAt)), 0);
});

test("active trial grants defensive features and enforces three domains", () => {
  const now = Date.parse("2026-07-27T12:00:00.000Z");
  const plan = resolveWorkspacePlan({ platformOwner: false, betaEnabled: false, billing: noBilling, trial }, now);
  assert.equal(plan.key, "trial");
  for (const feature of [
    "securityAgentEnabled",
    "scheduledMonitoringEnabled",
    "aiAssessmentEnabled",
    "evidenceHistoryEnabled",
    "officeCollaborationEnabled",
  ]) assert.equal(plan[feature], true, feature);

  const two = applyPlanUsage(plan, noBilling, 2, trial, now);
  assert.equal(two.scopeLimit, 3);
  assert.equal(two.scopeRemaining, 1);
  assert.equal(two.canCreateScope, true);
  assert.equal(two.trialActive, true);
  assert.equal(two.trialDaysRemaining, 3);

  const three = applyPlanUsage(plan, noBilling, 3, trial, now);
  assert.equal(three.scopeLimitReached, true);
  assert.equal(three.canCreateScope, false);
});

test("paid access overrides trial and an expired trial cannot fall into unlimited beta", () => {
  const paid = { planKey: "unico", status: "active", providerSubscriptionId: "sub-1", nextPaymentAt: null };
  assert.equal(resolveWorkspacePlan({ platformOwner: false, betaEnabled: true, billing: paid, trial }, Date.parse("2026-07-27T12:00:00.000Z")).key, "unico");
  assert.equal(resolveWorkspacePlan({ platformOwner: false, betaEnabled: true, billing: noBilling, trial }, Date.parse(endsAt)).key, "beta");
  assert.equal(resolveWorkspacePlan({ platformOwner: false, betaEnabled: true, billing: noBilling, trial: null }, Date.parse(endsAt)).key, "global_beta");
  assert.equal(resolveWorkspacePlan({ platformOwner: true, betaEnabled: true, billing: noBilling, trial }, Date.parse(endsAt)).key, "owner");
});

test("device evidence accepts only strong identifiers and fixed digests", () => {
  assert.equal(trialDeviceIdIsValid("b0ce19c8-8657-4b9d-b1d1-a5bc55a6fb11"), true);
  assert.equal(trialDeviceIdIsValid("a".repeat(64)), true);
  assert.equal(trialDeviceIdIsValid("short"), false);
  assert.equal(trialFingerprintIsValid("f".repeat(64)), true);
  assert.equal(trialFingerprintIsValid("f".repeat(63)), false);
});

test("registration claims trial once and stores only pseudonymous server hashes", () => {
  const register = fs.readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");
  const protection = fs.readFileSync(new URL("../app/trial-protection.ts", import.meta.url), "utf8");
  const schema = fs.readFileSync(new URL("../db/schema.ts", import.meta.url), "utf8");
  const privacy = fs.readFileSync(new URL("../app/privacidade/page.tsx", import.meta.url), "utf8");
  assert.match(register, /onConflictDoNothing\(\)/);
  assert.match(register, /device_already_used/);
  assert.match(register, /inviteToken \? null : await buildTrialClaimIdentity/);
  assert.match(protection, /HMAC/);
  assert.match(protection, /HttpOnly; SameSite=Lax/);
  assert.match(protection, /SECURITY_HASH_KEY/);
  assert.match(protection, /SECURITY_HASH_KEYS_PREVIOUS/);
  assert.match(protection, /historicalHashes/);
  assert.match(register, /inArray\(trialDeviceClaims\.deviceHash/);
  assert.match(schema, /deviceHash: text\("device_hash"\)\.notNull\(\)\.unique\(\)/);
  assert.match(schema, /fingerprintHash: text\("fingerprint_hash"\)\.notNull\(\)\.unique\(\)/);
  assert.match(schema, /emailHash: text\("email_hash"\)\.notNull\(\)\.unique\(\)/);
  assert.match(privacy, /até 365 dias/);
  assert.doesNotMatch(schema, /userAgent|screenWidth|canvas/);
});

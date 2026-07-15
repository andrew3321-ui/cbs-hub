import assert from "node:assert/strict";
import test from "node:test";
import { buildScenarioSnapshot, hashScenarioInput, parseScenarioSnapshot, valuesFromSnapshot } from "../app/scenario-reliability.ts";
import { LEGACY_SCENARIO_SIGNATURE_VERSION, SCENARIO_SIGNATURE_VERSION, signScenarioRecordVersionWithSecret, signScenarioRecordWithSecret, verifyScenarioRecordWithSecret } from "../app/scenario-signing-core.ts";
import { approvalRecordFromStored, OFFICE_SECOND_REVIEW_DECLARATION_VERSION, RESPONSIBLE_REVIEW_DECLARATION_VERSION, SCENARIO_APPROVAL_SIGNATURE_VERSION, signScenarioApprovalWithSecret, verifyScenarioApprovalWithSecret } from "../app/scenario-approval-core.ts";

const storedInput = {
  revenueCents: 20_000_000,
  currentRateBps: 865,
  newRateBps: 1345,
  costRateBps: 5200,
  fixedCostsCents: 2_500_000,
  volumeLossBps: 500,
  priceAdjustmentBps: 800,
  targetYear: 2027,
  rateSource: "custom",
  sourceNote: "Memória de cálculo identificada pelo responsável.",
};

test("snapshot financeiro usa centavos e pontos-base serializáveis", () => {
  const snapshot = buildScenarioSnapshot(storedInput);
  const serialized = JSON.stringify(snapshot);
  const parsed = parseScenarioSnapshot(serialized);
  assert.ok(parsed);
  assert.equal(parsed.format, "cents-and-bps-v1");
  assert.ok(Number.isInteger(parsed.projectedMarginCents));
  assert.ok(!serialized.includes("Infinity"));
});

test("resultado congelado não muda quando uma entrada posterior muda", () => {
  const snapshot = buildScenarioSnapshot(storedInput);
  const frozen = valuesFromSnapshot(snapshot);
  const changed = buildScenarioSnapshot({ ...storedInput, newRateBps: 2500 });
  assert.notEqual(changed.projectedMarginCents, snapshot.projectedMarginCents);
  assert.equal(valuesFromSnapshot(snapshot).projectedMargin, frozen.projectedMargin);
});

test("hash é determinístico e cobre a proveniência", async () => {
  const first = await hashScenarioInput(storedInput);
  const same = await hashScenarioInput({ ...storedInput });
  const changedSource = await hashScenarioInput({ ...storedInput, sourceNote: "Outra memória de cálculo documentada." });
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, same);
  assert.notEqual(first, changedSource);
});

test("assinatura aceita registro íntegro e rejeita adulteração de qualquer campo crítico", async () => {
  const snapshotJson = JSON.stringify(buildScenarioSnapshot(storedInput));
  const record = { ownerUserId: 7, companyId: 11, name: "Cenário assinado", ...storedInput, snapshotJson, calculationVersion: "mc-margin-1.0.0", methodologyVersion: "rtc-foundation-2026.07", calculatedAt: "2026-07-14T19:00:00.000Z", supersedesScenarioId: null };
  const secret = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres";
  const signature = await signScenarioRecordWithSecret(record, secret);
  assert.equal(await verifyScenarioRecordWithSecret(record, signature, SCENARIO_SIGNATURE_VERSION, secret), true);
  assert.equal(await verifyScenarioRecordWithSecret({ ...record, newRateBps: record.newRateBps + 1 }, signature, SCENARIO_SIGNATURE_VERSION, secret), false);
  assert.equal(await verifyScenarioRecordWithSecret({ ...record, snapshotJson: snapshotJson.replace("projectedTaxCents", "projectedTaxTamperedCents") }, signature, SCENARIO_SIGNATURE_VERSION, secret), false);
  assert.equal(await verifyScenarioRecordWithSecret({ ...record, companyId: 12 }, signature, SCENARIO_SIGNATURE_VERSION, secret), false);
  assert.equal(await verifyScenarioRecordWithSecret({ ...record, supersedesScenarioId: 99 }, signature, SCENARIO_SIGNATURE_VERSION, secret), false);
  const legacySignature = await signScenarioRecordVersionWithSecret(record, LEGACY_SCENARIO_SIGNATURE_VERSION, secret);
  assert.equal(await verifyScenarioRecordWithSecret(record, legacySignature, LEGACY_SCENARIO_SIGNATURE_VERSION, secret), true);
  assert.equal(await verifyScenarioRecordWithSecret({ ...record, supersedesScenarioId: 99 }, legacySignature, LEGACY_SCENARIO_SIGNATURE_VERSION, secret), false);
});

test("aprovação responsável assina identidade, registro e versão sem fingir revisão independente", async () => {
  const secret = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres";
  const record = {
    scenarioId: 31,
    companyId: 11,
    ownerUserId: 7,
    reviewerUserId: 7,
    reviewerName: "Contadora Responsável",
    reviewerEmail: "contadora@example.com",
    professionalRegistration: "CRC SP-123456/O-7",
    assuranceLevel: "responsible_self_review",
    credentialVerification: "self_declared",
    decision: "approved",
    declarationVersion: RESPONSIBLE_REVIEW_DECLARATION_VERSION,
    scenarioInputHash: "a".repeat(64),
    scenarioRecordSignature: "b".repeat(64),
    decisionNote: "Premissas e memória revisadas.",
    decidedAt: "2026-07-15T12:00:00.000Z",
  };
  const signature = await signScenarioApprovalWithSecret(record, secret);
  assert.equal(await verifyScenarioApprovalWithSecret(record, signature, SCENARIO_APPROVAL_SIGNATURE_VERSION, secret), true);
  assert.equal(await verifyScenarioApprovalWithSecret({ ...record, professionalRegistration: "CRC SP-999999/O-9" }, signature, SCENARIO_APPROVAL_SIGNATURE_VERSION, secret), false);
  assert.equal(await verifyScenarioApprovalWithSecret({ ...record, scenarioInputHash: "c".repeat(64) }, signature, SCENARIO_APPROVAL_SIGNATURE_VERSION, secret), false);
  assert.equal(approvalRecordFromStored({ ...record, assuranceLevel: "independent_review" }), null);
});

test("segunda revisão do escritório vincula um revisor distinto à mesma versão congelada", async () => {
  const secret = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres";
  const record = {
    scenarioId: 44,
    companyId: 11,
    ownerUserId: 7,
    reviewerUserId: 9,
    reviewerName: "Revisor do Escritório",
    reviewerEmail: "revisor@example.com",
    professionalRegistration: "CRC SP-654321/O-1",
    assuranceLevel: "office_second_person_review",
    credentialVerification: "self_declared",
    decision: "approved",
    declarationVersion: OFFICE_SECOND_REVIEW_DECLARATION_VERSION,
    scenarioInputHash: "d".repeat(64),
    scenarioRecordSignature: "e".repeat(64),
    decisionNote: "Memória e premissas conferidas por segunda pessoa.",
    decidedAt: "2026-07-16T12:00:00.000Z",
  };
  const signature = await signScenarioApprovalWithSecret(record, secret);
  assert.equal(await verifyScenarioApprovalWithSecret(record, signature, SCENARIO_APPROVAL_SIGNATURE_VERSION, secret), true);
  assert.equal(await verifyScenarioApprovalWithSecret({ ...record, reviewerUserId: 7 }, signature, SCENARIO_APPROVAL_SIGNATURE_VERSION, secret), false);
  assert.equal(approvalRecordFromStored(record)?.assuranceLevel, "office_second_person_review");
});

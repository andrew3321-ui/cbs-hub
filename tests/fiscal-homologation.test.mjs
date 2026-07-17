import assert from "node:assert/strict";
import test from "node:test";

import {
  createFiscalHomologationSnapshot,
  expectedOutcomeFromHomologation,
  fiscalHomologationEligibilityError,
  hashFiscalHomologationText,
  parseFiscalHomologationSnapshot,
} from "../domain/fiscal-homologation.ts";
import {
  FISCAL_HOMOLOGATION_SIGNATURE_VERSION,
  signFiscalHomologationWithSecret,
  verifyFiscalHomologationWithSecret,
} from "../domain/fiscal-homologation-signing.ts";
import { evaluateExpandedFiscalQuestion } from "../domain/fiscal-intelligence-v24.ts";

const question = "Qual a aliquota de ICMS para autopecas de SP para MG?";
const facts = {
  tax: "ICMS",
  segment: "auto_parts",
  originState: "SP",
  destinationState: "MG",
  productDescription: "Partes e acessorios dos veiculos automoveis",
  ncm: "8708",
  cest: "01.075.00",
  productOrigin: "domestic",
  issuerTaxRegime: "normal",
  recipientTaxpayer: "yes",
  purpose: "resale",
  automotiveUse: "yes",
  specialTreatment: "none",
};
const baseHash = "a".repeat(64);

test("only complete and reproducible engine answers can become homologation candidates", () => {
  const complete = evaluateExpandedFiscalQuestion(question, facts);
  assert.equal(complete.completeness.percentage, 100);
  assert.equal(fiscalHomologationEligibilityError(complete), null);

  const incomplete = evaluateExpandedFiscalQuestion(question, { tax: "ICMS", originState: "SP", destinationState: "MG" });
  assert.match(fiscalHomologationEligibilityError(incomplete), /Complete|pend|reproduz/i);
});

test("homologation snapshot freezes evidence and produces stable expected regression output", async () => {
  const result = evaluateExpandedFiscalQuestion(question, facts);
  const snapshot = createFiscalHomologationSnapshot(question, result, baseHash, "2026-07-16T12:00:00.000Z");
  const snapshotJson = JSON.stringify(snapshot);
  const hash = await hashFiscalHomologationText(snapshotJson);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(parseFiscalHomologationSnapshot(snapshotJson)?.evidence.baseHash, baseHash);

  const expected = expectedOutcomeFromHomologation(snapshot);
  assert.equal(expected.topicCode, "ICMS-SP-MG-AUTO-PARTS");
  assert.equal(expected.findings.some((finding) => finding.value === "12%"), true);
  assert.deepEqual(expected.sourceCodes, [...expected.sourceCodes].sort());
  assert.notEqual(await hashFiscalHomologationText(JSON.stringify({ ...snapshot, question: `${question} alterada` })), hash);
});

test("professional decision signature detects any tampering", async () => {
  const record = {
    caseId: "case-1",
    workspaceId: 7,
    snapshotHash: "b".repeat(64),
    baseHash,
    reviewerUserId: 42,
    professionalRegistration: "CRC-SP 123456/O-0",
    comparisonOutcome: "matches",
    expectedJson: JSON.stringify({ rate: "12%" }),
    decidedAt: "2026-07-16T13:00:00.000Z",
  };
  const secret = "test-only-signing-secret-with-at-least-32-characters";
  const signature = await signFiscalHomologationWithSecret(record, secret);
  assert.equal(await verifyFiscalHomologationWithSecret(record, signature, FISCAL_HOMOLOGATION_SIGNATURE_VERSION, secret), true);
  assert.equal(await verifyFiscalHomologationWithSecret({ ...record, expectedJson: JSON.stringify({ rate: "7%" }) }, signature, FISCAL_HOMOLOGATION_SIGNATURE_VERSION, secret), false);
  assert.equal(await verifyFiscalHomologationWithSecret(record, signature, "unknown", secret), false);
});

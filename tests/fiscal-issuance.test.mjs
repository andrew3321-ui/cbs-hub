import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  fiscalDataComplete,
  fiscalIssuanceAdapter,
  fiscalPendingReason,
  maskFiscalTaxId,
  normalizeDocumentReference,
  normalizeSha256,
} from "../domain/fiscal-issuance.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("fiscal data classification requires the correct tax identifier and service facts", () => {
  assert.equal(fiscalDataComplete({ customerType: "individual", customerTaxId: "12345678901", serviceCode: "1.09", serviceDescription: "Assinatura CBSHub" }), true);
  assert.equal(fiscalDataComplete({ customerType: "legal_entity", customerTaxId: "12345678000199", serviceCode: "1.09", serviceDescription: "Assinatura CBSHub" }), true);
  assert.equal(fiscalDataComplete({ customerType: "legal_entity", customerTaxId: "123", serviceCode: "1.09", serviceDescription: "Assinatura CBSHub" }), false);
  assert.equal(maskFiscalTaxId("12345678901"), "***.***.789-01");
  assert.equal(maskFiscalTaxId("12345678000199"), "**.***.678/0001-99");
});

test("the queue exposes an objective reason for every operational state", () => {
  const base = { customerType: "unknown", customerTaxId: "", noteRequested: false, serviceCode: "", serviceDescription: "" };
  assert.match(fiscalPendingReason({ ...base, status: "pending_data" }), /Faltam/);
  assert.match(fiscalPendingReason({ ...base, status: "pending_issue" }), /falta emitir/);
  assert.equal(fiscalPendingReason({ ...base, status: "failed", failureReason: "Código municipal rejeitado" }), "Código municipal rejeitado");
  assert.match(fiscalPendingReason({ ...base, status: "issued", nfseNumber: "1" }), /sem link oficial/);
  assert.match(fiscalPendingReason({ ...base, status: "canceled", cancelReason: "Cancelada no emissor" }), /Cancelada no emissor/);
});

test("document references are minimized and hashes are strictly validated", () => {
  assert.equal(normalizeDocumentReference("https://user:pass@example.com/doc.pdf#secret"), "https://example.com/doc.pdf");
  assert.equal(normalizeDocumentReference("fiscal/2026/07/documento.xml"), "fiscal/2026/07/documento.xml");
  assert.equal(normalizeDocumentReference("javascript:alert(1)"), null);
  assert.equal(normalizeSha256("a".repeat(64)), "a".repeat(64));
  assert.equal(normalizeSha256("not-a-hash"), null);
});

test("manual adapter is explicit and never pretends to issue automatically", async () => {
  const adapter = fiscalIssuanceAdapter("manual");
  assert.ok(adapter);
  assert.equal(adapter.automatic, false);
  assert.deepEqual(await adapter.submit({ issuanceId: 1, requestKey: "fiscal:1", amountCents: 45000, competenceMonth: "2026-07" }), {
    kind: "manual_required",
    reason: "Emissão manual: use o emissor oficial e registre o resultado no CBSHub.",
  });
  assert.equal(fiscalIssuanceAdapter("provider-not-implemented"), null);
});

test("schema, reconciliation and admin flow enforce idempotency and audited transitions", async () => {
  const [schema, migration, card, pix, admin, terms, privacy] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/0030_grey_pandemic.sql"),
    read("app/billing-reconciliation.ts"),
    read("app/billing-pix.ts"),
    read("app/api/admin/billing/route.ts"),
    read("app/termos/page.tsx"),
    read("app/privacidade/page.tsx"),
  ]);
  assert.match(schema, /fiscalIssuanceEvents/);
  assert.match(schema, /uniqueIndex\("fiscal_issuances_request_key_idx"\)/);
  assert.match(schema, /uniqueIndex\("fiscal_issuances_provider_document_idx"\)/);
  assert.match(migration, /UPDATE `fiscal_issuances` SET `request_key` = 'fiscal:' \|\| `transaction_id`/);
  assert.match(card, /requestKey: `fiscal:\$\{transaction\.id\}`/);
  assert.match(pix, /requestKey: `fiscal:\$\{transaction\.id\}`/);
  assert.match(card, /\["issued", "canceled", "failed", "not_required"\]/);
  assert.match(pix, /\["issued", "canceled", "failed", "not_required"\]/);
  for (const action of ["fiscal_data_classified", "issuance_registered", "manual_action_required", "issuance_failed", "issuance_canceled", "issuance_reopened"]) {
    assert.match(admin, new RegExp(action));
  }
  assert.match(admin, /customerTaxId: null/);
  assert.match(admin, /normalizeDocumentReference/);
  assert.match(terms, /não promete emissão automática/);
  assert.match(privacy, /referências com hash do PDF\/XML/);
});

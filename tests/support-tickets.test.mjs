import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canTransitionSupportStatus,
  createSupportProtocol,
  isSupportCategory,
  isSupportModule,
  supportResponseDueAt,
  supportTextHasSensitiveData,
  validSupportTraceCode,
} from "../domain/support-tickets.ts";

test("support protocol is dated, stable and safe to show to users", () => {
  assert.equal(
    createSupportProtocol(new Date("2026-07-29T12:00:00.000Z"), "00112233-4455-6677-8899-aabbccddeeff"),
    "CBS-20260729-00112233",
  );
});

test("support SLA counts business days instead of elapsed days", () => {
  assert.equal(supportResponseDueAt(new Date("2026-07-31T14:00:00.000Z")), "2026-08-04T23:59:59.999Z");
  assert.equal(supportResponseDueAt(new Date("2026-07-29T14:00:00.000Z")), "2026-07-31T23:59:59.999Z");
});

test("support taxonomy and status transitions are closed allowlists", () => {
  assert.equal(isSupportCategory("scan_result"), true);
  assert.equal(isSupportCategory("change_rule"), false);
  assert.equal(isSupportModule("security_agent"), true);
  assert.equal(isSupportModule("../../admin"), false);
  assert.equal(canTransitionSupportStatus("open", "in_analysis"), true);
  assert.equal(canTransitionSupportStatus("closed", "resolved"), false);
  assert.equal(canTransitionSupportStatus("resolved", "in_analysis"), true);
});

test("support input blocks common personal identifiers and secrets", () => {
  assert.equal(supportTextHasSensitiveData("Cliente com CPF 057.784.785-69"), true);
  assert.equal(supportTextHasSensitiveData("CNPJ 64.297.777/0001-42"), true);
  assert.equal(supportTextHasSensitiveData("Contato pessoa@empresa.com.br"), true);
  assert.equal(supportTextHasSensitiveData("token APP_USR-12345678901234567890"), true);
  assert.equal(supportTextHasSensitiveData("O relatório indica um cabeçalho ausente"), false);
  assert.equal(validSupportTraceCode("MC-CHECKOUT-UNAVAILABLE"), true);
  assert.equal(validSupportTraceCode("token secreto"), false);
});

test("support API attaches server context and isolates the workspace", () => {
  const source = readFileSync(new URL("../app/api/support-tickets/route.ts", import.meta.url), "utf8");
  assert.match(source, /CF_VERSION_METADATA/);
  assert.match(source, /eq\(supportTickets\.workspaceId, workspace\.id\)/);
  assert.match(source, /dataMinimizationAccepted !== true/);
  assert.match(source, /isPlatformAdminEmail/);
  assert.match(source, /support_ticket_events/);
  assert.doesNotMatch(source, /verification_token|OPENAI_API_KEY/);
});

test("LGPD access and deletion flows include support records", () => {
  const accountSource = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
  const privacySource = readFileSync(new URL("../domain/privacy-governance.ts", import.meta.url), "utf8");
  assert.match(accountSource, /support: \{ tickets: supportRows, events: supportEventRows \}/);
  assert.match(accountSource, /deleteSupportTickets\(eq\(supportTickets\.reporterUserId, user\.id\)\)/);
  assert.match(accountSource, /deleteSupportTickets\(eq\(supportTickets\.workspaceId, workspace\.id\)\)/);
  assert.match(privacySource, /category: "Suporte e feedback"/);
  assert.match(privacySource, /support_ticket_events/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACCOUNT_ONBOARDING_STAGE_COUNT,
  ACCOUNT_ONBOARDING_VERSION,
  isolatedDemonstrationCase,
  onboardingActionWarnings,
  onboardingCompletionPercentage,
  onboardingCoverageExplanation,
  onboardingIsComplete,
  onboardingModuleGuides,
  onboardingTrackFor,
  sanitizeOnboardingCompletedItems,
} from "../domain/account-onboarding.ts";

const root = new URL("../", import.meta.url);

test("roteiro inicial distingue contador independente de escritório", () => {
  const individual = onboardingTrackFor("individual");
  const office = onboardingTrackFor("office");
  assert.equal(individual.length, 7);
  assert.equal(office.length, 9);
  assert.equal(new Set(individual.map((item) => item.id)).size, individual.length);
  assert.equal(new Set(office.map((item) => item.id)).size, office.length);
  assert.equal(individual.some((item) => item.id === "office-roles-understood"), false);
  assert.equal(office.some((item) => item.id === "office-roles-understood"), true);
  assert.equal(office.some((item) => item.id === "review-queue-understood"), true);
  for (const item of [...individual, ...office]) {
    assert.equal(item.title.length > 10, true);
    assert.equal(item.evidence.length > 20, true);
    assert.equal(item.actionLabel.length > 3, true);
  }
});

test("progresso aceita apenas itens da trilha e só conclui em 100%", () => {
  const individualIds = onboardingTrackFor("individual").map((item) => item.id);
  assert.deepEqual(
    sanitizeOnboardingCompletedItems("individual", [individualIds[0], individualIds[0], "office-roles-understood", 10]),
    [individualIds[0]],
  );
  assert.equal(onboardingCompletionPercentage("individual", []), 0);
  assert.equal(onboardingCompletionPercentage("individual", individualIds.slice(0, 3)), 43);
  assert.equal(onboardingIsComplete("individual", individualIds.slice(0, -1)), false);
  assert.equal(onboardingIsComplete("individual", individualIds), true);
  assert.match(ACCOUNT_ONBOARDING_VERSION, /^accountant-onboarding\.v\d+$/);
  assert.equal(ACCOUNT_ONBOARDING_STAGE_COUNT, 4);
});

test("caso demonstrativo é preenchido, aritmeticamente fechado e isolado", () => {
  const demo = isolatedDemonstrationCase;
  assert.match(demo.label, /^DEMONSTRAÇÃO/);
  assert.equal(demo.coverage, "partial");
  assert.equal(demo.facts.length >= 5, true);
  assert.equal(demo.documents.length >= 4, true);
  assert.equal(demo.result.projectedTaxCents - demo.result.currentTaxCents, demo.result.monthlyTaxDeltaCents);
  assert.equal(10_000_000 - 6_500_000 - 1_000_000 - demo.result.currentTaxCents, demo.result.currentMarginCents);
  assert.equal(10_000_000 - 6_500_000 - 1_000_000 - demo.result.projectedTaxCents, demo.result.projectedMarginCents);
  assert.match(demo.nature, /não é apuração fiscal/);
  assert.equal(demo.limits.some((limit) => /Nada.*salvo/i.test(limit)), true);
});

test("guia cobre todos os módulos de trabalho com fatos, documentos e limites", () => {
  assert.equal(onboardingModuleGuides.length, 13);
  assert.equal(new Set(onboardingModuleGuides.map((guide) => guide.code)).size, onboardingModuleGuides.length);
  const requiredTargets = ["overview", "companies", "simulator", "reviews", "documents", "team", "intelligence", "taxlab", "coverage", "expansion", "rules", "determination", "academy"];
  assert.deepEqual(new Set(onboardingModuleGuides.map((guide) => guide.target)), new Set(requiredTargets));
  for (const guide of onboardingModuleGuides) {
    assert.equal(guide.purpose.length > 20, true, guide.code);
    assert.equal(guide.minimumFacts.length >= 3, true, guide.code);
    assert.equal(guide.expectedDocuments.length >= 2, true, guide.code);
    assert.equal(guide.explicitLimits.length >= 2, true, guide.code);
  }
});

test("estados suportado, parcial e não suportado têm consequência operacional escrita", () => {
  assert.deepEqual(onboardingCoverageExplanation.map((item) => item.status), ["supported", "partial", "not_supported"]);
  assert.deepEqual(onboardingCoverageExplanation.map((item) => item.label), ["Suportado", "Parcial", "Não suportado"]);
  for (const item of onboardingCoverageExplanation) {
    assert.equal(item.meaning.length > 30, true);
    assert.equal(item.consequence.length > 30, true);
  }
});

test("salvar, aprovar e entregar possuem conferências específicas", () => {
  assert.deepEqual(Object.keys(onboardingActionWarnings), ["save", "approve", "deliver"]);
  for (const warning of Object.values(onboardingActionWarnings)) {
    assert.equal(warning.checks.length, 4);
    assert.equal(warning.checks.every((check) => check.length > 25), true);
  }
});

test("API persiste progresso por usuário, workspace e versão sem localStorage", async () => {
  const [route, schema, migration] = await Promise.all([
    readFile(new URL("app/api/onboarding/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0028_military_inertia.sql", root), "utf8"),
  ]);
  assert.match(route, /workspaceOnboardingProgress\.workspaceId/);
  assert.match(route, /workspaceOnboardingProgress\.userId/);
  assert.match(route, /ACCOUNT_ONBOARDING_VERSION/);
  assert.match(route, /sanitizeOnboardingCompletedItems/);
  assert.match(route, /onConflictDoUpdate/);
  assert.match(route, /Object\.hasOwn\(payload, "completedItemIds"\)/);
  assert.match(route, /set: updateSet/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /localStorage|sessionStorage/);
  assert.match(schema, /workspace_onboarding_progress/);
  assert.match(migration, /CREATE TABLE `workspace_onboarding_progress`/);
  assert.match(migration, /workspace_onboarding_user_version_idx/);
});

test("interface oferece retomada, demonstração isolada e confirmação das ações críticas", async () => {
  const [onboardingUi, safetyUi, appUi] = await Promise.all([
    readFile(new URL("app/app/AccountOnboarding.tsx", root), "utf8"),
    readFile(new URL("app/app/ActionSafetyDialog.tsx", root), "utf8"),
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
  ]);
  assert.match(onboardingUi, /PROGRESSO RETOMÁVEL/);
  assert.match(onboardingUi, /Fechar e retomar depois/);
  assert.match(onboardingUi, /AMBIENTE ISOLADO — NÃO É CLIENTE REAL/);
  assert.match(onboardingUi, /GUIA CONTEXTUAL/);
  assert.match(onboardingUi, /COBERTURA E RESPONSABILIDADE/);
  assert.match(onboardingUi, /createPortal/);
  assert.match(safetyUi, /Conferi os itens acima/);
  assert.match(safetyUi, /disabled=\{!acknowledged \|\| busy\}/);
  assert.match(appUi, /mode: "save"/);
  assert.match(appUi, /mode: "deliver"/);
  assert.match(appUi, /onboardingActionWarnings\.approve/);
});

test("contrato responsivo preserva diálogo utilizável em desktop e celular", async () => {
  const css = await readFile(new URL("app/account-onboarding.css", root), "utf8");
  assert.match(css, /max-height: calc\(100vh - 48px\)/);
  assert.match(css, /overflow: auto/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /max-height: 96dvh/);
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.action-safety-backdrop/);
  assert.match(css, /@media \(max-width: 560px\)/);
});

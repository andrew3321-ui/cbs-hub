import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("a experiência publicada contém identidade e rotas comerciais", async () => {
  const [landing, layout, pricing] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/planos/page.tsx", root), "utf8"),
  ]);

  assert.match(landing, /Margem Clara/);
  assert.match(landing, /href="\/planos"/);
  assert.match(layout, /Inteligência tributária/);
  assert.match(layout, /og-accountants\.png/);
  assert.match(pricing, /Beta gratuito ativo/);
  assert.match(pricing, /PricingClient/);
  assert.doesNotMatch(`${landing}\n${layout}`, /codex-preview|_sites-preview|Your site is taking shape/i);
});

test("credenciais de cobrança permanecem somente no servidor", async () => {
  const [client, billing, hosting] = await Promise.all([
    readFile(new URL("app/planos/PricingClient.tsx", root), "utf8"),
    readFile(new URL("app/billing.ts", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
  ]);

  assert.doesNotMatch(client, /MERCADO_PAGO_ACCESS_TOKEN|MERCADO_PAGO_WEBHOOK_SECRET/);
  assert.match(billing, /MERCADO_PAGO_ACCESS_TOKEN/);
  assert.match(billing, /validateMercadoPagoWebhook/);
  assert.doesNotMatch(hosting, /MERCADO_PAGO|ACCESS_TOKEN|WEBHOOK_SECRET/);
});

test("análises publicadas expõem versionamento e não afirmam homologação", async () => {
  const [app, report, methodology, scenariosApi, signing] = await Promise.all([
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/relatorio/[token]/page.tsx", root), "utf8"),
    readFile(new URL("app/metodologia/page.tsx", root), "utf8"),
    readFile(new URL("app/api/scenarios/route.ts", root), "utf8"),
    readFile(new URL("app/scenario-signing.ts", root), "utf8"),
  ]);

  assert.doesNotMatch(app, /Ano teste 2026/);
  assert.match(app, /Origem da alíquota/);
  assert.match(report, /parseScenarioSnapshot/);
  assert.match(report, /Revisado pelo responsável técnico/);
  assert.match(report, /registro autodeclarado/);
  assert.match(methodology, /Snapshot imutável por versão/);
  assert.match(scenariosApi, /hashScenarioInput/);
  assert.match(scenariosApi, /snapshotJson/);
  assert.match(signing, /SCENARIO_SIGNING_KEY_V1/);
  assert.match(report, /integrityBlocked/);
});

test("fluxo remodelado trata o contador como usuário principal e exige aprovação antes da entrega", async () => {
  const [landing, client, approveApi, shareApi, approvalCore, registration, schema, report] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/api/scenarios/approve/route.ts", root), "utf8"),
    readFile(new URL("app/api/report-shares/route.ts", root), "utf8"),
    readFile(new URL("app/scenario-approval-core.ts", root), "utf8"),
    readFile(new URL("app/professional-registration.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/relatorio/[token]/page.tsx", root), "utf8"),
  ]);

  assert.match(landing, /Inteligência tributária para escritórios contábeis/);
  assert.match(client, /CLIENTE ATIVO DO ESCRITÓRIO/);
  assert.match(client, /Aprovar como responsável/);
  assert.match(client, /não será apresentado como revisão independente/);
  assert.match(approveApi, /responsible_self_review/);
  assert.match(approveApi, /credentialVerification: "self_declared"/);
  assert.match(approveApi, /professionalRegistrationError/);
  assert.match(client, /refreshScenarioAfterApproval/);
  assert.match(client, /approval-inline-error/);
  assert.match(registration, /\!\/\[A-Z\]\//);
  assert.match(registration, /\!\/\\d\//);
  assert.match(shareApi, /responsible_approved/);
  assert.match(shareApi, /verifyScenarioApprovalRecord/);
  assert.match(approvalCore, /scenarioInputHash/);
  assert.match(schema, /scenario_approvals_scenario_idx/);
  assert.match(report, /A revisão responsável não equivale a homologação/);
  assert.doesNotMatch(`${client}\n${report}`, /Aguardando validação profissional/);
});

test("cadastro e escritório distinguem plano, papéis e revisão por segunda pessoa", async () => {
  const [auth, client, registerApi, membersApi, approveApi, workspace, schema, report] = await Promise.all([
    readFile(new URL("app/auth-ui/AuthScreen.tsx", root), "utf8"),
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/api/auth/register/route.ts", root), "utf8"),
    readFile(new URL("app/api/office/members/route.ts", root), "utf8"),
    readFile(new URL("app/api/scenarios/approve/route.ts", root), "utf8"),
    readFile(new URL("app/workspace.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/relatorio/[token]/page.tsx", root), "utf8"),
  ]);

  assert.match(auth, /Contador independente/);
  assert.match(auth, /Escritório contábil/);
  assert.match(auth, /Plano Escritório sugerido/);
  assert.match(registerApi, /suggestedPlanKey/);
  assert.match(registerApi, /workspaceMembers/);
  assert.match(membersApi, /Gerar|createWorkspaceInvitationToken/);
  assert.match(client, /Equipe e segregação de revisão/);
  assert.match(client, /Central de Revisão/);
  assert.match(approveApi, /scenario\.preparedByUserId === user\.id/);
  assert.match(approveApi, /office_second_person_review/);
  assert.match(workspace, /canReviewScenarios/);
  assert.match(schema, /workspaceMembers/);
  assert.match(schema, /preparedByUserId/);
  assert.match(report, /Revisado por segundo profissional do escritório/);
  assert.match(report, /não equivale a homologação/);
});

test("central do escritório controla fila, decisões e correções por nova versão", async () => {
  const [client, reviewsApi, reviewRequestApi, approvalApi, scenariosApi, membersApi, accountApi, schema, migration] = await Promise.all([
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/api/reviews/route.ts", root), "utf8"),
    readFile(new URL("app/api/scenarios/review/route.ts", root), "utf8"),
    readFile(new URL("app/api/scenarios/approve/route.ts", root), "utf8"),
    readFile(new URL("app/api/scenarios/route.ts", root), "utf8"),
    readFile(new URL("app/api/office/members/route.ts", root), "utf8"),
    readFile(new URL("app/api/account/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0013_spooky_radioactive_man.sql", root), "utf8"),
  ]);

  assert.match(client, /DISCUSSÃO AUDITÁVEL/);
  assert.match(client, /Criar versão corrigida/);
  assert.match(client, /Preparador nunca aprova a própria versão/);
  assert.match(reviewsApi, /assignedReviewerUserId !== user\.id/);
  assert.match(reviewsApi, /decision === "changes_requested"/);
  assert.match(reviewsApi, /scenario_review_comments/);
  assert.match(reviewRequestApi, /reviewerUserId === scenario\.preparedByUserId/);
  assert.match(reviewRequestApi, /roundNumber/);
  assert.match(approvalApi, /Somente o revisor designado na Central de Revisão/);
  assert.match(approvalApi, /status = 'approved'/);
  assert.match(scenariosApi, /supersedesScenarioId/);
  assert.match(scenariosApi, /status: "superseded"/);
  assert.match(scenariosApi, /reviewStatus !== "draft"/);
  assert.match(membersApi, /revisões pendentes ligadas a este membro/);
  assert.match(accountApi, /reatribuir suas revisões pendentes/);
  assert.match(schema, /scenarioReviewRounds/);
  assert.match(schema, /scenarioReviewComments/);
  assert.match(migration, /CREATE UNIQUE INDEX `scenarios_supersedes_idx`/);
});

test("infraestrutura escalável evita N+1, duplicidade e falhas sem correlação", async () => {
  const [companiesApi, scenariosApi, schema, health, telemetry, client] = await Promise.all([
    readFile(new URL("app/api/companies/route.ts", root), "utf8"),
    readFile(new URL("app/api/scenarios/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/api/health/route.ts", root), "utf8"),
    readFile(new URL("app/api-infrastructure.ts", root), "utf8"),
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
  ]);

  assert.match(companiesApi, /latestScenarioIds/);
  assert.match(companiesApi, /leftJoin\(latestScenarioIds/);
  assert.doesNotMatch(companiesApi, /rows\.map\(async \(company\).*db\.select/s);
  assert.match(scenariosApi, /clientRequestId/);
  assert.match(scenariosApi, /replayed: true/);
  assert.match(schema, /scenarios_request_key_idx/);
  assert.match(client, /pendingScenarioRequest/);
  assert.match(health, /scenarioSigningConfigured/);
  assert.match(telemetry, /X-Request-Id/);
  assert.doesNotMatch(health, /SCENARIO_SIGNING_KEY_V1/);
});

test("catálogo fiscal exige integridade, regressão e homologação antes da execução", async () => {
  const [client, rulesApi, ruleDefinition, schema] = await Promise.all([
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/api/fiscal-rules/route.ts", root), "utf8"),
    readFile(new URL("domain/fiscal-rules.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
  ]);

  assert.match(client, /Catálogo fiscal versionado/);
  assert.match(client, /Sem cálculo automático de valor a recolher/);
  assert.match(rulesApi, /rule\.status === "approved"/);
  assert.match(rulesApi, /definition\.executionMode === "calculation"/);
  assert.match(rulesApi, /integrityStatus === "verified"/);
  assert.match(rulesApi, /testsPassed/);
  assert.match(ruleDefinition, /automaticNetPayableCalculation: false/);
  assert.doesNotMatch(ruleDefinition, /automaticNetPayableCalculation: true/);
  assert.match(schema, /fiscal_rule_sets_code_version_idx/);
});

test("apuração líquida mantém 2026 bloqueado e prepara fechamento auditável", async () => {
  const [client, determinationApi, determinationDomain, schema, health] = await Promise.all([
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/api/tax-determination/route.ts", root), "utf8"),
    readFile(new URL("domain/tax-determination.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/api/health/route.ts", root), "utf8"),
  ]);

  assert.match(client, /Apuração líquida sob controle/);
  assert.match(client, /não é valor a pagar/);
  assert.match(client, /Conciliação em três vias/i);
  assert.match(determinationApi, /netPayableEnabled: false/);
  assert.match(determinationApi, /writesEnabled: false/);
  assert.match(determinationDomain, /SIMULATION_ONLY_2026/);
  assert.match(determinationDomain, /input\.legalEffect === "production"/);
  assert.match(determinationDomain, /PENDING_CREDIT/);
  assert.match(schema, /tax_period_closures/);
  assert.match(schema, /tax_reconciliation_snapshots/);
  assert.match(health, /TAX_DETERMINATION_ENGINE_VERSION/);
});

test("inteligência manual expõe cobertura, pendências e fontes sem fabricar conclusão", async () => {
  const [app, intelligenceUi, intelligenceApi, intelligenceService, intelligenceDomain, schema, migration] = await Promise.all([
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/app/FiscalIntelligence.tsx", root), "utf8"),
    readFile(new URL("app/api/fiscal-intelligence/route.ts", root), "utf8"),
    readFile(new URL("app/fiscal-intelligence-service.ts", root), "utf8"),
    readFile(new URL("domain/fiscal-intelligence.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0014_lean_silhouette.sql", root), "utf8"),
  ]);

  assert.match(app, /Inteligência fiscal/);
  assert.match(intelligenceUi, /Sem IA generativa/);
  assert.match(intelligenceUi, /FICHA DE CONFIRMAÇÃO/);
  assert.match(intelligenceUi, /MAPA COMPLETO DA PERGUNTA/);
  assert.match(intelligenceUi, /Preencher caso demonstrativo · 100% dos fatos/);
  assert.match(intelligenceUi, /Fontes efetivamente usadas nesta resposta/);
  assert.match(intelligenceService, /fiscal_knowledge_integrity_failure/);
  assert.match(intelligenceApi, /Cache-Control": "no-store/);
  assert.match(intelligenceDomain, /pilot_conditional/);
  assert.match(intelligenceDomain, /MVA de tabela não é o valor do ICMS-ST/);
  assert.match(intelligenceDomain, /ICMS-ST-SIMPLES-APPLIES/);
  assert.match(intelligenceDomain, /SCENARIO-SEVEN-NOT-SP-MG/);
  assert.match(schema, /fiscal_knowledge_bases_code_version_idx/);
  assert.match(migration, /CREATE TABLE `fiscal_knowledge_bases`/);
});

test("versão 22 congela memória fiscal e exige homologação segregada", async () => {
  const [workbench, dossierApi, reviewApi, calculation, schema, migration] = await Promise.all([
    readFile(new URL("app/app/FiscalDossierWorkbench.tsx", root), "utf8"),
    readFile(new URL("app/api/fiscal-dossiers/route.ts", root), "utf8"),
    readFile(new URL("app/api/fiscal-dossiers/review/route.ts", root), "utf8"),
    readFile(new URL("domain/fiscal-dossier.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0015_mushy_doorman.sql", root), "utf8"),
  ]);

  assert.match(workbench, /VERSÃO 22 · DOSSIÊ FISCAL AUDITÁVEL/);
  assert.match(workbench, /Calcular e congelar dossiê/);
  assert.match(workbench, /Dupla revisão/);
  assert.match(dossierApi, /createFiscalDossierSnapshot/);
  assert.match(dossierApi, /evaluateFiscalQuestion/);
  assert.match(reviewApi, /preparador não pode homologar o próprio dossiê/);
  assert.match(reviewApi, /sha256Hex\(dossier\.snapshotJson\)/);
  assert.match(reviewApi, /professionalRegistrationError/);
  assert.match(calculation, /adjustedMvaBps/);
  assert.match(calculation, /ICMS-ST condicionado/);
  assert.match(calculation, /technical_memory_not_filing_instruction/);
  assert.match(schema, /fiscalDossiers/);
  assert.match(schema, /fiscalDossierEvents/);
  assert.match(migration, /CREATE UNIQUE INDEX `fiscal_dossiers_workspace_hash_idx`/);
});

test("versão 23 audita NF-e no servidor, minimiza dados e reconcilia com o dossiê", async () => {
  const [workbench, documentsApi, auditCore, client, schema, migration] = await Promise.all([
    readFile(new URL("app/app/NfeAuditWorkbench.tsx", root), "utf8"),
    readFile(new URL("app/api/fiscal-documents/route.ts", root), "utf8"),
    readFile(new URL("domain/nfe-audit.ts", root), "utf8"),
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0016_flat_ink.sql", root), "utf8"),
  ]);

  assert.match(workbench, /VERSÃO 23 · EVIDÊNCIA DOCUMENTAL/);
  assert.match(workbench, /XML bruto é processado em memória e descartado/);
  assert.match(workbench, /Não substitui validação XSD integral/);
  assert.match(auditCore, /DOCTYPE.*ENTITY.*xml-stylesheet/i);
  assert.match(auditCore, /processEntities: false/);
  assert.match(auditCore, /nfeAccessKeyIsValid/);
  assert.match(auditCore, /maskNfeAccessKey/);
  assert.match(auditCore, /compareNfeToDossier/);
  assert.match(documentsApi, /rawXmlPersisted: false/);
  assert.match(documentsApi, /publicAudit\.header\.accessKey/);
  assert.match(documentsApi, /pertence a outro cliente do escritório/);
  assert.match(documentsApi, /getCurrentUser/);
  assert.match(documentsApi, /workspaceId/);
  assert.doesNotMatch(client, /DOMParser/);
  assert.match(schema, /fiscalDocuments/);
  assert.match(schema, /fiscalDocumentEvents/);
  assert.match(migration, /CREATE UNIQUE INDEX `fiscal_documents_workspace_hash_profile_idx`/);
});

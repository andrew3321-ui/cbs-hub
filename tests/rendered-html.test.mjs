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

  assert.match(landing, /CBSHub/);
  assert.match(landing, /href="\/planos"/);
  assert.match(layout, /Inteligência tributária/);
  assert.match(layout, /og-cbshub\.png/);
  assert.match(pricing, /OPERAÇÃO FISCAL PROFISSIONAL/);
  assert.match(pricing, /PricingClient/);
  assert.doesNotMatch(`${landing}\n${layout}`, /codex-preview|_sites-preview|Your site is taking shape/i);
});

test("credenciais de cobrança permanecem somente no servidor", async () => {
  const [client, billing, deployment] = await Promise.all([
    readFile(new URL("app/planos/PricingClient.tsx", root), "utf8"),
    readFile(new URL("app/billing.ts", root), "utf8"),
    readFile(new URL("wrangler.migrations.jsonc", root), "utf8"),
  ]);

  assert.doesNotMatch(client, /MERCADO_PAGO_ACCESS_TOKEN|MERCADO_PAGO_WEBHOOK_SECRET/);
  assert.match(billing, /MERCADO_PAGO_ACCESS_TOKEN/);
  assert.match(billing, /validateMercadoPagoWebhook/);
  assert.doesNotMatch(deployment, /MERCADO_PAGO|ACCESS_TOKEN|WEBHOOK_SECRET/);
});

test("plano único e capacidade adicional usam uma fonte comercial central", async () => {
  const [plans, pricing, center] = await Promise.all([
    readFile(new URL("domain/billing-plans.ts", root), "utf8"),
    readFile(new URL("app/planos/PricingClient.tsx", root), "utf8"),
    readFile(new URL("app/app/BillingCenter.tsx", root), "utf8"),
  ]);
  assert.match(plans, /billingPricingMode = "single_plan_capacity"/);
  assert.match(plans, /priceCents: 45_000/);
  assert.match(plans, /BILLING_BASE_COMPANY_LIMIT = 30/);
  assert.match(plans, /BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS = 10_000/);
  assert.equal((plans.match(/priceCents: 100/g) ?? []).length, 2);
  assert.match(pricing, /PLANO ÚNICO COM CAPACIDADE AJUSTÁVEL/);
  assert.match(pricing, /30 empresas incluídas/);
  assert.match(pricing, /Total mensal/);
  assert.match(center, /CONCILIAÇÃO DE ASSINATURAS/);
  assert.doesNotMatch(center, /Chave interna de assinatura ausente/);
});

test("versão 35 concilia cobranças recorrentes e cria fila fiscal restrita", async () => {
  const [center, adminApi, webhook, reconciliation, adminGuard, schema, runtimeDb, environment] = await Promise.all([
    readFile(new URL("app/app/BillingCenter.tsx", root), "utf8"),
    readFile(new URL("app/api/admin/billing/route.ts", root), "utf8"),
    readFile(new URL("app/api/billing/webhook/route.ts", root), "utf8"),
    readFile(new URL("app/billing-reconciliation.ts", root), "utf8"),
    readFile(new URL("app/platform-admin.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("db/index.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(center, /Central de Faturamento/);
  assert.match(center, /Abrir Emissor Nacional/);
  assert.match(center, /A nota continua manual/);
  assert.match(adminApi, /getPlatformAdminUser/);
  assert.match(adminApi, /mark_issued/);
  assert.match(webhook, /subscription_authorized_payment/);
  assert.match(webhook, /recordAuthorizedPaymentFromProvider/);
  assert.match(reconciliation, /providerSummaryJson/);
  assert.match(adminGuard, /PLATFORM_ADMIN_EMAILS/);
  assert.match(schema, /billingTransactions/);
  assert.match(schema, /fiscalIssuances/);
  assert.match(runtimeDb, /CREATE TABLE IF NOT EXISTS billing_transactions/);
  assert.match(runtimeDb, /CREATE TABLE IF NOT EXISTS fiscal_issuances/);
  assert.match(environment, /MERCADO_PAGO_ACCESS_TOKEN/);
  assert.match(environment, /MERCADO_PAGO_WEBHOOK_SECRET/);
});

test("análises publicadas expõem versionamento e não afirmam homologação", async () => {
  const [app, report, methodology, scenariosApi, signing] = await Promise.all([
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
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
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
    readFile(new URL("app/api/scenarios/approve/route.ts", root), "utf8"),
    readFile(new URL("app/api/report-shares/route.ts", root), "utf8"),
    readFile(new URL("app/scenario-approval-core.ts", root), "utf8"),
    readFile(new URL("app/professional-registration.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/relatorio/[token]/page.tsx", root), "utf8"),
  ]);

  assert.match(landing, /Central de inteligência tributária/);
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
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
    readFile(new URL("app/api/auth/register/route.ts", root), "utf8"),
    readFile(new URL("app/api/office/members/route.ts", root), "utf8"),
    readFile(new URL("app/api/scenarios/approve/route.ts", root), "utf8"),
    readFile(new URL("app/workspace.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/relatorio/[token]/page.tsx", root), "utf8"),
  ]);

  assert.match(auth, /Contador independente/);
  assert.match(auth, /Escritório contábil/);
  assert.match(auth, /Mesmo plano · espaço colaborativo/);
  assert.match(auth, /Mesmo plano · espaço individual/);
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
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
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
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
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
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
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
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
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
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
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
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
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

test("versão 80 expande a inteligência fiscal sem promover triagem a cálculo definitivo", async () => {
  const [ui, api, service, definition, expanded] = await Promise.all([
    readFile(new URL("app/app/FiscalIntelligence.tsx", root), "utf8"),
    readFile(new URL("app/api/fiscal-intelligence/route.ts", root), "utf8"),
    readFile(new URL("app/fiscal-intelligence-service.ts", root), "utf8"),
    readFile(new URL("domain/fiscal-intelligence.ts", root), "utf8"),
    readFile(new URL("domain/fiscal-intelligence-v24.ts", root), "utf8"),
  ]);

  assert.match(ui, /V84 · INTELIGÊNCIA FISCAL DETERMINÍSTICA/);
  assert.match(ui, /MOTOR MANUAL · 8 MÓDULOS/);
  assert.match(ui, /result\?\.topicCode === "ICMS-SP-MG-AUTO-PARTS"/);
  assert.match(ui, /sem cálculo definitivo/);
  assert.match(ui, /searchController\.current\?\.abort\(\)/);
  assert.match(ui, /onChange=\{\(event\) => changeQuestion\(event\.target\.value\)\}/);
  assert.match(ui, /cache: "no-store"/);
  assert.doesNotMatch(ui, /const parsed = data\.result\.facts/);
  assert.match(api, /evaluateExpandedFiscalQuestion/);
  assert.match(api, /fiscalTopicCatalog\(definition\)/);
  assert.match(service, /pisCofinsRegime/);
  assert.match(definition, /FISCAL-MANUAL-BR/);
  assert.match(definition, /Inteligência Fiscal Manual Brasil · V90/);
  for (const topic of ["ICMS-NATIONAL", "ISS-NATIONAL", "IPI-NATIONAL", "PIS-COFINS", "SIMPLES-NACIONAL", "IRPJ-CSLL", "IBS-CBS-2026", "WITHHOLDINGS-SERVICES"]) assert.match(definition, new RegExp(topic));
  assert.match(expanded, /calculationEligible: false/);
  assert.match(expanded, /IRRF, CSRF, INSS e ISS conservam bases, responsáveis e prazos próprios/);
  assert.match(expanded, /Nenhum valor líquido a pagar foi produzido/);
});

test("versão 55 substitui a fila humana por verificação automática rastreável", async () => {
  const [ui, api, reviewApi, assurance, expansion, expansionApi] = await Promise.all([
    readFile(new URL("app/app/FiscalHomologationCenter.tsx", root), "utf8"),
    readFile(new URL("app/api/fiscal-homologations/route.ts", root), "utf8"),
    readFile(new URL("app/api/fiscal-homologations/review/route.ts", root), "utf8"),
    readFile(new URL("domain/fiscal-automatic-assurance.ts", root), "utf8"),
    readFile(new URL("domain/fiscal-expansion.ts", root), "utf8"),
    readFile(new URL("app/api/fiscal-expansion/route.ts", root), "utf8"),
  ]);

  assert.match(ui, /VERSÃO 56 · VERIFICAÇÃO AUTOMÁTICA/);
  assert.match(ui, /Verificação automática ≠ parecer profissional/);
  assert.match(ui, /Não há cadastro de contribuinte, assinatura humana nem aprovação manual/);
  assert.doesNotMatch(ui, /Homologar e assinar/);
  assert.match(api, /buildFiscalAutomaticAssurance/);
  assert.match(api, /MANUAL_HOMOLOGATION_DISABLED/);
  assert.match(reviewApi, /MANUAL_REVIEW_DISABLED/);
  assert.match(assurance, /resultado reexecutado no servidor/);
  assert.match(assurance, /isOfficialPublicSource/);
  assert.match(assurance, /safe_block/);
  assert.match(expansion, /automatically_verified/);
  assert.match(expansion, /fiscalAutomaticAssuranceCapacity/);
  assert.match(expansionApi, /AUTOMATED-SUITE/);
});

test("versão 26 cobre regras federais essenciais de PMEs por perfil e sem herdar obrigações", async () => {
  const [ui, api, domain, shell, layout] = await Promise.all([
    readFile(new URL("app/app/FederalPmeCompliance.tsx", root), "utf8"),
    readFile(new URL("app/api/federal-pme-compliance/route.ts", root), "utf8"),
    readFile(new URL("domain/federal-pme-compliance.ts", root), "utf8"),
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);

  assert.match(ui, /VERSÃO 26 · COBERTURA FEDERAL PARA PMEs/);
  assert.match(ui, /Nenhuma regra é marcada como obrigatória apenas/);
  assert.match(ui, /Exibir não aplicáveis/);
  assert.match(api, /parseFederalPmeProfile/);
  assert.match(api, /Cache-Control": "no-store/);
  assert.match(domain, /SIMPLES-PGDAS-D/);
  assert.match(domain, /DCTFWEB-GENERAL/);
  assert.match(domain, /EFD-REINF-R4000/);
  assert.match(domain, /ESOCIAL-SST/);
  assert.match(domain, /RTC-2026-DOCUMENTS/);
  assert.match(domain, /"not_applicable"/);
  assert.match(shell, /FederalPmeCompliance/);
  assert.match(layout, /federal-pme\.css/);
});

test("versão 70 publica PMPF de bebidas destinado a São Paulo e nas rotas SP→MG/RJ", async () => {
  const [ui, domain, publicApi, calculatorApi, beverageApi, beverageSpApi, beverageSpOriginApi, beverageDomain, beverageSpDomain, beverageSpOriginDomain, batchApi, monitorApi, governanceApi, approvalService, schema, runtimeDb, landing, layout] = await Promise.all([
    readFile(new URL("app/app/NationalCoverageCenter.tsx", root), "utf8"),
    readFile(new URL("domain/national-tax-coverage.ts", root), "utf8"),
    readFile(new URL("app/api/public/coverage/route.ts", root), "utf8"),
    readFile(new URL("app/api/national-coverage/route.ts", root), "utf8"),
    readFile(new URL("app/api/national-coverage/beverages/route.ts", root), "utf8"),
    readFile(new URL("app/api/national-coverage/beverages/sp-destination/route.ts", root), "utf8"),
    readFile(new URL("app/api/national-coverage/beverages/sp-origin/route.ts", root), "utf8"),
    readFile(new URL("domain/st-cold-beverages-priority.ts", root), "utf8"),
    readFile(new URL("domain/st-cold-beverages-sp-destination.ts", root), "utf8"),
    readFile(new URL("domain/st-cold-beverages-sp-origin.ts", root), "utf8"),
    readFile(new URL("app/api/fiscal-imports/route.ts", root), "utf8"),
    readFile(new URL("app/api/normative-monitor/route.ts", root), "utf8"),
    readFile(new URL("app/api/rule-governance/route.ts", root), "utf8"),
    readFile(new URL("app/fiscal-rule-approval.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("db/index.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);
  assert.match(ui, /VERSAO 71 · INDICADOR PUBLICO DE COBERTURA/);
  assert.match(ui, /INDICADOR PUBLICO NORMALIZADO/);
  assert.match(ui, /PMPF vigente com memória em centavos/);
  assert.match(ui, /Novas rotas com PMPF de MG e RJ/);
  assert.match(ui, /ICMS-ST \+ adicional estadual/);
  assert.match(ui, /Confirme os nove fatos documentados/);
  assert.match(ui, /Enquadrar bebida sem inventar alíquota/);
  assert.match(ui, /Ver os \{coverage\.stColdBeveragesPriority\.metrics\.directedRoutes\} sentidos para o produto selecionado/);
  assert.match(ui, /CALCULADORA TEMPORAL/);
  assert.match(ui, /Confirme os nove fatos documentados/);
  assert.match(ui, /structuredCells} combinações estruturadas/);
  assert.match(publicApi, /stSpOriginMatrix/);
  assert.match(publicApi, /stSpCalculationValidation/);
  assert.match(publicApi, /stCementSpRoutes/);
  assert.match(publicApi, /stCementPriorityBatch/);
  assert.match(publicApi, /stAutoPartsPriorityBatch/);
  assert.match(publicApi, /stAutoPartsHighUseCorridors/);
  assert.match(publicApi, /stColdBeveragesPriority/);
  assert.match(publicApi, /stColdBeveragesSpDestination/);
  assert.match(publicApi, /stColdBeveragesSpOrigin/);
  assert.match(publicApi, /coverageIndicator/);
  assert.match(publicApi, /buildPublicCoverageIndicator/);
  assert.match(beverageApi, /resolveColdBeveragePriorityOperation/);
  assert.match(beverageSpApi, /resolveColdBeverageSpDestinationOperation/);
  assert.match(beverageSpOriginApi, /resolveColdBeverageSpOriginOperation/);
  assert.match(beverageDomain, /ST_COLD_BEVERAGES_SP_WATER_EXCLUSION_FROM/);
  assert.match(beverageDomain, /productRouteCells/);
  assert.match(beverageSpDomain, /ST_COLD_BEVERAGES_SP_PMPF_PROFILES/);
  assert.match(beverageSpDomain, /pmpf_fallback_required/);
  assert.match(beverageSpOriginDomain, /fallbackComparison/);
  assert.match(beverageSpOriginDomain, /MG_COCA_COLA_PET_2000/);
  assert.match(beverageSpOriginDomain, /RJ_GATORADE_PET_401_660/);
  assert.match(publicApi, /automaticAssurance/);
  assert.match(ui, /Uma base legal, 26 rotas controladas/);
  assert.match(ui, /novos valores finais liberados/);
  assert.match(ui, /PMPF por GTIN antes da MVA/);
  assert.match(ui, /Somente o RJ possui memória sintética reproduzida/);
  assert.match(ui, /12 pares avaliados como 24 rotas independentes/);
  assert.match(ui, /Ida ≠ volta/);
  assert.match(ui, /26 destinos mapeados — não confundir com cobertura nacional de origens/);
  assert.match(ui, /Rota fora do Protocolo 41\/08 não significa isenção/);
  assert.match(ui, /CEST 01\.015\.00 também fica fora deste protocolo/);
  assert.match(ui, /produtos representativos/);
  assert.match(ui, /stSpMg\.metrics\.legalGatesStructured/);
  assert.match(ui, /CÁLCULO VALIDADO/);
  assert.match(publicApi, /stSpMg/);
  assert.match(ui, /RODADA TÉCNICA CONCLUÍDA/);
  assert.match(ui, /Evidência #/);
  assert.match(ui, /Calculadora oficial integrada/);
  assert.match(domain, /state\("TO"/);
  assert.match(domain, /cityRows/);
  assert.match(publicApi, /Cache-Control": "no-store/);
  assert.match(ui, /compatibleAutomaticAssurance/);
  assert.match(ui, /schema=automatic-assurance-v1/);
  assert.match(calculatorApi, /validateNationalCoverageAutomatically/);
  assert.match(calculatorApi, /professionalApprovalRequired: false/);
  assert.doesNotMatch(calculatorApi, /rule_approval_required/);
  assert.match(batchApi, /rawFilesPersisted: false/);
  assert.match(monitorApi, /Nunca altera regra/);
  assert.match(governanceApi, /signRuleApproval/);
  assert.match(governanceApi, /professionalApprovalRequiredForReferences: false/);
  assert.match(ui, /Nenhuma assinatura humana é exigida/);
  assert.match(ui, /O software não se apresenta como profissional habilitado/);
  assert.match(schema, /fiscalRuleApprovals/);
  assert.doesNotMatch(runtimeDb, /CREATE TABLE IF NOT EXISTS fiscal_rule_approvals/);
  assert.match(approvalService, /ensureFiscalRuleApprovalSchema/);
  assert.match(landing, /cbs-coverage-section/);
  assert.match(layout, /national-coverage\.css/);
  assert.match(layout, /national-coverage-v64\.css/);
});

test("versão 55 cria esteira fiscal sem custo por consulta e com verificação automática", async () => {
  const [ui, api, service, domain, schema, runtimeDb, monitor, shell, layout] = await Promise.all([
    readFile(new URL("app/app/FiscalExpansionCenter.tsx", root), "utf8"),
    readFile(new URL("app/api/fiscal-expansion/route.ts", root), "utf8"),
    readFile(new URL("app/fiscal-expansion-service.ts", root), "utf8"),
    readFile(new URL("domain/fiscal-expansion.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("db/index.ts", root), "utf8"),
    readFile(new URL("app/api/normative-monitor/route.ts", root), "utf8"),
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);
  assert.match(ui, /VERSÃO 56 · VERIFICAÇÃO FISCAL AUTOMÁTICA/);
  assert.match(ui, /SEM IA/);
  assert.match(ui, /verificação automática rastreável/);
  assert.match(api, /automaticVerification: true/);
  assert.match(api, /nextStage === "automatically_verified"/);
  assert.match(api, /runFiscalSimulationSuite/);
  assert.match(service, /ensureFiscalExpansionSchema/);
  assert.match(service, /expansionSchemaReady = undefined/);
  assert.doesNotMatch(runtimeDb, /CREATE TABLE IF NOT EXISTS fiscal_expansion_progress/);
  assert.match(domain, /officialSources: 200/);
  assert.match(domain, /automaticTests: 100/);
  assert.match(schema, /fiscalExpansionProgress/);
  assert.match(monitor, /DAILY_SHARDS = 4/);
  assert.match(monitor, /Nunca altera regra ou/);
  assert.match(monitor, /limit\(14\)/);
  assert.match(shell, /Expansão fiscal/);
  assert.match(layout, /fiscal-expansion\.css/);
});

test("versão 30 mantém toda a navegação acessível e amplia a leitura do aplicativo", async () => {
  const [client, css] = await Promise.all([
    readFile(new URL("app/app/CBSHubApp.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(client, /navigationRef/);
  assert.match(client, /scrollIntoView/);
  assert.match(client, /title="Expansão fiscal"/);
  assert.match(css, /height: 100dvh/);
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /scrollbar-gutter: stable/);
  assert.match(css, /scroll-snap-type: x proximity/);
  assert.match(css, /\.main-nav::-webkit-scrollbar/);
  assert.match(css, /Authenticated workspace readability floor/);
  assert.match(css, /\.app-shell \.company-analysis span \{ font-size: 10px/);
  assert.match(css, /\.app-shell \.portfolio-metrics small \{ font-size: 11px/);
  assert.match(css, /\.page-content \{ padding: 24px 16px 108px/);
});

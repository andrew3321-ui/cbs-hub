import { and, eq, inArray } from "drizzle-orm";
import {
  clearSessionCookieHeader,
  createSession,
  getCurrentUser,
  normalizeEmail,
  normalizeUsername,
  sessionCookieHeader,
  userHasContactEmail,
  usernameIsValid,
  verifyPassword,
} from "../../auth";
import { ensureScenarioSchema, getDb } from "../../../db";
import {
  accountingWorkspaces,
  auditEvents,
  billingAccounts,
  billingTransactions,
  companies,
  fiscalDocumentEvents,
  fiscalDocuments,
  fiscalImportBatches,
  fiscalImportItems,
  fiscalIssuanceEvents,
  fiscalDossierEvents,
  fiscalDossiers,
  fiscalDossierShares,
  fiscalExpansionEvents,
  fiscalExpansionProgress,
  fiscalHomologationCases,
  fiscalHomologationEvents,
  fiscalIssuances,
  fiscalResultInvalidations,
  fiscalRuleApprovals,
  governanceNotifications,
  normativeChangeReviews,
  normativeGovernanceAuditEvents,
  platformMetricEvents,
  reportShares,
  scenarioApprovals,
  scenarioReviewComments,
  scenarioReviewRounds,
  scenarios,
  securityIncidentEvents,
  securityIncidents,
  sessions,
  supportTicketEvents,
  supportTickets,
  taxLedgerEntries,
  taxPeriodClosures,
  taxPeriods,
  taxReconciliationSnapshots,
  trialDeviceClaims,
  users,
  workspaceInvitations,
  workspaceMembers,
} from "../../../db/schema";
import { getWorkspaceContext } from "../../workspace";
import { withApiTelemetry } from "../../api-infrastructure";
import { recordPrivacyRequest } from "../../security-governance";
import { PRIVACY_GOVERNANCE_VERSION } from "../../../domain/privacy-governance";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function exportAccountData(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json({ error: "Faça login para acessar seus dados." }, { status: 401 });
  let trailWorkspaceId: number | null = null;
  try {
    await ensureScenarioSchema();
    const db = getDb();
    const workspace = await getWorkspaceContext(currentUser.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 409 });
    trailWorkspaceId = workspace.id;
    const canExportWorkspaceData = workspace.role === "owner";
    const ownedCompanies = canExportWorkspaceData
      ? await db.select().from(companies).where(eq(companies.workspaceId, workspace.id))
      : [];
    const companyIds = ownedCompanies.map((company) => company.id);
    const memberFilter = canExportWorkspaceData
      ? eq(workspaceMembers.workspaceId, workspace.id)
      : and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, currentUser.id));
    const [members, scenarioRows, shareRows, approvalRows, auditRows, billingRows, transactionRows, fiscalRows, trialRows, platformActivityRows] = await Promise.all([
      db.select({ id: users.id, name: users.name, email: users.email, role: workspaceMembers.role, status: workspaceMembers.status, joinedAt: workspaceMembers.joinedAt }).from(workspaceMembers).innerJoin(users, eq(users.id, workspaceMembers.userId)).where(memberFilter),
      companyIds.length ? db.select().from(scenarios).where(inArray(scenarios.companyId, companyIds)) : [],
      canExportWorkspaceData ? db.select({ id: reportShares.id, scenarioId: reportShares.scenarioId, companyId: reportShares.companyId, expiresAt: reportShares.expiresAt, revokedAt: reportShares.revokedAt, views: reportShares.views, lastViewedAt: reportShares.lastViewedAt, createdAt: reportShares.createdAt }).from(reportShares).where(eq(reportShares.ownerUserId, workspace.ownerUserId)) : [],
      canExportWorkspaceData ? db.select().from(scenarioApprovals).where(eq(scenarioApprovals.ownerUserId, workspace.ownerUserId)) : [],
      canExportWorkspaceData ? db.select().from(auditEvents).where(eq(auditEvents.ownerUserId, workspace.ownerUserId)).limit(5000) : [],
      db.select({ id: billingAccounts.id, userId: billingAccounts.userId, planKey: billingAccounts.planKey, provider: billingAccounts.provider, externalReference: billingAccounts.externalReference, providerSubscriptionId: billingAccounts.providerSubscriptionId, companyAddonBlocks: billingAccounts.companyAddonBlocks, pendingCompanyAddonBlocks: billingAccounts.pendingCompanyAddonBlocks, status: billingAccounts.status, nextPaymentAt: billingAccounts.nextPaymentAt, lastSyncedAt: billingAccounts.lastSyncedAt, createdAt: billingAccounts.createdAt, updatedAt: billingAccounts.updatedAt }).from(billingAccounts).where(eq(billingAccounts.userId, currentUser.id)),
      db.select({ id: billingTransactions.id, provider: billingTransactions.provider, providerInvoiceId: billingTransactions.providerInvoiceId, providerPaymentId: billingTransactions.providerPaymentId, status: billingTransactions.status, statusDetail: billingTransactions.statusDetail, grossAmountCents: billingTransactions.grossAmountCents, feeAmountCents: billingTransactions.feeAmountCents, netAmountCents: billingTransactions.netAmountCents, currency: billingTransactions.currency, paymentMethod: billingTransactions.paymentMethod, approvedAt: billingTransactions.approvedAt, createdAt: billingTransactions.createdAt, updatedAt: billingTransactions.updatedAt }).from(billingTransactions).where(eq(billingTransactions.userId, currentUser.id)),
      db.select().from(fiscalIssuances).where(eq(fiscalIssuances.userId, currentUser.id)),
      canExportWorkspaceData ? db.select({ status: trialDeviceClaims.status, startedAt: trialDeviceClaims.startedAt, endsAt: trialDeviceClaims.endsAt, createdAt: trialDeviceClaims.createdAt }).from(trialDeviceClaims).where(eq(trialDeviceClaims.workspaceId, workspace.id)) : [],
      db.select({ eventType: platformMetricEvents.eventType, eventDate: platformMetricEvents.eventDate, occurredAt: platformMetricEvents.occurredAt, pathGroup: platformMetricEvents.pathGroup, source: platformMetricEvents.source, medium: platformMetricEvents.medium, campaign: platformMetricEvents.campaign }).from(platformMetricEvents).where(eq(platformMetricEvents.userId, currentUser.id)).limit(5000),
    ]);
    const [account] = await db.select({ id: users.id, name: users.name, firstName: users.firstName, username: users.username, accountCode: users.accountCode, email: users.email, accountType: users.accountType, suggestedPlanKey: users.suggestedPlanKey, createdAt: users.createdAt }).from(users).where(eq(users.id, currentUser.id)).limit(1);
    const fiscalIssuanceIds = fiscalRows.map((item) => item.id);
    const fiscalIssuanceEventRows = fiscalIssuanceIds.length
      ? await db.select().from(fiscalIssuanceEvents).where(inArray(fiscalIssuanceEvents.issuanceId, fiscalIssuanceIds))
      : [];
    const supportRows = await db.select().from(supportTickets).where(eq(supportTickets.reporterUserId, currentUser.id));
    const supportEventRows = supportRows.length
      ? await db.select().from(supportTicketEvents).where(inArray(supportTicketEvents.ticketId, supportRows.map((item) => item.id)))
      : [];
    const workspaceQuery = <T>(query: PromiseLike<T>) => canExportWorkspaceData ? Promise.resolve(query) : Promise.resolve([] as T);
    const [ruleApprovalRows, expansionProgressRows, expansionEventRows, dossierRows, dossierEventRows, documentRows, documentEventRows, homologationRows, homologationEventRows, taxPeriodRows, taxLedgerRows, reconciliationRows, closureRows] = await Promise.all([
      workspaceQuery(db.select().from(fiscalRuleApprovals).where(eq(fiscalRuleApprovals.workspaceId, workspace.id))),
      workspaceQuery(db.select().from(fiscalExpansionProgress).where(eq(fiscalExpansionProgress.workspaceId, workspace.id))),
      workspaceQuery(db.select().from(fiscalExpansionEvents).where(eq(fiscalExpansionEvents.workspaceId, workspace.id))),
      workspaceQuery(db.select().from(fiscalDossiers).where(eq(fiscalDossiers.workspaceId, workspace.id))),
      workspaceQuery(db.select().from(fiscalDossierEvents).where(eq(fiscalDossierEvents.workspaceId, workspace.id))),
      workspaceQuery(db.select().from(fiscalDocuments).where(eq(fiscalDocuments.workspaceId, workspace.id))),
      workspaceQuery(db.select().from(fiscalDocumentEvents).where(eq(fiscalDocumentEvents.workspaceId, workspace.id))),
      workspaceQuery(db.select().from(fiscalHomologationCases).where(eq(fiscalHomologationCases.workspaceId, workspace.id))),
      workspaceQuery(db.select().from(fiscalHomologationEvents).where(eq(fiscalHomologationEvents.workspaceId, workspace.id))),
      workspaceQuery(db.select().from(taxPeriods).where(eq(taxPeriods.ownerUserId, workspace.ownerUserId))),
      workspaceQuery(db.select().from(taxLedgerEntries).where(eq(taxLedgerEntries.ownerUserId, workspace.ownerUserId))),
      workspaceQuery(db.select().from(taxReconciliationSnapshots).where(eq(taxReconciliationSnapshots.ownerUserId, workspace.ownerUserId))),
      workspaceQuery(db.select().from(taxPeriodClosures).where(eq(taxPeriodClosures.ownerUserId, workspace.ownerUserId))),
    ]);
    const exportData = {
      generatedAt: new Date().toISOString(),
      formatVersion: "lgpd-access-v2",
      privacyGovernanceVersion: PRIVACY_GOVERNANCE_VERSION,
      scope: canExportWorkspaceData ? "account_and_owned_workspace" : "individual_account_only",
      account,
      workspace: { id: workspace.id, name: workspace.name, type: workspace.type, role: workspace.role },
      members,
      companies: ownedCompanies,
      scenarios: scenarioRows,
      reportShares: shareRows,
      approvals: approvalRows,
      auditEvents: auditRows,
      billingAccounts: billingRows,
      billingTransactions: transactionRows,
      fiscalIssuances: fiscalRows,
      fiscalIssuanceEvents: fiscalIssuanceEventRows,
      support: { tickets: supportRows, events: supportEventRows },
      trial: trialRows,
      platformActivity: platformActivityRows,
      fiscalControl: { ruleApprovals: ruleApprovalRows, expansionProgress: expansionProgressRows, expansionEvents: expansionEventRows, dossiers: dossierRows, dossierEvents: dossierEventRows, documents: documentRows, documentEvents: documentEventRows, homologations: homologationRows, homologationEvents: homologationEventRows, taxPeriods: taxPeriodRows, taxLedgerEntries: taxLedgerRows, reconciliations: reconciliationRows, closures: closureRows },
      safeguards: { passwordHashesExcluded: true, recoveryKeysExcluded: true, sessionTokensExcluded: true, providerPayloadsExcluded: true, rawFiscalXmlStored: false, rawDeviceSignalsStored: false, memberWorkspaceDataExcluded: !canExportWorkspaceData },
    };
    await recordPrivacyRequest({ request, email: currentUser.email, workspaceId: workspace.id, action: "access_export", status: "completed", details: { scope: canExportWorkspaceData ? "workspace_owner" : "workspace_member" } });
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(JSON.stringify(exportData, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...(download ? { "Content-Disposition": `attachment; filename="cbshub-dados-${new Date().toISOString().slice(0, 10)}.json"` } : {}) } });
  } catch {
    try { await recordPrivacyRequest({ request, email: currentUser.email, workspaceId: trailWorkspaceId, action: "access_export", status: "failed" }); }
    catch { /* A falha primária continua sendo a resposta mais segura. */ }
    return Response.json({ error: "Não foi possível preparar a cópia dos seus dados." }, { status: 500 });
  }
}

async function correctAccount(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json({ error: "Faça login para corrigir seus dados." }, { status: 401 });
  let trailWorkspaceId: number | null = null;
  let trailStarted = false;
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const password = typeof payload.password === "string" ? payload.password : "";
    const suppliedFirstName = typeof payload.firstName === "string" ? payload.firstName.trim().replace(/\s+/g, " ").slice(0, 60) : typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ").slice(0, 60) : null;
    const suppliedEmail = typeof payload.email === "string" ? normalizeEmail(payload.email) : null;
    const suppliedUsername = typeof payload.username === "string" ? normalizeUsername(payload.username) : null;
    if (suppliedFirstName !== null && suppliedFirstName.length > 0 && suppliedFirstName.length < 2) return Response.json({ error: "Informe um primeiro nome válido." }, { status: 400 });
    if (suppliedEmail !== null && suppliedEmail.length > 0 && !emailPattern.test(suppliedEmail)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (suppliedUsername !== null && !usernameIsValid(suppliedUsername)) return Response.json({ error: "O usuário deve ter de 3 a 24 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado." }, { status: 400 });
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash, user.passwordIterations))) return Response.json({ error: "Senha incorreta." }, { status: 403 });
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 409 });
    trailWorkspaceId = workspace.id;
    const firstName = suppliedFirstName !== null && suppliedFirstName.length > 0 ? suppliedFirstName : user.firstName;
    const email = suppliedEmail !== null && suppliedEmail.length > 0 ? suppliedEmail : user.email;
    const username = suppliedUsername ?? user.username;
    if (email !== user.email) {
      const [emailOwner] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (emailOwner && emailOwner.id !== user.id) return Response.json({ error: "Este e-mail já pertence a outra conta." }, { status: 409 });
    }
    if (username !== user.username) {
      const [usernameOwner] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
      if (usernameOwner && usernameOwner.id !== user.id) return Response.json({ error: "Este nome de usuário já está em uso." }, { status: 409 });
    }
    const firstNameChanged = firstName !== user.firstName;
    const emailChanged = email !== user.email;
    const usernameChanged = username !== user.username;
    if (!firstNameChanged && !emailChanged && !usernameChanged) return Response.json({ error: "Nenhuma alteração foi informada." }, { status: 400 });
    await recordPrivacyRequest({ request, email: user.email, workspaceId: workspace.id, action: "account_correction", status: "started", details: { firstNameChanged, emailChanged, usernameChanged } });
    trailStarted = true;
    const displayName = firstNameChanged && firstName
      ? firstName
      : user.firstName
        ? user.name
        : username;
    await db.update(users).set({ name: displayName, firstName, username, email }).where(eq(users.id, user.id));
    const session = await createSession(user.id);
    await recordPrivacyRequest({ request, email, workspaceId: workspace.id, action: "account_correction", status: "completed", details: { firstNameChanged, emailChanged, usernameChanged, sessionsRotated: true } });
    return Response.json({ corrected: true, user: { id: user.id, name: displayName, firstName, username, accountCode: user.accountCode, email, hasContactEmail: userHasContactEmail(email) } }, { headers: { "Set-Cookie": sessionCookieHeader(session.token, request), "Cache-Control": "no-store" } });
  } catch {
    if (trailStarted) {
      try { await recordPrivacyRequest({ request, email: currentUser.email, workspaceId: trailWorkspaceId, action: "account_correction", status: "failed" }); }
      catch { /* Não expõe detalhes da persistência ao titular. */ }
    }
    return Response.json({ error: "Não foi possível corrigir os dados da conta." }, { status: 500 });
  }
}

async function anonymizeIncidentActor(userId: number) {
  const db = getDb();
  await db.update(securityIncidents).set({ reportedByUserId: null }).where(eq(securityIncidents.reportedByUserId, userId));
  await db.update(securityIncidentEvents).set({ actorUserId: null }).where(eq(securityIncidentEvents.actorUserId, userId));
}

async function deleteSupportTickets(filter: ReturnType<typeof eq>) {
  const db = getDb();
  const rows = await db.select({ id: supportTickets.id }).from(supportTickets).where(filter);
  if (rows.length) await db.delete(supportTicketEvents).where(inArray(supportTicketEvents.ticketId, rows.map((item) => item.id)));
  await db.delete(supportTickets).where(filter);
}

async function deleteAccount(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json({ error: "Faça login para excluir sua conta." }, { status: 401 });
  let trailWorkspaceId: number | null = null;
  let trailStarted = false;
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const password = typeof payload.password === "string" ? payload.password : "";
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash, user.passwordIterations))) return Response.json({ error: "Senha incorreta." }, { status: 403 });
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 409 });
    trailWorkspaceId = workspace.id;
    const members = await db.select({ userId: workspaceMembers.userId }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id));
    if (workspace.role === "owner" && workspace.type === "office" && members.length > 1) return Response.json({ error: "Remova os demais membros ou transfira a responsabilidade do escritório antes de excluir a conta." }, { status: 409 });

    if (workspace.role !== "owner") {
      const [assignedReview] = await db.select({ id: scenarioReviewRounds.id }).from(scenarioReviewRounds).where(and(eq(scenarioReviewRounds.workspaceId, workspace.id), eq(scenarioReviewRounds.assignedReviewerUserId, user.id), eq(scenarioReviewRounds.status, "pending"))).limit(1);
      if (assignedReview) return Response.json({ error: "Peça a um gestor para reatribuir suas revisões pendentes antes de excluir a conta." }, { status: 409 });
      await recordPrivacyRequest({ request, email: user.email, workspaceId: workspace.id, action: "account_deletion", status: "started", details: { scope: "workspace_member" } });
      trailStarted = true;
      await anonymizeIncidentActor(user.id);
      await deleteSupportTickets(eq(supportTickets.reporterUserId, user.id));
      await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, user.id));
      const issuanceRows = await db.select({ id: fiscalIssuances.id }).from(fiscalIssuances).where(eq(fiscalIssuances.userId, user.id));
      if (issuanceRows.length) await db.delete(fiscalIssuanceEvents).where(inArray(fiscalIssuanceEvents.issuanceId, issuanceRows.map((item) => item.id)));
      await db.delete(fiscalIssuances).where(eq(fiscalIssuances.userId, user.id));
      await db.delete(billingTransactions).where(eq(billingTransactions.userId, user.id));
      await db.delete(billingAccounts).where(eq(billingAccounts.userId, user.id));
      await db.delete(platformMetricEvents).where(eq(platformMetricEvents.userId, user.id));
      await db.update(trialDeviceClaims).set({ userId: null, workspaceId: null, status: "retained_antifraud" }).where(eq(trialDeviceClaims.userId, user.id));
      await db.delete(sessions).where(eq(sessions.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
      await recordPrivacyRequest({ request, email: user.email, workspaceId: workspace.id, action: "account_deletion", status: "completed", details: { scope: "workspace_member" } });
      return Response.json({ deleted: true }, { headers: { "Set-Cookie": clearSessionCookieHeader(request) } });
    }

    await recordPrivacyRequest({ request, email: user.email, workspaceId: workspace.id, action: "account_deletion", status: "started", details: { scope: "owned_workspace" } });
    trailStarted = true;
    const ownedCompanies = await db.select({ id: companies.id }).from(companies).where(eq(companies.workspaceId, workspace.id));
    const companyIds = ownedCompanies.map((company) => company.id);
    await anonymizeIncidentActor(user.id);
    await deleteSupportTickets(eq(supportTickets.workspaceId, workspace.id));
    const issuanceRows = await db.select({ id: fiscalIssuances.id }).from(fiscalIssuances).where(eq(fiscalIssuances.userId, user.id));
    if (issuanceRows.length) await db.delete(fiscalIssuanceEvents).where(inArray(fiscalIssuanceEvents.issuanceId, issuanceRows.map((item) => item.id)));
    await db.delete(fiscalIssuances).where(eq(fiscalIssuances.userId, user.id));
    await db.delete(billingTransactions).where(eq(billingTransactions.userId, user.id));
    await db.delete(billingAccounts).where(eq(billingAccounts.userId, user.id));
    await db.delete(platformMetricEvents).where(eq(platformMetricEvents.userId, user.id));
    await db.delete(auditEvents).where(eq(auditEvents.ownerUserId, user.id));
    await db.delete(reportShares).where(eq(reportShares.ownerUserId, user.id));
    await db.delete(scenarioApprovals).where(eq(scenarioApprovals.ownerUserId, user.id));
    await db.delete(scenarioReviewComments).where(eq(scenarioReviewComments.workspaceId, workspace.id));
    await db.delete(scenarioReviewRounds).where(eq(scenarioReviewRounds.workspaceId, workspace.id));
    await db.delete(fiscalDocumentEvents).where(eq(fiscalDocumentEvents.workspaceId, workspace.id));
    await db.delete(fiscalDocuments).where(eq(fiscalDocuments.workspaceId, workspace.id));
    await db.delete(fiscalImportItems).where(eq(fiscalImportItems.workspaceId, workspace.id));
    await db.delete(fiscalImportBatches).where(eq(fiscalImportBatches.workspaceId, workspace.id));
    await db.delete(fiscalDossierShares).where(eq(fiscalDossierShares.workspaceId, workspace.id));
    await db.delete(fiscalDossierEvents).where(eq(fiscalDossierEvents.workspaceId, workspace.id));
    await db.delete(fiscalResultInvalidations).where(eq(fiscalResultInvalidations.workspaceId, workspace.id));
    await db.delete(fiscalDossiers).where(eq(fiscalDossiers.workspaceId, workspace.id));
    await db.delete(fiscalHomologationEvents).where(eq(fiscalHomologationEvents.workspaceId, workspace.id));
    await db.delete(fiscalHomologationCases).where(eq(fiscalHomologationCases.workspaceId, workspace.id));
    await db.delete(fiscalExpansionEvents).where(eq(fiscalExpansionEvents.workspaceId, workspace.id));
    await db.delete(fiscalExpansionProgress).where(eq(fiscalExpansionProgress.workspaceId, workspace.id));
    await db.delete(fiscalRuleApprovals).where(eq(fiscalRuleApprovals.workspaceId, workspace.id));
    await db.delete(normativeChangeReviews).where(eq(normativeChangeReviews.workspaceId, workspace.id));
    await db.delete(normativeGovernanceAuditEvents).where(eq(normativeGovernanceAuditEvents.workspaceId, workspace.id));
    await db.delete(governanceNotifications).where(eq(governanceNotifications.workspaceId, workspace.id));
    await db.delete(taxPeriodClosures).where(eq(taxPeriodClosures.ownerUserId, user.id));
    await db.delete(taxReconciliationSnapshots).where(eq(taxReconciliationSnapshots.ownerUserId, user.id));
    await db.delete(taxLedgerEntries).where(eq(taxLedgerEntries.ownerUserId, user.id));
    await db.delete(taxPeriods).where(eq(taxPeriods.ownerUserId, user.id));
    if (companyIds.length) await db.delete(scenarios).where(inArray(scenarios.companyId, companyIds));
    await db.delete(companies).where(eq(companies.workspaceId, workspace.id));
    await db.delete(workspaceInvitations).where(eq(workspaceInvitations.workspaceId, workspace.id));
    await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id));
    await db.update(trialDeviceClaims).set({ userId: null, workspaceId: null, status: "retained_antifraud" }).where(eq(trialDeviceClaims.workspaceId, workspace.id));
    await db.delete(accountingWorkspaces).where(eq(accountingWorkspaces.id, workspace.id));
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
    await recordPrivacyRequest({ request, email: user.email, workspaceId: workspace.id, action: "account_deletion", status: "completed", details: { scope: "owned_workspace" } });
    return Response.json({ deleted: true }, { headers: { "Set-Cookie": clearSessionCookieHeader(request) } });
  } catch {
    if (trailStarted) {
      try { await recordPrivacyRequest({ request, email: currentUser.email, workspaceId: trailWorkspaceId, action: "account_deletion", status: "failed" }); }
      catch { /* A trilha pode estar indisponível junto com a operação principal. */ }
    }
    return Response.json({ error: "Não foi possível excluir a conta." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/account", exportAccountData);
export const PATCH = withApiTelemetry("PATCH /api/account", correctAccount);
export const DELETE = withApiTelemetry("DELETE /api/account", deleteAccount);

import { and, asc, desc, eq, gt, or } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { accountingWorkspaces, auditEvents, scenarioReviewRounds, users, workspaceInvitations, workspaceMembers } from "../../../../db/schema";
import { getCurrentUser, normalizeEmail } from "../../../auth";
import { canManageWorkspace, createWorkspaceInvitationToken, getWorkspaceContext, sha256Hex } from "../../../workspace";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getWorkspaceEntitlements, officePlanRequiredResponse } from "../../../plan-entitlements";

const allowedRoles = new Set(["admin", "preparer", "reviewer"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listMembers() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a equipe." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.type !== "office") return Response.json({ error: "A gestão de equipe está disponível em workspaces colaborativos." }, { status: 403 });
    const entitlements = await getWorkspaceEntitlements(workspace);
    const db = getDb();
    const members = await db.select({
      id: workspaceMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      joinedAt: workspaceMembers.joinedAt,
    }).from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspace.id))
      .orderBy(asc(users.name));
    const canManage = canManageWorkspace(workspace.role) && entitlements.officeCollaborationEnabled;
    const invitations = canManage ? await db.select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      status: workspaceInvitations.status,
      expiresAt: workspaceInvitations.expiresAt,
      createdAt: workspaceInvitations.createdAt,
    }).from(workspaceInvitations).where(and(
      eq(workspaceInvitations.workspaceId, workspace.id),
      eq(workspaceInvitations.status, "pending"),
      gt(workspaceInvitations.expiresAt, new Date().toISOString()),
    )).orderBy(desc(workspaceInvitations.createdAt)) : [];
    return Response.json({ workspace, members, invitations, canManage, entitlements });
  } catch {
    return Response.json({ error: "Não foi possível carregar a equipe." }, { status: 500 });
  }
}

async function inviteMember(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para convidar um membro." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.type !== "office" || !canManageWorkspace(workspace.role)) return Response.json({ error: "Somente proprietários e administradores podem convidar membros." }, { status: 403 });
    const entitlements = await getWorkspaceEntitlements(workspace);
    if (!entitlements.officeCollaborationEnabled) return officePlanRequiredResponse(entitlements);
    const payload = (await request.json()) as Record<string, unknown>;
    const email = normalizeEmail(typeof payload.email === "string" ? payload.email : "");
    const role = typeof payload.role === "string" && allowedRoles.has(payload.role) ? payload.role : "reviewer";
    if (!emailPattern.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
    const db = getDb();
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existingUser) return Response.json({ error: "Este e-mail já possui uma conta. Nesta fase, convide um e-mail ainda não cadastrado." }, { status: 409 });
    await db.update(workspaceInvitations).set({ status: "revoked" }).where(and(
      eq(workspaceInvitations.workspaceId, workspace.id),
      eq(workspaceInvitations.email, email),
      eq(workspaceInvitations.status, "pending"),
    ));
    const token = createWorkspaceInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const [invitation] = await db.insert(workspaceInvitations).values({
      workspaceId: workspace.id,
      email,
      role,
      tokenHash: await sha256Hex(token),
      invitedByUserId: user.id,
      status: "pending",
      expiresAt,
    }).returning({ id: workspaceInvitations.id, email: workspaceInvitations.email, role: workspaceInvitations.role, expiresAt: workspaceInvitations.expiresAt });
    const url = new URL(`/cadastro?convite=${token}`, request.url).toString();
    return Response.json({ invitation: { ...invitation, url } }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível criar o convite." }, { status: 500 });
  }
}

async function revokeInvitation(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para revogar o convite." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.type !== "office" || !canManageWorkspace(workspace.role)) return Response.json({ error: "Ação não permitida." }, { status: 403 });
    const url = new URL(request.url);
    const memberId = Number(url.searchParams.get("memberId"));
    if (Number.isInteger(memberId) && memberId > 0) {
      const db = getDb();
      const [member] = await db.select({ id: workspaceMembers.id, userId: users.id, name: users.name, role: workspaceMembers.role }).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id)).where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspace.id))).limit(1);
      if (!member) return Response.json({ error: "Membro não encontrado." }, { status: 404 });
      if (member.role === "owner" || member.userId === user.id) return Response.json({ error: "O proprietário e a própria conta não podem ser removidos por este fluxo." }, { status: 409 });
      const [activeReview] = await db.select({ id: scenarioReviewRounds.id }).from(scenarioReviewRounds).where(and(eq(scenarioReviewRounds.workspaceId, workspace.id), or(eq(scenarioReviewRounds.assignedReviewerUserId, member.userId), eq(scenarioReviewRounds.preparedByUserId, member.userId)), eq(scenarioReviewRounds.status, "pending"))).limit(1);
      if (activeReview) return Response.json({ error: "Conclua ou reatribua as revisões pendentes ligadas a este membro antes de removê-lo." }, { status: 409 });
      const [personalWorkspace] = await db.insert(accountingWorkspaces).values({ name: `Espaço profissional de ${member.name}`, workspaceType: "individual", ownerUserId: member.userId, suggestedPlanKey: "pro" }).returning({ id: accountingWorkspaces.id });
      if (!personalWorkspace) throw new Error("personal_workspace_insert_failed");
      try {
        await db.batch([
          db.delete(workspaceMembers).where(and(eq(workspaceMembers.id, member.id), eq(workspaceMembers.workspaceId, workspace.id))),
          db.insert(workspaceMembers).values({ workspaceId: personalWorkspace.id, userId: member.userId, role: "owner", status: "active" }),
          db.update(users).set({ accountType: "individual", suggestedPlanKey: "pro" }).where(eq(users.id, member.userId)),
          db.insert(auditEvents).values({ ownerUserId: workspace.ownerUserId, eventType: "workspace.member_removed", eventData: JSON.stringify({ actorUserId: user.id, removedUserId: member.userId, previousRole: member.role }) }),
        ]);
      } catch (error) {
        await db.delete(accountingWorkspaces).where(eq(accountingWorkspaces.id, personalWorkspace.id));
        throw error;
      }
      return Response.json({ removed: true });
    }
    const id = Number(url.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Convite inválido." }, { status: 400 });
    await getDb().update(workspaceInvitations).set({ status: "revoked" }).where(and(eq(workspaceInvitations.id, id), eq(workspaceInvitations.workspaceId, workspace.id), eq(workspaceInvitations.status, "pending")));
    return Response.json({ revoked: true });
  } catch {
    return Response.json({ error: "Não foi possível revogar o convite." }, { status: 500 });
  }
}

async function updateMemberRole(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para alterar papéis." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.type !== "office" || !canManageWorkspace(workspace.role)) return Response.json({ error: "Somente proprietários e administradores podem alterar papéis." }, { status: 403 });
    const entitlements = await getWorkspaceEntitlements(workspace);
    if (!entitlements.officeCollaborationEnabled) return officePlanRequiredResponse(entitlements);
    const payload = (await request.json()) as Record<string, unknown>;
    const memberId = Number(payload.memberId);
    const role = typeof payload.role === "string" && allowedRoles.has(payload.role) ? payload.role : "";
    if (!Number.isInteger(memberId) || memberId <= 0 || !role) return Response.json({ error: "Membro ou papel inválido." }, { status: 400 });
    const db = getDb();
    const [member] = await db.select({ id: workspaceMembers.id, userId: workspaceMembers.userId, role: workspaceMembers.role }).from(workspaceMembers).where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspace.id))).limit(1);
    if (!member) return Response.json({ error: "Membro não encontrado." }, { status: 404 });
    if (member.role === "owner" || member.userId === user.id) return Response.json({ error: "O papel do proprietário ou da própria conta não pode ser alterado aqui." }, { status: 409 });
    if (role === "preparer") {
      const [assignedReview] = await db.select({ id: scenarioReviewRounds.id }).from(scenarioReviewRounds).where(and(eq(scenarioReviewRounds.workspaceId, workspace.id), eq(scenarioReviewRounds.assignedReviewerUserId, member.userId), eq(scenarioReviewRounds.status, "pending"))).limit(1);
      if (assignedReview) return Response.json({ error: "Reatribua as revisões pendentes antes de retirar a permissão de revisor." }, { status: 409 });
    }
    await db.batch([
      db.update(workspaceMembers).set({ role }).where(eq(workspaceMembers.id, member.id)),
      db.insert(auditEvents).values({ ownerUserId: workspace.ownerUserId, eventType: "workspace.member_role_changed", eventData: JSON.stringify({ actorUserId: user.id, targetUserId: member.userId, previousRole: member.role, role }) }),
    ]);
    return Response.json({ member: { ...member, role } });
  } catch {
    return Response.json({ error: "Não foi possível alterar o papel." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/office/members", listMembers);
export const POST = withApiTelemetry("POST /api/office/members", inviteMember);
export const PATCH = withApiTelemetry("PATCH /api/office/members", updateMemberRole);
export const DELETE = withApiTelemetry("DELETE /api/office/members", revokeInvitation);

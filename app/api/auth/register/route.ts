import { and, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { createRecoveryKey, createSession, hashPassword, hashRecoveryKey, normalizeEmail, passwordIsStrong, sessionCookieHeader } from "../../../auth";
import { getDb } from "../../../../db";
import { accountingWorkspaces, companies, trialDeviceClaims, users, workspaceInvitations, workspaceMembers } from "../../../../db/schema";
import { sha256Hex } from "../../../workspace";
import { getWorkspaceEntitlements, officePlanRequiredResponse } from "../../../plan-entitlements";
import { TRIAL_COMPANY_LIMIT, TRIAL_DURATION_DAYS, trialEndsAt } from "../../../../domain/trial";
import { buildTrialClaimIdentity, trialDeviceCookieHeader } from "../../../trial-protection";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let createdUserId: number | null = null;
  let createdWorkspaceId: number | null = null;
  let acceptedInvitationId: number | null = null;
  let createdTrialClaimId: number | null = null;
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ").slice(0, 100) : "";
    const email = normalizeEmail(typeof payload.email === "string" ? payload.email : "");
    const password = typeof payload.password === "string" ? payload.password : "";
    const requestedAccountType = payload.accountType === "office" ? "office" : "individual";
    const requestedOfficeName = typeof payload.officeName === "string" ? payload.officeName.trim().replace(/\s+/g, " ").slice(0, 120) : "";
    const inviteToken = typeof payload.inviteToken === "string" ? payload.inviteToken.trim().toLowerCase() : "";
    const trialIdentity = inviteToken ? null : await buildTrialClaimIdentity(request, payload, email);

    if (name.length < 2 || !emailPattern.test(email) || !passwordIsStrong(password)) {
      return Response.json({ error: "Informe nome, e-mail válido e uma senha com pelo menos 12 caracteres, letra e número." }, { status: 400 });
    }
    if (!inviteToken && requestedAccountType === "office" && requestedOfficeName.length < 2) {
      return Response.json({ error: "Informe o nome do escritório contábil." }, { status: 400 });
    }

    const db = getDb();
    let invitation: { id: number; workspaceId: number; email: string; role: string; workspaceName: string; ownerUserId: number; suggestedPlanKey: string } | null = null;
    if (inviteToken) {
      if (!/^[0-9a-f]{48}$/.test(inviteToken)) return Response.json({ error: "Este convite é inválido." }, { status: 400 });
      const [row] = await db.select({
        id: workspaceInvitations.id,
        workspaceId: workspaceInvitations.workspaceId,
        email: workspaceInvitations.email,
        role: workspaceInvitations.role,
        workspaceName: accountingWorkspaces.name,
        ownerUserId: accountingWorkspaces.ownerUserId,
        suggestedPlanKey: accountingWorkspaces.suggestedPlanKey,
      }).from(workspaceInvitations)
        .innerJoin(accountingWorkspaces, eq(workspaceInvitations.workspaceId, accountingWorkspaces.id))
        .where(and(
          eq(workspaceInvitations.tokenHash, await sha256Hex(inviteToken)),
          eq(workspaceInvitations.status, "pending"),
          gt(workspaceInvitations.expiresAt, new Date().toISOString()),
        )).limit(1);
      if (!row) return Response.json({ error: "Este convite expirou ou já foi utilizado." }, { status: 410 });
      if (normalizeEmail(row.email) !== email) return Response.json({ error: `Use o e-mail convidado: ${row.email}.` }, { status: 400 });
      const entitlements = await getWorkspaceEntitlements({ id: row.workspaceId, name: row.workspaceName, type: "office", ownerUserId: row.ownerUserId, suggestedPlanKey: "unico", role: "owner" });
      if (!entitlements.officeCollaborationEnabled) return officePlanRequiredResponse(entitlements);
      invitation = row;
    }
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return Response.json({ error: "Já existe uma conta com este e-mail." }, { status: 409 });

    const [{ total }] = await db.select({ total: count() }).from(users);
    const passwordData = await hashPassword(password);
    const recoveryKey = createRecoveryKey();
    const recoveryKeyHash = await hashRecoveryKey(recoveryKey);
    const accountType = invitation ? "office" : requestedAccountType;
    const suggestedPlanKey = "unico";
    const [user] = await db.insert(users).values({ name, email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, passwordIterations: passwordData.iterations, recoveryKeyHash, accountType, suggestedPlanKey }).returning({ id: users.id, name: users.name, email: users.email });
    createdUserId = user.id;

    let workspaceId: number;
    let workspaceName: string;
    let trialGranted = false;
    let trialStartedAt: string | null = null;
    let trialEndsAtValue: string | null = null;
    if (invitation) {
      workspaceId = invitation.workspaceId;
      workspaceName = invitation.workspaceName;
      acceptedInvitationId = invitation.id;
      const acceptedAt = new Date().toISOString();
      const safeRole = ["admin", "preparer", "reviewer"].includes(invitation.role) ? invitation.role : "reviewer";
      const acceptance = await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO workspace_members (workspace_id, user_id, role, status)
          SELECT workspace_id, ?, ?, 'active' FROM workspace_invitations
          WHERE id = ? AND status = 'pending' AND expires_at > ?
        `).bind(user.id, safeRole, invitation.id, acceptedAt),
        env.DB.prepare(`
          UPDATE workspace_invitations SET status = 'accepted', accepted_by_user_id = ?, accepted_at = ?
          WHERE id = ? AND status = 'pending' AND expires_at > ?
        `).bind(user.id, acceptedAt, invitation.id, acceptedAt),
      ]);
      if (acceptance[0].meta.changes !== 1 || acceptance[1].meta.changes !== 1) throw new Error("invitation_no_longer_valid");
    } else {
      workspaceName = accountType === "office" ? requestedOfficeName : `Espaço profissional de ${name}`;
      const [workspace] = await db.insert(accountingWorkspaces).values({ name: workspaceName, workspaceType: accountType, ownerUserId: user.id, suggestedPlanKey }).returning({ id: accountingWorkspaces.id });
      if (!workspace) throw new Error("workspace_insert_failed");
      workspaceId = workspace.id;
      createdWorkspaceId = workspace.id;
      await db.insert(workspaceMembers).values({ workspaceId, userId: user.id, role: "owner", status: "active" });

      if (trialIdentity) {
        trialStartedAt = new Date().toISOString();
        trialEndsAtValue = trialEndsAt(trialStartedAt);
        const hashVersions = [trialIdentity, ...trialIdentity.historicalHashes];
        const [usedClaim] = await db.select({ id: trialDeviceClaims.id }).from(trialDeviceClaims).where(or(
          inArray(trialDeviceClaims.deviceHash, hashVersions.map((hash) => hash.deviceHash)),
          inArray(trialDeviceClaims.fingerprintHash, hashVersions.map((hash) => hash.fingerprintHash)),
          inArray(trialDeviceClaims.emailHash, hashVersions.map((hash) => hash.emailHash)),
        )).limit(1);
        const [claim] = usedClaim ? [] : await db.insert(trialDeviceClaims).values({
          userId: user.id,
          workspaceId,
          deviceHash: trialIdentity.deviceHash,
          fingerprintHash: trialIdentity.fingerprintHash,
          emailHash: trialIdentity.emailHash,
          networkHash: trialIdentity.networkHash,
          status: "active",
          startedAt: trialStartedAt,
          endsAt: trialEndsAtValue,
        }).onConflictDoNothing().returning({ id: trialDeviceClaims.id });
        trialGranted = Boolean(claim);
        createdTrialClaimId = claim?.id ?? null;
        if (!claim) {
          trialStartedAt = null;
          trialEndsAtValue = null;
        }
      }
    }

    const configuredLegacyOwner = normalizeEmail(String((env as unknown as { LEGACY_OWNER_EMAIL?: string }).LEGACY_OWNER_EMAIL ?? ""));
    const canClaimLegacyData = configuredLegacyOwner ? configuredLegacyOwner === email : Number(total) === 0;
    if (canClaimLegacyData) await db.update(companies).set({ ownerUserId: user.id, workspaceId }).where(isNull(companies.ownerUserId));

    const session = await createSession(user.id);
    const headers = new Headers();
    headers.append("Set-Cookie", sessionCookieHeader(session.token, request));
    if (trialIdentity) headers.append("Set-Cookie", trialDeviceCookieHeader(trialIdentity.deviceId, request));
    return Response.json({
      user,
      recoveryKey,
      workspace: { id: workspaceId, name: workspaceName, type: accountType, suggestedPlanKey },
      trial: {
        granted: trialGranted,
        days: TRIAL_DURATION_DAYS,
        companyLimit: TRIAL_COMPANY_LIMIT,
        startedAt: trialStartedAt,
        endsAt: trialEndsAtValue,
        reason: invitation
          ? "workspace_inherited"
          : trialGranted
            ? null
            : trialIdentity
              ? "device_already_used"
              : "device_verification_unavailable",
      },
    }, { status: 201, headers });
  } catch (error) {
    if (createdUserId) {
      try {
        const db = getDb();
        if (createdTrialClaimId) await db.delete(trialDeviceClaims).where(eq(trialDeviceClaims.id, createdTrialClaimId));
        await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, createdUserId));
        if (createdWorkspaceId) await db.delete(accountingWorkspaces).where(eq(accountingWorkspaces.id, createdWorkspaceId));
        if (acceptedInvitationId) await db.update(workspaceInvitations).set({ status: "pending", acceptedByUserId: null, acceptedAt: null }).where(and(eq(workspaceInvitations.id, acceptedInvitationId), eq(workspaceInvitations.acceptedByUserId, createdUserId)));
        await db.delete(users).where(eq(users.id, createdUserId));
      } catch {
        // A unique e-mail response below remains safer than exposing persistence details.
      }
    }
    if (String(error).toLowerCase().includes("unique")) return Response.json({ error: "Já existe uma conta com este e-mail." }, { status: 409 });
    return Response.json({ error: "Não foi possível criar sua conta agora." }, { status: 500 });
  }
}

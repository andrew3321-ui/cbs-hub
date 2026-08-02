import { and, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { createAccountCode, createRecoveryKey, createSession, hashPassword, hashRecoveryKey, internalAccountEmail, normalizeEmail, normalizeUsername, passwordIsStrong, sessionCookieHeader, usernameIsValid } from "../../../auth";
import { getDb } from "../../../../db";
import { accountingWorkspaces, companies, trialDeviceClaims, users, workspaceInvitations, workspaceMembers } from "../../../../db/schema";
import { sha256Hex } from "../../../workspace";
import { getWorkspaceEntitlements, officePlanRequiredResponse } from "../../../plan-entitlements";
import { TRIAL_COMPANY_LIMIT, TRIAL_DURATION_DAYS, trialEndsAt } from "../../../../domain/trial";
import { buildTrialClaimIdentity, trialDeviceCookieHeader } from "../../../trial-protection";
import { metricIdentityCookies, recordPlatformMetricEvent, type MetricEventType } from "../../../platform-analytics";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MetricIdentity = ReturnType<typeof metricIdentityCookies>;

async function recordRegistrationMetric(request: Request, identity: MetricIdentity, eventType: MetricEventType, reason: string) {
  try {
    await recordPlatformMetricEvent({ request, eventType, payload: { pathname: "/cadastro", reason }, visitorId: identity.visitorId, sessionId: identity.sessionId });
  } catch (metricError) {
    console.warn(JSON.stringify({ event: "platform_metrics.registration_record_failed", eventType, error: metricError instanceof Error ? metricError.name : "UnknownError" }));
  }
}

async function registrationError(request: Request, identity: MetricIdentity, status: number, code: string, error: string) {
  await recordRegistrationMetric(request, identity, "signup_failure", code.toLowerCase());
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const cookie of identity.headers) headers.append("Set-Cookie", cookie);
  return Response.json({ error, code }, { status, headers });
}

export async function POST(request: Request) {
  const metricIdentity = metricIdentityCookies(request);
  let createdUserId: number | null = null;
  let createdWorkspaceId: number | null = null;
  let acceptedInvitationId: number | null = null;
  let createdTrialClaimId: number | null = null;
  try {
    await recordRegistrationMetric(request, metricIdentity, "signup_request", "received");
    const payload = (await request.json()) as Record<string, unknown>;
    const suppliedName = typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ").slice(0, 100) : "";
    const suppliedEmail = normalizeEmail(typeof payload.email === "string" ? payload.email : "");
    const suppliedUsername = normalizeUsername(typeof payload.username === "string" ? payload.username : "");
    const password = typeof payload.password === "string" ? payload.password : "";
    const inviteToken = typeof payload.inviteToken === "string" ? payload.inviteToken.trim().toLowerCase() : "";

    const db = getDb();
    let accountCode = createAccountCode();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const [collision] = await db.select({ id: users.id }).from(users).where(eq(users.accountCode, accountCode)).limit(1);
      if (!collision) break;
      accountCode = createAccountCode();
    }
    const username = inviteToken ? `membro-${accountCode.slice(4).toLowerCase()}` : suppliedUsername;
    const name = inviteToken ? suppliedName : username;
    const email = inviteToken ? suppliedEmail : internalAccountEmail(accountCode);
    const trialIdentity = inviteToken ? null : await buildTrialClaimIdentity(request, payload, email);

    if (inviteToken ? name.length < 2 || !emailPattern.test(email) || !passwordIsStrong(password) : !usernameIsValid(username) || !passwordIsStrong(password)) {
      return registrationError(request, metricIdentity, 400, "INVALID_INPUT", inviteToken
        ? "Informe seu nome, o e-mail convidado e uma senha com pelo menos 12 caracteres, letra e número."
        : "Escolha um usuário de 3 a 24 caracteres e uma senha com pelo menos 12 caracteres, letra e número.");
    }

    let invitation: { id: number; workspaceId: number; email: string; role: string; workspaceName: string; ownerUserId: number; suggestedPlanKey: string } | null = null;
    if (inviteToken) {
      if (!/^[0-9a-f]{48}$/.test(inviteToken)) return registrationError(request, metricIdentity, 400, "INVITE_INVALID", "Este convite é inválido.");
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
      if (!row) return registrationError(request, metricIdentity, 410, "INVITE_EXPIRED", "Este convite expirou ou já foi utilizado.");
      if (normalizeEmail(row.email) !== email) return registrationError(request, metricIdentity, 400, "INVITE_EMAIL_MISMATCH", `Use o e-mail convidado: ${row.email}.`);
      const entitlements = await getWorkspaceEntitlements({ id: row.workspaceId, name: row.workspaceName, type: "office", ownerUserId: row.ownerUserId, suggestedPlanKey: "unico", role: "owner" });
      if (!entitlements.officeCollaborationEnabled) {
        await recordRegistrationMetric(request, metricIdentity, "signup_failure", "office_plan_required");
        return officePlanRequiredResponse(entitlements);
      }
      invitation = row;
    }
    const [existingUsername] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (existingUsername) return registrationError(request, metricIdentity, 409, "USERNAME_EXISTS", "Este nome de usuário já está em uso. Escolha outro.");
    if (inviteToken) {
      const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existingEmail) return registrationError(request, metricIdentity, 409, "EMAIL_EXISTS", "Já existe uma conta com este e-mail.");
    }

    const [{ total }] = await db.select({ total: count() }).from(users);
    const passwordData = await hashPassword(password);
    const recoveryKey = createRecoveryKey();
    const recoveryKeyHash = await hashRecoveryKey(recoveryKey);
    const accountType = invitation ? "office" : "individual";
    const suggestedPlanKey = "unico";
    const [user] = await db.insert(users).values({ name, firstName: invitation ? name.split(/\s+/)[0] : null, username, accountCode, email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, passwordIterations: passwordData.iterations, recoveryKeyHash, accountType, suggestedPlanKey }).returning({ id: users.id, name: users.name, firstName: users.firstName, username: users.username, accountCode: users.accountCode, email: users.email });
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
      workspaceName = `Espaço profissional de ${username}`;
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

    try {
      await recordPlatformMetricEvent({ request, eventType: "signup", userId: user.id, payload: { pathname: "/cadastro" }, visitorId: metricIdentity.visitorId, sessionId: metricIdentity.sessionId });
      if (!invitation) await recordPlatformMetricEvent({ request, eventType: trialGranted ? "trial_started" : "trial_denied", userId: user.id, payload: { pathname: "/cadastro", reason: trialGranted ? "granted" : trialIdentity ? "already_used" : "verification_unavailable" }, visitorId: metricIdentity.visitorId, sessionId: metricIdentity.sessionId });
    } catch (metricError) {
      console.warn(JSON.stringify({ event: "platform_metrics.signup_record_failed", error: metricError instanceof Error ? metricError.name : "UnknownError" }));
    }

    const session = await createSession(user.id);
    const headers = new Headers();
    for (const cookie of metricIdentity.headers) headers.append("Set-Cookie", cookie);
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
    console.error(JSON.stringify({ event: "auth.register_failed", stage: createdUserId ? "persistence_cleanup" : "before_user_insert", error: error instanceof Error ? error.name : "UnknownError" }));
    if (String(error).toLowerCase().includes("unique")) return registrationError(request, metricIdentity, 409, "IDENTITY_EXISTS", "Este usuário não está mais disponível. Escolha outro e tente novamente.");
    return registrationError(request, metricIdentity, 500, "REGISTER_FAILED", "Não foi possível criar sua conta agora.");
  }
}

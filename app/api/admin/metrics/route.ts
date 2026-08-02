import { env } from "cloudflare:workers";
import { billingAmountForAccount } from "../../../billing";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getPlatformAdminUser } from "../../../platform-admin";
import { buildMetricWindow, mergePlatformDailyGroups, percentage, platformMetricDefinitions, PLATFORM_METRICS_VERSION } from "../../../../domain/platform-metrics";

type DailyRow = { date: string; pageViews?: number; visitors?: number; sessions?: number; activeUsers?: number; signups?: number; trialsStarted?: number; trialsDenied?: number; paymentsApproved?: number; grossAmountCents?: number };
type BillingRow = { userId: number; planKey: string; companyAddonBlocks: number; pendingCompanyAddonBlocks: number; providerSubscriptionId: string | null; status: string; updatedAt: string };
type TrialRow = { userId: number | null; status: string; startedAt: string; endsAt: string };

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function ownerMetrics(request: Request) {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao proprietário da plataforma." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const requestedDays = Number(new URL(request.url).searchParams.get("days"));
  const window = buildMetricWindow(requestedDays);
  const runtime = env as unknown as { DB: D1Database };
  const db = runtime.DB;
  const sevenDays = new Date(`${window.endDate}T00:00:00.000Z`); sevenDays.setUTCDate(sevenDays.getUTCDate() - 6);
  const thirtyDays = new Date(`${window.endDate}T00:00:00.000Z`); thirtyDays.setUTCDate(thirtyDays.getUTCDate() - 29);

  const [traffic, signups, trialsDaily, paymentsDaily, periodTotals, activity, usersTotal, trialRowsResult, billingRowsResult, approvedPayersResult, sourceRows, seoCtaRows, failureRows] = await Promise.all([
    db.prepare("SELECT event_date date, SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) pageViews, COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN visitor_hash END) visitors, COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_hash END) sessions, COUNT(DISTINCT CASE WHEN event_type = 'app_active' THEN user_id END) activeUsers, SUM(CASE WHEN event_type = 'trial_denied' THEN 1 ELSE 0 END) trialsDenied FROM platform_metric_events WHERE event_date BETWEEN ? AND ? GROUP BY event_date ORDER BY event_date").bind(window.startDate, window.endDate).all<DailyRow>(),
    db.prepare("SELECT substr(created_at, 1, 10) date, COUNT(*) signups FROM users WHERE substr(created_at, 1, 10) BETWEEN ? AND ? GROUP BY substr(created_at, 1, 10)").bind(window.startDate, window.endDate).all<DailyRow>(),
    db.prepare("SELECT substr(started_at, 1, 10) date, COUNT(*) trialsStarted FROM trial_device_claims WHERE substr(started_at, 1, 10) BETWEEN ? AND ? GROUP BY substr(started_at, 1, 10)").bind(window.startDate, window.endDate).all<DailyRow>(),
    db.prepare("SELECT substr(approved_at, 1, 10) date, COUNT(*) paymentsApproved, COALESCE(SUM(gross_amount_cents), 0) grossAmountCents FROM billing_transactions WHERE status = 'approved' AND substr(approved_at, 1, 10) BETWEEN ? AND ? GROUP BY substr(approved_at, 1, 10)").bind(window.startDate, window.endDate).all<DailyRow>(),
    db.prepare("SELECT COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) pageViews, COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN event_date || ':' || visitor_hash END) visitors, COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_hash END) sessions FROM platform_metric_events WHERE event_date BETWEEN ? AND ?").bind(window.startDate, window.endDate).first<{ pageViews: number; visitors: number; sessions: number }>(),
    db.prepare("SELECT COUNT(DISTINCT CASE WHEN event_type = 'app_active' AND event_date = ? THEN user_id END) dau, COUNT(DISTINCT CASE WHEN event_type = 'app_active' AND event_date >= ? THEN user_id END) wau, COUNT(DISTINCT CASE WHEN event_type = 'app_active' AND event_date >= ? THEN user_id END) mau FROM platform_metric_events WHERE event_date <= ?").bind(window.endDate, sevenDays.toISOString().slice(0, 10), thirtyDays.toISOString().slice(0, 10), window.endDate).first<{ dau: number; wau: number; mau: number }>(),
    db.prepare("SELECT COUNT(*) total FROM users").first<{ total: number }>(),
    db.prepare("SELECT user_id userId, status, started_at startedAt, ends_at endsAt FROM trial_device_claims").all<TrialRow>(),
    db.prepare("SELECT user_id userId, plan_key planKey, company_addon_blocks companyAddonBlocks, pending_company_addon_blocks pendingCompanyAddonBlocks, provider_subscription_id providerSubscriptionId, status, updated_at updatedAt FROM billing_accounts").all<BillingRow>(),
    db.prepare("SELECT DISTINCT user_id userId FROM billing_transactions WHERE status = 'approved'").all<{ userId: number }>(),
    db.prepare("SELECT source, medium, COUNT(*) pageViews, COUNT(DISTINCT event_date || ':' || visitor_hash) visitors FROM platform_metric_events WHERE event_type = 'page_view' AND event_date BETWEEN ? AND ? GROUP BY source, medium ORDER BY visitors DESC, pageViews DESC LIMIT 8").bind(window.startDate, window.endDate).all<{ source: string; medium: string; pageViews: number; visitors: number }>(),
    db.prepare("SELECT path_group pathGroup, campaign, COUNT(*) clicks, COUNT(DISTINCT event_date || ':' || visitor_hash) visitors FROM platform_metric_events WHERE event_type = 'seo_cta' AND event_date BETWEEN ? AND ? GROUP BY path_group, campaign ORDER BY clicks DESC, path_group LIMIT 20").bind(window.startDate, window.endDate).all<{ pathGroup: string; campaign: string; clicks: number; visitors: number }>(),
    db.prepare("SELECT COUNT(*) total FROM billing_transactions WHERE status IN ('rejected', 'cancelled', 'refunded', 'charged_back') AND substr(updated_at, 1, 10) BETWEEN ? AND ?").bind(window.startDate, window.endDate).first<{ total: number }>(),
  ]);

  const daily = mergePlatformDailyGroups(window.days, window.endDate, [...traffic.results, ...signups.results, ...trialsDaily.results, ...paymentsDaily.results]);
  if (daily.length) await db.batch(daily.map((row) => db.prepare("INSERT INTO platform_metric_daily (metric_date, page_views, visitors, sessions, signups, active_users, trials_started, trials_denied, payments_approved, gross_amount_cents, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(metric_date) DO UPDATE SET page_views=excluded.page_views, visitors=excluded.visitors, sessions=excluded.sessions, signups=excluded.signups, active_users=excluded.active_users, trials_started=excluded.trials_started, trials_denied=excluded.trials_denied, payments_approved=excluded.payments_approved, gross_amount_cents=excluded.gross_amount_cents, updated_at=excluded.updated_at")
    .bind(row.date, row.pageViews, row.visitors, row.sessions, row.signups, row.activeUsers, row.trialsStarted, row.trialsDenied, row.paymentsApproved, row.grossAmountCents, new Date().toISOString())));

  const trials = trialRowsResult.results;
  const billing = billingRowsResult.results;
  const approvedPayers = new Set(approvedPayersResult.results.map((row) => row.userId));
  const trialCohort = trials.filter((row) => row.startedAt.slice(0, 10) >= window.startDate && row.startedAt.slice(0, 10) <= window.endDate);
  const activeTrials = trials.filter((row) => row.status === "active" && row.endsAt >= new Date().toISOString()).length;
  const expiredTrials = trials.filter((row) => row.status !== "active" || row.endsAt < new Date().toISOString()).length;
  const convertedTrials = trialCohort.filter((row) => row.userId && approvedPayers.has(row.userId)).length;
  const activeBilling = billing.filter((row) => row.status === "active");
  const delinquent = billing.filter((row) => ["renewal_pending", "payment_failed"].includes(row.status)).length;
  const canceled = billing.filter((row) => row.status === "canceled" && row.updatedAt.slice(0, 10) >= window.startDate && row.updatedAt.slice(0, 10) <= window.endDate).length;
  const mrrCents = activeBilling.reduce((sum, row) => sum + (billingAmountForAccount(row) ?? 0), 0);
  const signupCount = daily.reduce((sum, row) => sum + row.signups, 0);
  const trialStarted = daily.reduce((sum, row) => sum + row.trialsStarted, 0);
  const grossAmountCents = daily.reduce((sum, row) => sum + row.grossAmountCents, 0);

  return Response.json({
    version: PLATFORM_METRICS_VERSION,
    generatedAt: new Date().toISOString(),
    window,
    definitions: platformMetricDefinitions,
    acquisition: { pageViews: number(periodTotals?.pageViews), visitors: number(periodTotals?.visitors), sessions: number(periodTotals?.sessions), sources: sourceRows.results.map((row) => ({ ...row, pageViews: number(row.pageViews), visitors: number(row.visitors) })), seoCtas: seoCtaRows.results.map((row) => ({ ...row, clicks: number(row.clicks), visitors: number(row.visitors) })) },
    users: { total: number(usersTotal?.total), signups: signupCount, dau: number(activity?.dau), wau: number(activity?.wau), mau: number(activity?.mau) },
    trials: { started: trialStarted, active: activeTrials, expired: expiredTrials, denied: daily.reduce((sum, row) => sum + row.trialsDenied, 0), converted: convertedTrials, signupToTrialPercent: percentage(trialStarted, signupCount), trialToPayerPercent: percentage(convertedTrials, trialCohort.length) },
    billing: { activePayers: activeBilling.length, mrrCents, grossAmountCents, delinquent, canceled, paymentFailures: number(failureRows?.total) },
    funnel: [
      { key: "visitors", label: "Visitas únicas/dia", value: number(periodTotals?.visitors) },
      { key: "signups", label: "Cadastros", value: signupCount },
      { key: "trials", label: "Trials iniciados", value: trialStarted },
      { key: "payers", label: "Trials convertidos", value: convertedTrials },
    ],
    daily,
    privacy: { rawIpStored: false, rawUserAgentStored: false, pseudonymousIdentifiers: true, eventRetentionDays: 90, dailyRetentionDays: 730 },
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/admin/metrics", ownerMetrics);

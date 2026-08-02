import { env } from "cloudflare:workers";
import { billingAmountForAccount } from "../../../billing";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getPlatformAdminUser } from "../../../platform-admin";
import { buildMetricWindow, mergePlatformDailyGroups, percentage, platformMetricDefinitions, PLATFORM_METRICS_VERSION } from "../../../../domain/platform-metrics";
import { publicIndexableRoutes } from "../../../../domain/seo-route-policy";
import { searchConsoleConfiguration } from "../../../search-console-service";
import { buildSearchConsoleAlerts, buildSearchConsoleOpportunities, SEARCH_CONSOLE_RETENTION_DAYS, SEARCH_CONSOLE_VERSION } from "../../../../domain/search-console";

type DailyRow = { date: string; pageViews?: number; visitors?: number; sessions?: number; activeUsers?: number; signups?: number; trialsStarted?: number; trialsDenied?: number; paymentsApproved?: number; grossAmountCents?: number };
type BillingRow = { userId: number; planKey: string; companyAddonBlocks: number; pendingCompanyAddonBlocks: number; providerSubscriptionId: string | null; status: string; updatedAt: string };
type TrialRow = { userId: number | null; status: string; startedAt: string; endsAt: string };
type SearchSummary = { clicks?: number; impressions?: number; position?: number };

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

  const searchLatest = await db.prepare("SELECT MAX(metric_date) latestDate FROM search_console_metrics").first<{ latestDate: string | null }>();
  const searchEndDate = searchLatest?.latestDate ?? window.endDate;
  const searchStart = new Date(`${searchEndDate}T00:00:00.000Z`); searchStart.setUTCDate(searchStart.getUTCDate() - window.days + 1);
  const searchStartDate = searchStart.toISOString().slice(0, 10);
  const previousEnd = new Date(searchStart); previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd); previousStart.setUTCDate(previousStart.getUTCDate() - window.days + 1);
  const searchConfiguration = searchConsoleConfiguration(env as never);
  const [searchCurrent, searchPrevious, pageRows, queryRows, latestSync, latestIndexDate, organicVisitors, organicSignups, organicTrials, organicPayers] = await Promise.all([
    db.prepare("SELECT COALESCE(SUM(clicks), 0) clicks, COALESCE(SUM(impressions), 0) impressions, CASE WHEN SUM(impressions) > 0 THEN SUM(position_micros * impressions) * 1.0 / SUM(impressions) / 1000000 ELSE 0 END position FROM search_console_metrics WHERE metric_date BETWEEN ? AND ?").bind(searchStartDate, searchEndDate).first<SearchSummary>(),
    db.prepare("SELECT COALESCE(SUM(clicks), 0) clicks, COALESCE(SUM(impressions), 0) impressions, CASE WHEN SUM(impressions) > 0 THEN SUM(position_micros * impressions) * 1.0 / SUM(impressions) / 1000000 ELSE 0 END position FROM search_console_metrics WHERE metric_date BETWEEN ? AND ?").bind(previousStart.toISOString().slice(0, 10), previousEnd.toISOString().slice(0, 10)).first<SearchSummary>(),
    db.prepare("SELECT page, SUM(clicks) clicks, SUM(impressions) impressions, CASE WHEN SUM(impressions) > 0 THEN SUM(clicks) * 100.0 / SUM(impressions) ELSE 0 END ctr, CASE WHEN SUM(impressions) > 0 THEN SUM(position_micros * impressions) * 1.0 / SUM(impressions) / 1000000 ELSE 0 END position FROM search_console_metrics WHERE metric_date BETWEEN ? AND ? GROUP BY page ORDER BY impressions DESC LIMIT 20").bind(searchStartDate, searchEndDate).all<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>(),
    db.prepare("SELECT query, page, SUM(clicks) clicks, SUM(impressions) impressions, CASE WHEN SUM(impressions) > 0 THEN SUM(clicks) * 100.0 / SUM(impressions) ELSE 0 END ctr, CASE WHEN SUM(impressions) > 0 THEN SUM(position_micros * impressions) * 1.0 / SUM(impressions) / 1000000 ELSE 0 END position FROM search_console_metrics WHERE metric_date BETWEEN ? AND ? AND query <> '' GROUP BY query, page ORDER BY impressions DESC LIMIT 100").bind(searchStartDate, searchEndDate).all<{ query: string; page: string; clicks: number; impressions: number; ctr: number; position: number }>(),
    db.prepare("SELECT id, status, started_at startedAt, completed_at completedAt, start_date startDate, end_date endDate, metric_rows metricRows, inspected_pages inspectedPages, error_code errorCode FROM search_console_sync_runs ORDER BY started_at DESC, id DESC LIMIT 1").first(),
    db.prepare("SELECT MAX(snapshot_date) latestDate FROM search_console_index_snapshots").first<{ latestDate: string | null }>(),
    db.prepare("SELECT COUNT(DISTINCT event_date || ':' || visitor_hash) total FROM platform_metric_events WHERE event_type = 'page_view' AND event_date BETWEEN ? AND ? AND visitor_hash IS NOT NULL AND (medium = 'organic' OR source IN ('google', 'bing'))").bind(window.startDate, window.endDate).first<{ total: number }>(),
    db.prepare("SELECT COUNT(DISTINCT e.user_id) total FROM platform_metric_events e WHERE e.event_type = 'signup' AND e.event_date BETWEEN ? AND ? AND e.user_id IS NOT NULL AND e.visitor_hash IS NOT NULL AND EXISTS (SELECT 1 FROM platform_metric_events pv WHERE pv.event_type = 'page_view' AND pv.visitor_hash = e.visitor_hash AND (pv.medium = 'organic' OR pv.source IN ('google', 'bing')) AND pv.occurred_at <= e.occurred_at AND pv.occurred_at >= datetime(e.occurred_at, '-30 days'))").bind(window.startDate, window.endDate).first<{ total: number }>(),
    db.prepare("SELECT COUNT(DISTINCT e.user_id) total FROM platform_metric_events e WHERE e.event_type = 'trial_started' AND e.event_date BETWEEN ? AND ? AND e.user_id IS NOT NULL AND e.visitor_hash IS NOT NULL AND EXISTS (SELECT 1 FROM platform_metric_events pv WHERE pv.event_type = 'page_view' AND pv.visitor_hash = e.visitor_hash AND (pv.medium = 'organic' OR pv.source IN ('google', 'bing')) AND pv.occurred_at <= e.occurred_at AND pv.occurred_at >= datetime(e.occurred_at, '-30 days'))").bind(window.startDate, window.endDate).first<{ total: number }>(),
    db.prepare("SELECT COUNT(DISTINCT bt.user_id) total FROM billing_transactions bt WHERE bt.status = 'approved' AND substr(bt.approved_at, 1, 10) BETWEEN ? AND ? AND EXISTS (SELECT 1 FROM platform_metric_events e WHERE e.event_type = 'signup' AND e.user_id = bt.user_id AND e.visitor_hash IS NOT NULL AND EXISTS (SELECT 1 FROM platform_metric_events pv WHERE pv.event_type = 'page_view' AND pv.visitor_hash = e.visitor_hash AND (pv.medium = 'organic' OR pv.source IN ('google', 'bing')) AND pv.occurred_at <= e.occurred_at AND pv.occurred_at >= datetime(e.occurred_at, '-30 days')))").bind(window.startDate, window.endDate).first<{ total: number }>(),
  ]);
  const latestIndex = latestIndexDate?.latestDate
    ? await db.prepare("SELECT page, verdict, coverage_state coverageState, indexing_state indexingState, page_fetch_state pageFetchState, last_crawl_time lastCrawlTime, google_canonical googleCanonical, user_canonical userCanonical FROM search_console_index_snapshots WHERE snapshot_date = ? ORDER BY page").bind(latestIndexDate.latestDate).all<{ page: string; verdict: string; coverageState: string; indexingState: string; pageFetchState: string; lastCrawlTime: string | null; googleCanonical: string | null; userCanonical: string | null }>()
    : { results: [] };
  const indexedPages = latestIndex.results.filter((row) => row.verdict === "PASS").length;
  const organic = { visitors: number(organicVisitors?.total), signups: number(organicSignups?.total), trials: number(organicTrials?.total), payers: number(organicPayers?.total) };
  const searchCurrentValues = { clicks: number(searchCurrent?.clicks), impressions: number(searchCurrent?.impressions), position: number(searchCurrent?.position) };
  const searchPreviousValues = { clicks: number(searchPrevious?.clicks), impressions: number(searchPrevious?.impressions), position: number(searchPrevious?.position) };
  const searchAlerts = buildSearchConsoleAlerts({ currentClicks: searchCurrentValues.clicks, previousClicks: searchPreviousValues.clicks, currentImpressions: searchCurrentValues.impressions, previousImpressions: searchPreviousValues.impressions, currentPosition: searchCurrentValues.position, previousPosition: searchPreviousValues.position, indexedPages, expectedPages: latestIndexDate?.latestDate ? publicIndexableRoutes.length : 0, organicVisitors: organic.visitors, organicSignups: organic.signups });

  return Response.json({
    version: PLATFORM_METRICS_VERSION,
    generatedAt: new Date().toISOString(),
    window,
    definitions: platformMetricDefinitions,
    acquisition: { pageViews: number(periodTotals?.pageViews), visitors: number(periodTotals?.visitors), sessions: number(periodTotals?.sessions), sources: sourceRows.results.map((row) => ({ ...row, pageViews: number(row.pageViews), visitors: number(row.visitors) })), seoCtas: seoCtaRows.results.map((row) => ({ ...row, clicks: number(row.clicks), visitors: number(row.visitors) })), organic },
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
    searchConsole: { version: SEARCH_CONSOLE_VERSION, configured: searchConfiguration.configured, siteUrl: searchConfiguration.siteUrl, retentionDays: SEARCH_CONSOLE_RETENTION_DAYS, range: { startDate: searchStartDate, endDate: searchEndDate }, current: { ...searchCurrentValues, ctrPercent: percentage(searchCurrentValues.clicks, searchCurrentValues.impressions) }, previous: searchPreviousValues, pages: pageRows.results.map((row) => ({ ...row, clicks: number(row.clicks), impressions: number(row.impressions), ctr: number(row.ctr), position: number(row.position) })), opportunities: buildSearchConsoleOpportunities(queryRows.results), indexation: { snapshotDate: latestIndexDate?.latestDate ?? null, indexedPages, expectedPages: publicIndexableRoutes.length, pages: latestIndex.results }, alerts: searchAlerts, lastSync: latestSync ?? null },
    privacy: { rawIpStored: false, rawUserAgentStored: false, pseudonymousIdentifiers: true, eventRetentionDays: 90, dailyRetentionDays: 730 },
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/admin/metrics", ownerMetrics);

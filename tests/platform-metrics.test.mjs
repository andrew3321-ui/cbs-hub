import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildMetricWindow,
  completeDailySeries,
  isLikelyAutomatedTraffic,
  mergePlatformDailyGroups,
  normalizeMetricAcquisition,
  normalizeMetricPath,
  percentage,
  PLATFORM_METRIC_DAILY_RETENTION_DAYS,
  PLATFORM_METRIC_EVENT_RETENTION_DAYS,
  platformMetricDefinitions,
} from "../domain/platform-metrics.ts";

test("dicionário define aquisição, atividade, trials, pagadores e conversão", () => {
  assert.deepEqual(Object.keys(platformMetricDefinitions), ["pageViews", "visitors", "sessions", "signups", "signupFunnel", "activeUsers", "trials", "payers", "conversion", "organicAttribution", "searchConsole"]);
  assert.match(platformMetricDefinitions.activeUsers, /DAU\/WAU\/MAU/);
  assert.match(platformMetricDefinitions.visitors, /mesmo dia contam uma vez/);
  assert.match(platformMetricDefinitions.visitors, /novo dia abre uma nova visita/);
  assert.match(platformMetricDefinitions.organicAttribution, /consulta do Google nunca é vinculada à pessoa/);
  assert.equal(PLATFORM_METRIC_EVENT_RETENTION_DAYS, 90);
  assert.equal(PLATFORM_METRIC_DAILY_RETENTION_DAYS, 730);
});

test("caminho é minimizado e nunca preserva query ou identificador", () => {
  assert.equal(normalizeMetricPath("/app?email=pessoa@example.com"), "workspace");
  assert.equal(normalizeMetricPath("/cadastro?cpf=123"), "signup");
  assert.equal(normalizeMetricPath("/clientes/42"), "other");
});

test("aquisição é normalizada sem URL ou texto arbitrário", () => {
  assert.deepEqual(normalizeMetricAcquisition({ source: " Google Ads ", medium: "CPC", campaign: "Julho 2026!" }), { source: "google-ads", medium: "cpc", campaign: "julho-2026" });
  assert.deepEqual(normalizeMetricAcquisition({ referrerHost: "contabilidade.example.com" }), { source: "contabilidade.example.com", medium: "referral", campaign: "" });
});

test("robôs e clientes automatizados conhecidos são excluídos", () => {
  assert.equal(isLikelyAutomatedTraffic("Mozilla/5.0 Chrome/130 Safari/537.36"), false);
  assert.equal(isLikelyAutomatedTraffic("Googlebot/2.1"), true);
  assert.equal(isLikelyAutomatedTraffic("curl/8.0"), true);
});

test("janelas aceitam 7, 30 e 90 dias e caem em 30 fora da lista", () => {
  const now = new Date("2026-07-31T20:00:00.000Z");
  assert.deepEqual(buildMetricWindow(7, now), { days: 7, startDate: "2026-07-25", endDate: "2026-07-31" });
  assert.equal(buildMetricWindow(365, now).days, 30);
  assert.equal(completeDailySeries([{ date: "2026-07-31", value: 2 }], 7, now).length, 7);
  assert.equal(percentage(3, 4), 75);
  assert.equal(percentage(1, 0), 0);
});

test("agregados diários conciliam tráfego e dados operacionais sem perder dias vazios", () => {
  const rows = mergePlatformDailyGroups(3, "2026-07-31", [
    { date: "2026-07-30", pageViews: 8, visitors: 5, activeUsers: 2 },
    { date: "2026-07-30", signups: 3, trialsStarted: 2 },
    { date: "2026-07-31", paymentsApproved: 1, grossAmountCents: 45_000 },
  ]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { date: "2026-07-29", pageViews: 0, visitors: 0, sessions: 0, activeUsers: 0, signups: 0, trialsStarted: 0, trialsDenied: 0, paymentsApproved: 0, grossAmountCents: 0 });
  assert.equal(rows[1].signups, 3);
  assert.equal(rows[1].trialsStarted, 2);
  assert.equal(rows[2].grossAmountCents, 45_000);
});

test("API e interface preservam autorização server-side e privacidade", async () => {
  const [route, collector, app, account, migration] = await Promise.all([
    readFile(new URL("../app/api/admin/metrics/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/platform-analytics.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/app/CBSHubApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0033_brief_amphibian.sql", import.meta.url), "utf8"),
  ]);
  assert.match(route, /getPlatformAdminUser/);
  assert.match(route, /status: 403/);
  assert.match(route, /COUNT\(DISTINCT CASE WHEN event_type = 'page_view' THEN event_date \|\| ':' \|\| visitor_hash END\) visitors/);
  assert.match(route, /EXISTS \(SELECT 1 FROM users current_users WHERE current_users.id = platform_metric_events.user_id\)/);
  assert.match(route, /INNER JOIN users trial_users ON trial_users.id = t.user_id/);
  assert.match(route, /label: "Visitas únicas\/dia"/);
  assert.match(route, /signupFunnelRows/);
  assert.match(route, /signup_client_error/);
  assert.match(app, /isPlatformAdmin && <button title="Métricas da plataforma"/);
  assert.match(account, /platformActivity/);
  assert.match(account, /delete\(platformMetricEvents\)/);
  assert.match(account, /status: "retained_antifraud"/);
  assert.doesNotMatch(collector, /cf-connecting-ip|x-forwarded-for/);
  assert.match(collector, /visitorHash/);
  assert.match(migration, /platform_metric_events/);
  assert.match(migration, /platform_metric_daily/);
  assert.match(migration, /UNIQUE INDEX `platform_metric_events_dedupe_idx`/);
});

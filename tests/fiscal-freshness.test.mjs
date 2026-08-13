import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  evaluateFiscalFreshness,
  FISCAL_SOURCE_SLA,
  minutesBetween,
  publicFreshnessLevel,
  summarizeDurations,
} from "../domain/fiscal-freshness.ts";

const now = new Date("2026-08-13T12:00:00.000Z");

test("SLA diferencia criticidade e rebaixa automaticamente fonte vencida", () => {
  assert.equal(FISCAL_SOURCE_SLA.critical.hours, 30);
  assert.equal(FISCAL_SOURCE_SLA.critical.warningHours, 22);
  assert.equal(FISCAL_SOURCE_SLA.high.hours, 42);
  assert.equal(FISCAL_SOURCE_SLA.high.warningHours, 30);
  assert.equal(FISCAL_SOURCE_SLA.standard.hours, 54);
  assert.equal(FISCAL_SOURCE_SLA.standard.warningHours, 40);

  const critical = evaluateFiscalFreshness({
    criticality: "critical", captureStatus: "checked", checkedAt: "2026-08-12T05:00:00.000Z", pendingChange: false, openIncident: false, now,
  });
  assert.equal(critical.status, "overdue");
  assert.equal(critical.coverageEffect, "not_supported");
  assert.match(critical.reason, /ultrapassou o SLA/);

  const standard = evaluateFiscalFreshness({
    criticality: "standard", captureStatus: "checked", checkedAt: "2026-08-11T05:00:00.000Z", pendingChange: false, openIncident: false, now,
  });
  assert.equal(standard.status, "overdue");
  assert.equal(standard.coverageEffect, "partial");
});

test("janela de atenÃ§Ã£o, incidente e mudanÃ§a pendente nunca ficam verdes", () => {
  const dueSoon = evaluateFiscalFreshness({
    criticality: "critical", captureStatus: "checked", checkedAt: "2026-08-12T13:00:00.000Z", pendingChange: false, openIncident: false, now,
  });
  assert.equal(dueSoon.status, "due_soon");
  assert.equal(dueSoon.coverageEffect, "partial");

  const incident = evaluateFiscalFreshness({
    criticality: "high", captureStatus: "checked", checkedAt: "2026-08-13T11:00:00.000Z", pendingChange: false, openIncident: true, now,
  });
  assert.equal(incident.status, "unavailable");
  assert.equal(incident.coverageEffect, "partial");

  const pending = evaluateFiscalFreshness({
    criticality: "standard", captureStatus: "checked", checkedAt: "2026-08-13T11:00:00.000Z", pendingChange: true, openIncident: false, now,
  });
  assert.equal(pending.status, "current");
  assert.equal(pending.coverageEffect, "partial");
  assert.match(pending.reason, /pendente/);

  const notChecked = evaluateFiscalFreshness({
    criticality: "critical", captureStatus: "not_checked", checkedAt: null, pendingChange: false, openIncident: false, now,
  });
  assert.equal(notChecked.status, "not_checked");
  assert.equal(notChecked.coverageEffect, "not_supported");
});

test("mÃ©tricas de resposta sÃ£o reprodutÃ­veis e o indicador pÃºblico nÃ£o mascara lacunas", () => {
  assert.deepEqual(summarizeDurations([5, 15, 20, 100]), { samples: 4, averageMinutes: 35, p95Minutes: 100, maximumMinutes: 100 });
  assert.deepEqual(summarizeDurations([]), { samples: 0, averageMinutes: null, p95Minutes: null, maximumMinutes: null });
  assert.equal(minutesBetween("2026-08-13T10:00:00.000Z", "2026-08-13T10:15:30.000Z"), 16);
  assert.equal(minutesBetween("2026-08-13T10:00:00.000Z", "2026-08-13T09:00:00.000Z"), null);
  assert.equal(publicFreshnessLevel({ current: 0, partial: 0, notSupported: 1 }), "degraded");
  assert.equal(publicFreshnessLevel({ current: 8, partial: 1, notSupported: 0 }), "attention");
  assert.equal(publicFreshnessLevel({ current: 8, partial: 0, notSupported: 0 }), "current");
  assert.equal(publicFreshnessLevel({ current: 0, partial: 0, notSupported: 0 }), "insufficient_evidence");
});

test("painel, fila de alertas, resumo diÃ¡rio e indicador pÃºblico sÃ£o persistidos e operacionais", async () => {
  const root = new URL("../", import.meta.url);
  const [service, migration, worker, panel, publicRoute, publicPage] = await Promise.all([
    readFile(new URL("app/fiscal-freshness-service.ts", root), "utf8"),
    readFile(new URL("drizzle/0050_fiscal_freshness.sql", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
    readFile(new URL("app/app/NationalCoverageCenter.tsx", root), "utf8"),
    readFile(new URL("app/api/public/fiscal-freshness/route.ts", root), "utf8"),
    readFile(new URL("app/cobertura/page.tsx", root), "utf8"),
  ]);
  for (const table of ["fiscal_freshness_observations", "fiscal_alert_deliveries", "fiscal_daily_summaries"]) {
    assert.match(migration, new RegExp("CREATE TABLE [`]" + table + "[`]"));
    assert.match(service, new RegExp(table));
  }
  assert.match(service, /ON CONFLICT\(day_key, source_code\)/);
  assert.match(service, /INSERT OR IGNORE INTO fiscal_alert_deliveries/);
  assert.match(service, /suppressed_unconfigured/);
  assert.match(service, /api\.resend\.com\/emails/);
  assert.match(service, /published_at/);
  assert.match(service, /blocked_at/);
  assert.match(service, /recertified_at/);
  assert.match(service, /Fonte fora do SLA rebaixa automaticamente/);
  assert.match(worker, /refreshFiscalFreshness/);
  assert.match(panel, /FRESCOR FISCAL/);
  assert.match(panel, /Tempos de resposta/);
  assert.match(panel, /Entregas de alerta, resumos e incidentes/);
  assert.match(publicRoute, /getPublicFiscalFreshness/);
  assert.match(publicPage, /PublicFiscalFreshnessIndicator/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("visitante usa o próprio app antes do cadastro sem alcançar dados privados", async () => {
  const [appPage, guest, preview, landing, legacy, css, worker] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/GuestCBSHubApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LandingFiscalPreview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/experimentar/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/guest-app.css", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
  ]);

  assert.match(appPage, /getCurrentUser/);
  assert.match(appPage, /if \(!user\)/);
  assert.match(appPage, /GuestCBSHubApp/);
  assert.doesNotMatch(appPage, /requireAppUser/);
  assert.match(guest, /className="app-shell guest-app-shell"/);
  assert.match(guest, /Já tenho conta/);
  assert.match(guest, /Criar acesso/);
  assert.match(guest, /operationLimit=\{3\}/);
  assert.match(guest, /cbshub-overview-completo-v2\.webm/);
  assert.match(guest, /Inteligência fiscal/);
  assert.match(guest, /Operações guiadas/);
  assert.match(guest, /Cobertura/);
  assert.match(guest, /Relatório/);
  assert.match(guest, /experiment_view/);
  assert.match(preview, /PUBLIC_OPERATION_STORAGE_KEY/);
  assert.match(landing, /user \? "\/app" : "\/app\?guest=1"/);
  assert.match(landing, /redirect\(`\/app\?guest=1&\$\{campaignParams\.toString\(\)\}`\)/);
  assert.match(legacy, /redirect\(guestHref\(attribution\)\)/);
  assert.match(css, /\.guest-topbar \.guest-create-account[\s\S]*color: #fff !important/);
  assert.match(worker, /public-fiscal-preview[\s\S]*limit: 30/);
});

test("funil do proprietário mede o app visitante sem armazenar perguntas", async () => {
  const [analytics, collector, ownerApi, ownerUi, definitions] = await Promise.all([
    readFile(new URL("../app/platform-analytics.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analytics/collect/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/metrics/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/app/OwnerMetricsCenter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../domain/platform-metrics.ts", import.meta.url), "utf8"),
  ]);
  for (const event of ["experiment_view", "experiment_start", "experiment_result", "experiment_gate", "experiment_signup_click"]) {
    assert.match(analytics, new RegExp(event));
    assert.match(collector, new RegExp(event));
    assert.match(ownerApi, new RegExp(event));
  }
  assert.match(ownerUi, /FUNIL DA EXPERIÊNCIA/);
  assert.match(definitions, /A pergunta fiscal não entra na telemetria/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("visitante usa o próprio app antes do cadastro sem alcançar dados privados", async () => {
  const [appPage, guest, intelligence, memory, publicApi, landing, legacy, css, worker] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/GuestCBSHubApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/FiscalIntelligence.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/GuestFiscalMemory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/public/fiscal-intelligence/route.ts", import.meta.url), "utf8"),
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
  assert.match(guest, />Entrar</);
  assert.match(guest, />Criar conta/);
  assert.match(guest, /operationLimit=\{2\}/);
  assert.match(guest, /FiscalIntelligence/);
  assert.match(guest, /CLIENTE ATIVO/);
  assert.match(guest, /Modo independente/);
  assert.match(guest, /Ano 2027 · premissa informada/);
  assert.match(guest, /EMPRESA EM ANÁLISE/);
  assert.match(guest, /GUEST_GUIDE_SEEN_KEY/);
  assert.match(guest, /guestGuideSteps/);
  assert.match(guest, /cbshub-overview-completo-v2\.webm/);
  assert.match(guest, /Inteligência fiscal/);
  assert.match(guest, /OPERAÇÕES GUIADAS/i);
  assert.match(guest, /Cobertura/);
  assert.match(guest, /Relatório/);
  assert.match(guest, /experiment_view/);
  assert.match(intelligence, /PUBLIC_INTELLIGENCE_STORAGE_KEY/);
  assert.match(intelligence, /cbshub_public_full_analyses_v2/);
  assert.match(intelligence, /api\/public\/fiscal-intelligence/);
  assert.match(intelligence, /GuestFiscalMemory/);
  assert.doesNotMatch(intelligence, /ANÁLISES LIVRES/);
  assert.match(memory, /Executar memória de cálculo/);
  assert.match(memory, /Salvar empresa, memória e fontes/);
  assert.match(publicApi, /parseFiscalOverrides/);
  assert.match(publicApi, /calculateFiscalMemory/);
  assert.match(publicApi, /X-Robots-Tag/);
  assert.match(landing, /user \? "\/app" : "\/app\?guest=1"/);
  assert.match(landing, /redirect\(`\/app\?guest=1&\$\{campaignParams\.toString\(\)\}`\)/);
  assert.match(legacy, /redirect\(guestHref\(attribution\)\)/);
  assert.match(css, /\.guest-topbar \.guest-create-account[\s\S]*color: #fff !important/);
  assert.match(worker, /public-fiscal-preview[\s\S]*limit: 30/);
  assert.match(worker, /public-fiscal-intelligence[\s\S]*limit: 18/);
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

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("tráfego pago entra em experiência pública isolada antes do cadastro", async () => {
  const [page, experience, preview, landing, policy, headers, worker] = await Promise.all([
    readFile(new URL("../app/experimentar/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/experimentar/PublicWorkspaceExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LandingFiscalPreview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../domain/seo-route-policy.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /PublicWorkspaceExperience/);
  assert.match(experience, /Ambiente de experimentação/);
  assert.match(experience, /operationLimit=\{2\}/);
  assert.match(page, /utm_source/);
  assert.match(experience, /Já tenho conta/);
  assert.match(experience, /Criar acesso/);
  assert.match(preview, /PUBLIC_OPERATION_STORAGE_KEY/);
  assert.match(preview, /experiment_signup_click/);
  assert.match(preview, /Sua pergunta continuará preenchida/);
  assert.match(landing, /user \? "\/app" : "\/experimentar"/);
  assert.match(landing, /campaignParams\.size > 0/);
  assert.match(landing, /redirect\(`\/experimentar\?\$\{campaignParams\.toString\(\)\}`\)/);
  assert.match(policy, /"\/experimentar"/);
  assert.match(headers, /\/experimentar[\s\S]*noindex, nofollow/);
  assert.match(worker, /public-fiscal-preview[\s\S]*limit: 30/);
});

test("painel do proprietário mede a experiência sem armazenar a pergunta", async () => {
  const [analytics, collector, ownerApi, ownerUi, definitions] = await Promise.all([
    readFile(new URL("../app/platform-analytics.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analytics/collect/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/metrics/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/app/OwnerMetricsCenter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../domain/platform-metrics.ts", import.meta.url), "utf8"),
  ]);
  for (const event of ["experiment_start", "experiment_result", "experiment_gate", "experiment_signup_click"]) {
    assert.match(analytics, new RegExp(event));
    assert.match(collector, new RegExp(event));
    assert.match(ownerApi, new RegExp(event));
  }
  assert.match(ownerUi, /FUNIL DA EXPERIÊNCIA/);
  assert.match(definitions, /A pergunta fiscal não entra na telemetria/);
});

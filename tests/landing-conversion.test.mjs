import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("landing liga dor, economia de tempo, funcionalidades reais e teste sem cartão", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /Pare de refazer a análise fiscal/);
  assert.match(page, /O trabalho não é só calcular/);
  assert.match(page, /Menos tempo remontando/);
  assert.match(page, /Auditar NF-e em lote/);
  assert.match(page, /Projetar IBS e CBS/);
  assert.match(page, /Mapear obrigações federais/);
  assert.match(page, /Acompanhar mudanças normativas/);
  assert.match(page, /5 dias/);
  assert.match(page, /Sem cartão/);
});

test("CTAs da landing registram posição sem sobrescrever a origem de aquisição", async () => {
  const [page, trackedCta] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LandingTrackedCta.tsx", import.meta.url), "utf8"),
  ]);

  for (const campaign of ["home_nav_trial", "home_hero_real_case", "home_time_saving_case", "home_final_real_case"]) {
    assert.match(page, new RegExp(campaign));
  }
  assert.match(trackedCta, /utm_source/);
  assert.match(trackedCta, /utm_medium/);
  assert.match(trackedCta, /referrerHost/);
  assert.match(trackedCta, /navigator\.sendBeacon/);
  assert.match(trackedCta, /campaign,/);
  assert.doesNotMatch(trackedCta, /source:\s*"google"/);
});

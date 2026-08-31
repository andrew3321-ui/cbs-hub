import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("landing principal assume a proposta de cybersecurity com dor e ação imediata", async () => {
  const [page, landing] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CybersecurityLanding.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /CBSHub Cybersecurity/);
  assert.match(page, /canonical: "\/"/);
  assert.match(page, /CybersecurityLanding/);
  assert.match(landing, /Encontre sua exposição/);
  assert.match(landing, /antes do atacante/);
  assert.match(landing, /Iniciar diagnóstico gratuito/);
  assert.match(landing, /100% passiva/);
  assert.match(landing, /Zero cadastro/);
});

test("experiência pública conecta diagnóstico, controles e CTA de interesse", async () => {
  const [landing, preview, endpoint, scanner, worker] = await Promise.all([
    readFile(new URL("../app/CybersecurityLanding.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CybersecurityPreview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/public/cybersecurity-preview/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/cybersecurity-scan-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
  ]);
  assert.match(landing, /CybersecurityPreview/);
  assert.match(landing, /Domínio e DNS/);
  assert.match(landing, /Proteção do e-mail/);
  assert.match(landing, /Segurança do site/);
  assert.match(preview, /cyber_preview_start/);
  assert.match(preview, /cyber_preview_result_/);
  assert.match(preview, /cyber_preview_signup/);
  assert.match(preview, /interest: "cybersecurity"/);
  assert.match(endpoint, /runPassiveSecurityScan/);
  assert.match(scanner, /calculateCyberPosture/);
  assert.match(scanner, /redirect: "manual"/);
  assert.match(worker, /public-cyber-preview/);
});

test("paleta visual usa base escura, ciano elétrico, violeta e verde-neon", async () => {
  const theme = await readFile(new URL("../app/cyberseguranca/cybersecurity-theme.css", import.meta.url), "utf8");
  assert.match(theme, /--cyber-paper: #070b18/);
  assert.match(theme, /--cyber-teal: #18d8ff/);
  assert.match(theme, /--cyber-violet: #7b61ff/);
  assert.match(theme, /--cyber-lime: #b8ff3d/);
  assert.match(theme, /@media \(max-width: 600px\)/);
  assert.match(theme, /@media \(prefers-reduced-motion: reduce\)/);
});

test("ativos fiscais anteriores permanecem no repositório durante a transição", async () => {
  const [showcase, video, generated] = await Promise.all([
    readFile(new URL("../app/LandingHeroShowcase.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LandingVideoShowcase.tsx", import.meta.url), "utf8"),
    import("../app/fiscal-showcase.generated.ts"),
  ]);
  assert.match(showcase, /fiscalShowcaseSummary\.deterministicCases/);
  assert.match(video, /cbshub-overview-completo-v2\.webm/);
  assert.ok(generated.fiscalShowcaseSummary.deterministicCases > 914);
  assert.ok(generated.fiscalShowcaseSummary.moduleCount >= 28);
});

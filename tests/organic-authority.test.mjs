import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { allowedAcquisitionMethods, buildTrackedShareUrl, citableAssets, normalizeExternalUrl, normalizeTargetPath, organicAuthorityPolicy, outreachTargets } from "../domain/organic-authority.ts";
import { publicIndexableRoutes } from "../domain/seo-route-policy.ts";

test("ativos citáveis são públicos, permanentes e rastreáveis", () => {
  assert.ok(citableAssets.length >= 5);
  assert.equal(new Set(citableAssets.map((asset) => asset.href)).size, citableAssets.length);
  for (const asset of citableAssets) {
    assert.match(asset.href, /^\/[a-z0-9/-]+$/);
    const tracked = new URL(buildTrackedShareUrl(asset.href, "authority_outreach", asset.category));
    assert.equal(tracked.origin, "https://cbshub.com.br");
    assert.equal(tracked.searchParams.get("utm_medium"), "referral");
    assert.equal(tracked.searchParams.get("utm_campaign"), "authority_outreach");
  }
  assert.ok(publicIndexableRoutes.some((route) => route.path === "/imprensa"));
});

test("mapa de distribuição não declara parceria e política rejeita atalhos de SEO", () => {
  assert.ok(outreachTargets.length >= 6);
  assert.ok(outreachTargets.every((target) => target.domain && target.rationale));
  assert.ok(organicAuthorityPolicy.prohibited.includes("compra de links"));
  assert.ok(organicAuthorityPolicy.prohibited.includes("redes privadas de links"));
  assert.ok(organicAuthorityPolicy.monthlyRoutine.length >= 6);
  assert.ok(allowedAcquisitionMethods.includes("citation"));
});

test("registro aceita somente evidência externa HTTPS e destinos internos limpos", () => {
  assert.equal(normalizeExternalUrl("http://example.com/citacao"), null);
  assert.equal(normalizeExternalUrl("https://cbshub.com.br/conteudos"), null);
  assert.equal(normalizeExternalUrl("javascript:alert(1)"), null);
  assert.equal(normalizeExternalUrl("https://portal.example.org/artigo")?.startsWith("https://portal.example.org/"), true);
  assert.equal(normalizeTargetPath("/conteudos?x=1"), "/conteudos");
  assert.equal(normalizeTargetPath("https://evil.example"), null);
});

test("API, migration e press kit preservam autorização e evidência verificável", async () => {
  const [route, migration, page] = await Promise.all([
    readFile(new URL("../app/api/admin/organic-authority/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0044_organic_authority_governance.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/imprensa/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /getPlatformAdminUser/);
  assert.match(route, /status: 403/);
  assert.match(route, /medium = 'referral'/);
  assert.match(route, /ON CONFLICT\(source_url\)/);
  assert.match(migration, /UNIQUE INDEX `organic_authority_links_source_idx`/);
  assert.match(migration, /organic_outreach_cycles/);
  assert.match(page, /supportofficial@cbshub\.com\.br/);
  assert.match(page, /não compra links/);
});

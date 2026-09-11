import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import robots from "../app/robots.ts";
import sitemap from "../app/sitemap.ts";
import {
  buildBreadcrumbStructuredData,
  buildHomeStructuredData,
  seoEligibilityPolicy,
  serializeStructuredData,
} from "../domain/seo-structured-data.ts";
import {
  privateIndexRoutePrefixes,
  publicIndexableRoutes,
  routeMustNotBeIndexed,
} from "../domain/seo-route-policy.ts";

test("robots libera conteúdo público, protege superfícies privadas e anuncia o sitemap", () => {
  const result = robots();
  assert.equal(result.sitemap, "https://cbshub.com.br/sitemap.xml");
  assert.equal(result.host, "https://cbshub.com.br");
  assert.equal(result.rules.userAgent, "*");
  assert.equal(result.rules.allow, "/");
  for (const path of privateIndexRoutePrefixes)
    assert.ok(result.rules.disallow.includes(path));
});

test("sitemap contém somente páginas públicas canônicas", () => {
  const entries = sitemap();
  assert.deepEqual(
    entries.map((entry) => entry.url),
    [
      "https://cbshub.com.br",
      "https://cbshub.com.br/produto",
      "https://cbshub.com.br/casos-de-uso",
      "https://cbshub.com.br/seguranca",
      "https://cbshub.com.br/precos",
      "https://cbshub.com.br/privacidade",
      "https://cbshub.com.br/termos",
      "https://cbshub.com.br/responsavel",
    ],
  );
  assert.equal(new Set(entries.map((entry) => entry.url)).size, entries.length);
  assert.ok(
    entries.every((entry) => entry.url.startsWith("https://cbshub.com.br")),
  );
});

test("inventário SEO mantém toda rota pública indexável no sitemap e toda superfície privada fora dele", () => {
  const sitemapPaths = sitemap().map((entry) => new URL(entry.url).pathname);
  assert.deepEqual(
    sitemapPaths,
    publicIndexableRoutes.map((route) => route.path),
  );
  for (const prefix of privateIndexRoutePrefixes) {
    assert.ok(!sitemapPaths.some((path) => path.startsWith(prefix)));
    assert.equal(routeMustNotBeIndexed(prefix), true);
  }
  assert.equal(routeMustNotBeIndexed("/planos"), false);
});

test("documentos públicos são agrupados pela Central de confiança", () => {
  for (const slug of ["privacidade", "termos", "responsavel"]) {
    const source = fs.readFileSync(new URL(`../app/${slug}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, /parent=\{\{ name: "Central de confiança", path: "\/seguranca" \}\}/);
  }
  const redirects = fs.readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(redirects, /source: "\/metodologia", destination: "\/seguranca#metodologia", permanent: true/);
});

test("grafo inicial declara entidades verificáveis sem inventar avaliação", () => {
  const result = buildHomeStructuredData();
  assert.equal(result["@context"], "https://schema.org");
  assert.deepEqual(
    result["@graph"].map((entry) => entry["@type"]),
    ["Organization", "WebSite", ["SoftwareApplication", "WebApplication"]],
  );
  const application = result["@graph"][2];
  assert.ok(!("offers" in application));
  assert.match(application.description, /Diagnóstico passivo/);
  assert.ok(!("aggregateRating" in application));
  assert.ok(!("review" in application));
  assert.doesNotMatch(JSON.stringify(result), /CPF|CNPJ|responsibleName/);
  assert.equal(
    seoEligibilityPolicy.softwareRichResult,
    "not_eligible_without_real_review_or_rating",
  );
  assert.equal(seoEligibilityPolicy.faqPage, "not_eligible_general_saas");
});

test("breadcrumbs têm posições, URLs absolutas e serialização segura", () => {
  const breadcrumb = buildBreadcrumbStructuredData([
    { name: "Início", path: "/" },
    { name: "Planos", path: "/planos" },
  ]);
  assert.equal(breadcrumb["@type"], "BreadcrumbList");
  assert.deepEqual(
    breadcrumb.itemListElement.map((item) => item.position),
    [1, 2],
  );
  assert.equal(
    breadcrumb.itemListElement[1].item,
    "https://cbshub.com.br/planos",
  );
  assert.equal(
    serializeStructuredData({ value: "</script>" }),
    '{"value":"\\u003c/script>"}',
  );
  assert.throws(() =>
    buildBreadcrumbStructuredData([{ name: "Início", path: "/" }]),
  );
});

test("páginas públicas internas recebem breadcrumb e metadados sociais próprios", () => {
  for (const slug of [
    "produto",
    "casos-de-uso",
    "seguranca",
    "precos",
    "privacidade",
    "termos",
    "responsavel",
  ]) {
    const source = fs.readFileSync(
      new URL(`../app/${slug}/page.tsx`, import.meta.url),
      "utf8",
    );
    assert.match(source, /PublicPageBreadcrumb/);
    assert.match(source, /openGraph:/);
    assert.match(source, /twitter:/);
  }
});

test("worker envia X-Robots-Tag nas áreas privadas além do bloqueio do robots.txt", () => {
  const worker = fs.readFileSync(
    new URL("../worker/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(worker, /routeMustNotBeIndexed\(pathname\)/);
  assert.match(worker, /X-Robots-Tag["'],\s*["']noindex, nofollow, noarchive/);
});

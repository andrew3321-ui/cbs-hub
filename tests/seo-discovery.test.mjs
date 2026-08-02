import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import robots from "../app/robots.ts";
import sitemap from "../app/sitemap.ts";
import { buildBreadcrumbStructuredData, buildHomeStructuredData, seoEligibilityPolicy, serializeStructuredData } from "../domain/seo-structured-data.ts";
import { privateIndexRoutePrefixes, publicIndexableRoutes, routeMustNotBeIndexed } from "../domain/seo-route-policy.ts";
import { taxContentTopics } from "../domain/tax-content.ts";

test("robots libera conteúdo público, protege superfícies privadas e anuncia o sitemap", () => {
  const result = robots();
  assert.equal(result.sitemap, "https://cbshub.com.br/sitemap.xml");
  assert.equal(result.host, "https://cbshub.com.br");
  assert.equal(result.rules.userAgent, "*");
  assert.equal(result.rules.allow, "/");
  for (const path of privateIndexRoutePrefixes) assert.ok(result.rules.disallow.includes(path));
});

test("sitemap contém somente páginas públicas canônicas", () => {
  const entries = sitemap();
  assert.deepEqual(entries.map((entry) => entry.url), [
    "https://cbshub.com.br",
    "https://cbshub.com.br/planos",
    "https://cbshub.com.br/metodologia",
    "https://cbshub.com.br/privacidade",
    "https://cbshub.com.br/termos",
    "https://cbshub.com.br/responsavel",
    "https://cbshub.com.br/calculadora-reforma-tributaria",
    "https://cbshub.com.br/cbs-ibs-contadores",
    "https://cbshub.com.br/icms-st-contadores",
    "https://cbshub.com.br/inteligencia-tributaria-escritorios",
    "https://cbshub.com.br/relatorios-fiscais-rastreaveis",
    "https://cbshub.com.br/conteudos",
    ...Object.values(taxContentTopics).map((topic) => `https://cbshub.com.br/conteudos/${topic.slug}`),
  ]);
  assert.equal(new Set(entries.map((entry) => entry.url)).size, entries.length);
  assert.ok(entries.every((entry) => entry.url.startsWith("https://cbshub.com.br")));
});

test("todas as URLs do sitemap declaram canonical correspondente", () => {
  const files = new Map([
    ["https://cbshub.com.br", "../app/page.tsx"],
    ["https://cbshub.com.br/planos", "../app/planos/page.tsx"],
    ["https://cbshub.com.br/metodologia", "../app/metodologia/page.tsx"],
    ["https://cbshub.com.br/privacidade", "../app/privacidade/page.tsx"],
    ["https://cbshub.com.br/termos", "../app/termos/page.tsx"],
    ["https://cbshub.com.br/responsavel", "../app/responsavel/page.tsx"],
    ["https://cbshub.com.br/calculadora-reforma-tributaria", "../app/calculadora-reforma-tributaria/page.tsx"],
    ["https://cbshub.com.br/cbs-ibs-contadores", "../app/cbs-ibs-contadores/page.tsx"],
    ["https://cbshub.com.br/icms-st-contadores", "../app/icms-st-contadores/page.tsx"],
    ["https://cbshub.com.br/inteligencia-tributaria-escritorios", "../app/inteligencia-tributaria-escritorios/page.tsx"],
    ["https://cbshub.com.br/relatorios-fiscais-rastreaveis", "../app/relatorios-fiscais-rastreaveis/page.tsx"],
    ["https://cbshub.com.br/conteudos", "../app/conteudos/page.tsx"],
  ]);
  for (const entry of sitemap()) {
    const pathname = new URL(entry.url).pathname;
    if (pathname.startsWith("/conteudos/")) {
      const source = fs.readFileSync(new URL("../app/conteudos/[slug]/page.tsx", import.meta.url), "utf8");
      assert.match(source, /taxContentMetadata\(topic\)/);
      continue;
    }
    const source = fs.readFileSync(new URL(files.get(entry.url), import.meta.url), "utf8");
    if (pathname.split("/").filter(Boolean).length === 1 && pathname !== "/planos" && pathname !== "/metodologia" && pathname !== "/privacidade" && pathname !== "/termos" && pathname !== "/responsavel" && pathname !== "/conteudos") {
      assert.match(source, /seoIntentMetadata\(page\)/);
    } else {
      assert.match(source, new RegExp(`canonical:\\s*["']${pathname.replace("/", "\\/")}["']`));
    }
  }
});

test("inventário SEO mantém toda rota pública indexável no sitemap e toda superfície privada fora dele", () => {
  const sitemapPaths = sitemap().map((entry) => new URL(entry.url).pathname);
  assert.deepEqual(sitemapPaths, publicIndexableRoutes.map((route) => route.path));
  for (const prefix of privateIndexRoutePrefixes) {
    assert.ok(!sitemapPaths.some((path) => path.startsWith(prefix)));
    assert.equal(routeMustNotBeIndexed(prefix), true);
  }
  assert.equal(routeMustNotBeIndexed("/planos"), false);
});

test("grafo inicial declara entidades verificáveis sem inventar avaliação", () => {
  const result = buildHomeStructuredData();
  assert.equal(result["@context"], "https://schema.org");
  assert.deepEqual(result["@graph"].map((entry) => entry["@type"]), ["Organization", "WebSite", ["SoftwareApplication", "WebApplication"]]);
  const application = result["@graph"][2];
  assert.equal(application.offers.price, "450.00");
  assert.equal(application.offers.priceCurrency, "BRL");
  assert.ok(!("aggregateRating" in application));
  assert.ok(!("review" in application));
  assert.doesNotMatch(JSON.stringify(result), /CPF|CNPJ|responsibleName/);
  assert.equal(seoEligibilityPolicy.softwareRichResult, "not_eligible_without_real_review_or_rating");
  assert.equal(seoEligibilityPolicy.faqPage, "not_eligible_general_saas");
});

test("breadcrumbs têm posições, URLs absolutas e serialização segura", () => {
  const breadcrumb = buildBreadcrumbStructuredData([{ name: "Início", path: "/" }, { name: "Planos", path: "/planos" }]);
  assert.equal(breadcrumb["@type"], "BreadcrumbList");
  assert.deepEqual(breadcrumb.itemListElement.map((item) => item.position), [1, 2]);
  assert.equal(breadcrumb.itemListElement[1].item, "https://cbshub.com.br/planos");
  assert.equal(serializeStructuredData({ value: "</script>" }), '{"value":"\\u003c/script>"}');
  assert.throws(() => buildBreadcrumbStructuredData([{ name: "Início", path: "/" }]));
});

test("páginas públicas internas recebem breadcrumb e metadados sociais próprios", () => {
  for (const slug of ["planos", "metodologia", "privacidade", "termos", "responsavel"]) {
    const source = fs.readFileSync(new URL(`../app/${slug}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, /PublicPageBreadcrumb/);
    assert.match(source, /openGraph:/);
    assert.match(source, /twitter:/);
  }
});

test("worker envia X-Robots-Tag nas áreas privadas além do bloqueio do robots.txt", () => {
  const worker = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(worker, /routeMustNotBeIndexed\(pathname\)/);
  assert.match(worker, /X-Robots-Tag["'],\s*["']noindex, nofollow, noarchive/);
});

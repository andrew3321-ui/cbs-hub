import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import sitemap from "../app/sitemap.ts";
import { seoIntentPages } from "../domain/seo-intent-pages.ts";
import { buildSeoIntentPageStructuredData } from "../domain/seo-structured-data.ts";

const pages = Object.values(seoIntentPages);

test("cinco páginas atendem intenções distintas com conteúdo substancial", () => {
  assert.equal(pages.length, 5);
  for (const key of ["slug", "campaign", "title", "description", "headline", "primaryKeyword", "intent"]) {
    assert.equal(new Set(pages.map((page) => page[key])).size, pages.length, `${key} precisa ser único`);
  }
  for (const page of pages) {
    assert.ok(page.description.length >= 100);
    assert.equal(page.benefits.length, 3);
    assert.equal(page.workflow.length, 3);
    assert.equal(page.faqs.length, 3);
    assert.ok(page.facts.length >= 4);
    assert.ok(page.sources.length >= 2);
  }
});

test("cada landing possui wrapper indexável, canonical derivado e presença no sitemap", () => {
  const urls = new Set(sitemap().map((entry) => entry.url));
  for (const page of pages) {
    const source = fs.readFileSync(new URL(`../app/${page.slug}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`seoIntentPages\\["${page.slug}"\\]`));
    assert.match(source, /seoIntentMetadata\(page\)/);
    assert.ok(urls.has(`https://cbshub.com.br/${page.slug}`));
  }
});

test("schema das landings descreve página e software sem fabricar FAQ ou avaliação", () => {
  for (const page of pages) {
    const schema = buildSeoIntentPageStructuredData({ path: `/${page.slug}`, title: page.title, description: page.description, keywords: [page.primaryKeyword, ...page.relatedKeywords] });
    assert.equal(schema["@type"], "WebPage");
    assert.equal(schema.url, `https://cbshub.com.br/${page.slug}`);
    assert.equal(schema.about["@id"], "https://cbshub.com.br/#software");
    assert.doesNotMatch(JSON.stringify(schema), /FAQPage|aggregateRating|review/);
  }
});

test("FAQ, prova real, CTA rastreável e links internos pertencem ao componente público", () => {
  const component = fs.readFileSync(new URL("../app/SeoIntentLanding.tsx", import.meta.url), "utf8");
  const tracked = fs.readFileSync(new URL("../app/SeoTrackedCta.tsx", import.meta.url), "utf8");
  const collector = fs.readFileSync(new URL("../app/api/analytics/collect/route.ts", import.meta.url), "utf8");
  assert.match(component, /page\.faqs\.map/);
  assert.match(component, /page\.facts\.map/);
  assert.match(component, /utm_source=google&medium=organic|utm_source=google/);
  assert.match(component, /Soluções relacionadas/);
  assert.match(tracked, /eventType: "seo_cta"/);
  assert.match(tracked, /sendBeacon/);
  assert.match(collector, /body\.eventType === "seo_cta"/);
});

test("fontes são HTTPS e CTA não altera uma conclusão fiscal", () => {
  for (const page of pages) {
    assert.ok(page.sources.every((source) => source.url.startsWith("https://")));
  }
  const tracked = fs.readFileSync(new URL("../app/SeoTrackedCta.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(tracked, /tax|fiscalRules|calculation|coverage/i);
});

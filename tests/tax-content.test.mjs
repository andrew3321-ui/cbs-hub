import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import sitemap from "../app/sitemap.ts";
import { buildTaxContentArticleStructuredData, buildTaxContentCollectionStructuredData } from "../domain/seo-structured-data.ts";
import { evaluateTaxContentFreshness, taxContentAuthor, taxContentTaxonomy, taxContentTopics, validateTaxContentCatalog } from "../domain/tax-content.ts";

const topics = Object.values(taxContentTopics);

test("hub editorial cobre os sete pilares com taxonomia e conteúdo substancial", () => {
  assert.deepEqual(topics.map((topic) => topic.tax), ["Reforma Tributária", "ICMS/ST", "ISS", "Simples Nacional", "PIS/Cofins", "Retenções", "IPI/TIPI"]);
  assert.equal(taxContentTaxonomy.length, 7);
  assert.deepEqual(validateTaxContentCatalog(), { passed: true, errors: [], topics: 7, sources: 18 });
  assert.equal(taxContentAuthor.type, "Organization");
  for (const topic of topics) {
    assert.ok(topic.summary.length >= 250, `${topic.slug}: resumo raso`);
    assert.equal(topic.keyFacts.length, 4);
    assert.equal(topic.decisionPath.length, 4);
    assert.ok(topic.example.facts.length >= 4);
    assert.ok(topic.sources.length >= 2);
    assert.ok(topic.limits.length >= 3);
    assert.ok(topic.history.length >= 1);
  }
});

test("frescor rebaixa automaticamente referência vencida sem apagar histórico", () => {
  const topic = topics[0];
  assert.equal(evaluateTaxContentFreshness(topic, topic.reviewedAt).canPresentAsCurrent, true);
  const due = evaluateTaxContentFreshness(topic, "2026-08-10");
  assert.equal(due.freshness, "review_due");
  assert.equal(due.operationalStatus, "revisão próxima");
  const stale = evaluateTaxContentFreshness(topic, "2026-08-17");
  assert.equal(stale.freshness, "stale");
  assert.equal(stale.canPresentAsCurrent, false);
  assert.equal(stale.operationalStatus, "referência suspensa");
});

test("hub e guias estão no sitemap com data editorial própria", () => {
  const entries = new Map(sitemap().map((entry) => [new URL(entry.url).pathname, entry]));
  assert.ok(entries.has("/conteudos"));
  for (const topic of topics) {
    const entry = entries.get(`/conteudos/${topic.slug}`);
    assert.ok(entry);
    assert.equal(new Date(entry.lastModified).toISOString().slice(0, 10), topic.reviewedAt);
  }
});

test("schema editorial declara TechArticle, fontes e autoria institucional sem avaliação fabricada", () => {
  for (const topic of topics) {
    const schema = buildTaxContentArticleStructuredData({ path: `/conteudos/${topic.slug}`, title: topic.title, description: topic.description, tax: topic.tax, reviewedAt: topic.reviewedAt, version: topic.version, sourceUrls: topic.sources.map((source) => source.url) });
    assert.equal(schema["@type"], "TechArticle");
    assert.equal(schema.author["@type"], "Organization");
    assert.equal(schema.citation.length, topic.sources.length);
    assert.doesNotMatch(JSON.stringify(schema), /aggregateRating|review/);
  }
  const collection = buildTaxContentCollectionStructuredData(topics.map((topic) => ({ path: `/conteudos/${topic.slug}`, title: topic.title })));
  assert.equal(collection["@type"], "CollectionPage");
  assert.equal(collection.mainEntity.itemListElement.length, 7);
});

test("componente público mostra fonte, vigência, histórico, limites e suspensão de frescor", () => {
  const guide = fs.readFileSync(new URL("../app/TaxContentGuide.tsx", import.meta.url), "utf8");
  const hub = fs.readFileSync(new URL("../app/conteudos/page.tsx", import.meta.url), "utf8");
  assert.match(guide, /FONTES PRIMÁRIAS/);
  assert.match(guide, /Vigência de referência/);
  assert.match(guide, /HISTÓRICO DE ALTERAÇÕES/);
  assert.match(guide, /LIMITES EXPLÍCITOS/);
  assert.match(guide, /Conteúdo rebaixado automaticamente/);
  assert.match(guide, /não representa homologação profissional individual/);
  assert.match(hub, /Nenhuma página permanece “atual” por inércia/);
});

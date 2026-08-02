import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import robots from "../app/robots.ts";
import sitemap from "../app/sitemap.ts";

test("robots libera conteúdo público, protege superfícies privadas e anuncia o sitemap", () => {
  const result = robots();
  assert.equal(result.sitemap, "https://cbshub.com.br/sitemap.xml");
  assert.equal(result.host, "https://cbshub.com.br");
  assert.equal(result.rules.userAgent, "*");
  assert.equal(result.rules.allow, "/");
  for (const path of ["/api/", "/app", "/dossie/", "/relatorio/"]) {
    assert.ok(result.rules.disallow.includes(path));
  }
});

test("sitemap contém somente páginas públicas canônicas", () => {
  const entries = sitemap();
  assert.deepEqual(entries.map((entry) => entry.url), [
    "https://cbshub.com.br",
    "https://cbshub.com.br/planos",
    "https://cbshub.com.br/metodologia",
    "https://cbshub.com.br/privacidade",
    "https://cbshub.com.br/termos",
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
  ]);
  for (const entry of sitemap()) {
    const pathname = new URL(entry.url).pathname;
    const source = fs.readFileSync(new URL(files.get(entry.url), import.meta.url), "utf8");
    assert.match(source, new RegExp(`canonical:\\s*[\"']${pathname.replace("/", "\\/")}[\"']`));
  }
});

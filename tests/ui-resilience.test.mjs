import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("the app shell and dense fiscal surfaces expose responsive layout contracts", () => {
  const globalCss = read("../app/globals.css");
  const coverageCss = read("../app/national-coverage.css");
  const reportCss = read("../app/globals.css");
  assert.match(globalCss, /\.sidebar\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(globalCss, /\.table-wrap\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(globalCss, /@media \(max-width: 1100px\)/);
  assert.match(globalCss, /@media \(max-width: 720px\)/);
  assert.match(globalCss, /text-size-adjust:\s*100%/);
  assert.match(coverageCss, /@media\s*\(max-width:1100px\)|@media\s*\(max-width:\s*1100px\)/);
  assert.match(reportCss, /@media print/);
});

test("the landing showcase stays inside mobile viewports and hides the public indicator shortcut", () => {
  const landingCss = read("../app/cbshub-landing.css");
  const landing = read("../app/page.tsx");
  assert.match(landingCss, /@media \(max-width: 720px\)[\s\S]*\.cbs-showcase-video-shell\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;/);
  assert.match(landingCss, /@media \(max-width: 720px\)[\s\S]*\.cbs-showcase-video-shell video\s*\{\s*object-fit:\s*contain;/);
  assert.doesNotMatch(landing, /Consultar indicador público|href="\/api\/public\/coverage"/);
});

test("minimum readability, visible focus and native keyboard controls are preserved", () => {
  const css = read("../app/globals.css");
  const shell = read("../app/app/CBSHubApp.tsx");
  assert.match(css, /button:focus-visible/);
  assert.match(css, /\.app-shell \.page-content p\s*\{[^}]*font-size:\s*max\(13px/s);
  assert.match(css, /\.app-shell \.page-content :where\(input, select, textarea\)\s*\{[^}]*font-size:\s*max\(14px/s);
  assert.match(css, /\.auth-card form > label[^}]*font-size:\s*13px/s);
  assert.match(css, /\.auth-submit[^}]*font-size:\s*14px/s);
  assert.match(shell, /<nav[^>]*aria-label="Navegação principal"/);
  assert.match(shell, /<button[^>]*onClick=/);
});

test("critical data surfaces expose loading, empty, error and retry states", () => {
  const shell = read("../app/app/CBSHubApp.tsx");
  const coverage = read("../app/app/NationalCoverageCenter.tsx");
  const intelligence = read("../app/app/FiscalIntelligence.tsx");
  assert.match(shell, /rules-loading/);
  assert.match(shell, /empty-state/);
  assert.match(shell, /retry-toast/);
  assert.match(shell, />Tentar novamente</);
  assert.match(coverage, /coverage-load-failure/);
  assert.match(coverage, /loadCoverage\(\)/);
  assert.match(coverage, /aria-live="polite"/);
  assert.match(intelligence, /catalogRetry/);
  assert.match(intelligence, /onClick=\{retry\}/);
});

test("fiscal search invalidates stale questions and aborts obsolete requests", () => {
  const intelligence = read("../app/app/FiscalIntelligence.tsx");
  assert.match(intelligence, /searchSequence/);
  assert.match(intelligence, /AbortController/);
  assert.match(intelligence, /searchController\.current\?\.abort\(\)/);
  assert.match(intelligence, /signal:\s*controller\.signal/);
  assert.match(intelligence, /setResult\(null\)/);
  assert.match(intelligence, /cache:\s*"no-store"/);
});

test("coverage failures cannot become a permanent blank or loading screen", () => {
  const coverage = read("../app/app/NationalCoverageCenter.tsx");
  const routeError = read("../app/app/error.tsx");
  const boundary = read("../app/app/ClientErrorBoundary.tsx");
  assert.match(coverage, /Promise\.allSettled/);
  assert.match(coverage, /if \(!coverage && loadError\)/);
  assert.match(routeError, /reset/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /Recarregar plataforma/);
});

test("blocked fiscal actions explain requirements instead of failing silently", () => {
  const coverage = read("../app/app/NationalCoverageCenter.tsx");
  assert.match(coverage, /title=\{!autoPartsDate/);
  assert.match(coverage, /Informe data, condição comercial, valor e base própria/);
  assert.match(coverage, /Leia e aceite a declaração de responsabilidade/);
  assert.match(coverage, /Selecione ao menos um XML ou TXT/);
});

test("browser failures are monitored as structured events with release metadata", () => {
  const boundary = read("../app/app/ClientErrorBoundary.tsx");
  const endpoint = read("../app/api/client-errors/route.ts");
  const page = read("../app/app/page.tsx");
  assert.match(boundary, /unhandledrejection/);
  assert.match(boundary, /sendBeacon/);
  assert.match(endpoint, /event:\s*"ui\.error"/);
  assert.match(endpoint, /CF_VERSION_METADATA/);
  assert.match(endpoint, /releaseId/);
  assert.match(page, /ClientErrorBoundary/);
});

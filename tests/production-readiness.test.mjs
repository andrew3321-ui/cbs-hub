import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { publicAppOrigin, publicAppUrl } from "../app/public-url.ts";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("public URLs prefer a valid canonical origin and fall back to the request", () => {
  const request = new Request("https://preview.example.net/api/test");
  assert.equal(publicAppOrigin(request, "https://cbshub.com.br"), "https://cbshub.com.br");
  assert.equal(publicAppUrl("/planos?retorno=ok", request, "https://cbshub.com.br"), "https://cbshub.com.br/planos?retorno=ok");
  assert.equal(publicAppOrigin(request, "javascript:alert(1)"), "https://preview.example.net");
  assert.equal(publicAppOrigin(request, "https://cbshub.com.br/path"), "https://preview.example.net");
  assert.throws(() => publicAppUrl("relative", request, "https://cbshub.com.br"), /public_path_must_be_absolute/);
});

test("all externally emitted links use the canonical URL helper", () => {
  for (const path of [
    "../app/api/billing/checkout/route.ts",
    "../app/api/admin/billing/route.ts",
  ]) {
    const source = read(path);
    assert.match(source, /PUBLIC_APP_URL/);
    assert.match(source, /publicApp(?:Url|Origin)/);
  }
});

test("quality gate and Workers Builds block publishing before checks and migrations", () => {
  const workflow = read("../.github/workflows/security-and-backup.yml");
  const build = read("../scripts/workers-build.mjs");
  const deploy = read("../scripts/workers-deploy.mjs");
  for (const command of ["security:secrets", "lint", "migrations:verify", "test"]) {
    assert.match(workflow, new RegExp(command.replace(":", "\\:")));
  }
  assert.match(build, /branch !== "main"/);
  assert.match(build, /"test:unit"/);
  assert.match(build, /"build"/);
  assert.match(deploy, /d1", "migrations", "apply"/);
  assert.match(deploy, /finalize-workers-config\.mjs/);
  assert.match(deploy, /"deploy", "--config", "dist\/server\/wrangler\.json"/);
  assert.match(deploy, /post-deploy-smoke\.mjs/);
  assert.match(deploy, /currentVersionId/);
  assert.match(deploy, /Automatic rollback after post-deploy smoke failure/);
  assert.match(deploy, /ls-remote/);
  assert.match(deploy, /Publicação obsoleta bloqueada/);
  assert.match(deploy, /SMOKE_PREVIOUS_RELEASE_ID/);
});

test("published Workers never replay legacy schema DDL during requests", () => {
  const database = read("../db/index.ts");
  assert.match(database, /versioned D1 migrations/);
  assert.doesNotMatch(database, /CREATE TABLE|INSERT INTO|ALTER TABLE/);
});

test("release metadata, structured alerts and smoke coverage are declared", () => {
  const worker = read("../worker/index.ts");
  const health = read("../app/api/health/route.ts");
  const vite = read("../vite.config.ts");
  const smoke = read("../scripts/post-deploy-smoke.mjs");
  assert.match(worker, /CF_VERSION_METADATA/);
  assert.match(worker, /edge\.alert\.error/);
  assert.match(worker, /edge\.alert\.latency/);
  assert.match(worker, /X-CBSHub-Version/);
  assert.match(health, /release:/);
  assert.match(health, /securityRunner/);
  assert.match(vite, /version_metadata/);
  assert.match(smoke, /waitForPublishedRelease/);
  assert.match(smoke, /SMOKE_RELEASE_ATTEMPTS/);
  assert.match(smoke, /requestUntilStatus/);
  assert.match(smoke, /SMOKE_SURFACE_ATTEMPTS/);
  assert.match(smoke, /landing-page/);
  assert.match(smoke, /releaseChanged/);
  assert.match(smoke, /checks\?\.securityRunner === "up"/);
  for (const surface of ["/api/auth/login", "/api/security-agent", "/api/billing"]) {
    assert.match(smoke, new RegExp(surface.replaceAll("/", "\\/")));
  }
});

test("runbooks document environment separation, strict smoke and recovery evidence", () => {
  const production = read("../docs/operations/cloudflare-production.md");
  const rollback = read("../docs/operations/rollback-runbook.md");
  assert.match(production, /Build command: npm run ci:build/);
  assert.match(production, /Deploy command: npm run ci:deploy/);
  assert.match(production, /SMOKE_STRICT=1/);
  assert.match(production, /Nenhum valor secreto/);
  assert.match(rollback, /versão anterior conhecida/);
  assert.match(rollback, /D1_RESTORE_CONFIRM=RESTORE_DEDICATED_TEST_DATABASE/);
  assert.match(rollback, /backup-test-log\.md/);
});

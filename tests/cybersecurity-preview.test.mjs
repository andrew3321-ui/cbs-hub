import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  calculateCyberPosture,
  containsDnsPolicy,
  isPrivateOrReservedAddress,
  normalizePublicDomain,
} from "../domain/cybersecurity-preview.ts";
import { websiteChecksFromResponse } from "../app/cybersecurity-scan-service.ts";

test("normalizes public domains without retaining paths or protocols", () => {
  assert.equal(normalizePublicDomain(" HTTPS://WWW.Example.com.br/area?q=1 "), "www.example.com.br");
  assert.equal(normalizePublicDomain("empresa.com.br"), "empresa.com.br");
});

test("rejects local destinations, IP literals and malformed hostnames", () => {
  for (const value of ["localhost", "painel.local", "10.0.0.1", "[::1]", "dominio", "-invalido.com"]) {
    assert.throws(() => normalizePublicDomain(value));
  }
});

test("detects private and reserved addresses used by SSRF defenses", () => {
  for (const value of ["127.0.0.1", "10.10.0.2", "172.16.1.2", "192.168.1.2", "169.254.1.1", "::1", "fd00::1", "2001:db8::1"]) {
    assert.equal(isPrivateOrReservedAddress(value), true, value);
  }
  for (const value of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) {
    assert.equal(isPrivateOrReservedAddress(value), false, value);
  }
});

test("recognizes SPF and DMARC policies case-insensitively", () => {
  assert.equal(containsDnsPolicy(["v=spf1 include:_spf.example.com -all"], "spf"), true);
  assert.equal(containsDnsPolicy(["V=DMARC1; p=reject"], "dmarc"), true);
  assert.equal(containsDnsPolicy(["google-site-verification=abc"], "spf"), false);
});

test("posture score rewards protection and exposes missing high-weight controls", () => {
  const base = (status, weight = 10) => ({ code: status, category: "website", title: status, detail: "", action: "", status, weight });
  const strong = calculateCyberPosture([base("pass"), base("pass")]);
  assert.deepEqual({ score: strong.score, level: strong.level }, { score: 100, level: "strong" });
  const exposed = calculateCyberPosture([base("risk", 20), base("pass", 5)]);
  assert.equal(exposed.level, "exposed");
  assert.equal(exposed.riskCount, 1);
});

test("public scanner remains passive, bounded and rate limited", () => {
  const route = fs.readFileSync(new URL("../app/api/public/cybersecurity-preview/route.ts", import.meta.url), "utf8");
  const scanner = fs.readFileSync(new URL("../app/cybersecurity-scan-service.ts", import.meta.url), "utf8");
  const worker = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(scanner, /redirect: "manual"/);
  assert.match(scanner, /publicAddresses\(next\.hostname\)/);
  assert.match(scanner, /AbortSignal\.timeout/);
  assert.doesNotMatch(route, /env\.DB|INSERT INTO|db\.insert/);
  assert.match(worker, /public-cyber-preview/);
  assert.match(worker, /cybersecurity-preview"\) return 4 \* 1024/);
});

test("server errors make website controls inconclusive instead of producing false findings", () => {
  const checks = websiteChecksFromResponse(new Response(null, { status: 522 }), new URL("https://example.com/"));
  assert.deepEqual(checks.map(({ code, status }) => [code, status]), [
    ["https", "unavailable"],
    ["hsts", "unavailable"],
    ["csp", "unavailable"],
    ["browser-headers", "unavailable"],
  ]);
  assert.match(checks[0].detail, /HTTP 522/);
  assert.equal(checks.some((check) => /ausente|não localizada/i.test(check.title)), false);
});

test("successful HTTPS responses still evaluate the actual security headers", () => {
  const response = new Response(null, {
    status: 200,
    headers: {
      "Strict-Transport-Security": "max-age=31536000",
      "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=()",
    },
  });
  const checks = websiteChecksFromResponse(response, new URL("https://example.com/"));
  assert.deepEqual(checks.map(({ code, status }) => [code, status]), [
    ["https", "pass"],
    ["hsts", "pass"],
    ["csp", "pass"],
    ["browser-headers", "pass"],
  ]);
});

test("cybersecurity is the canonical home and its legacy path is a noindex alias", () => {
  const policy = fs.readFileSync(new URL("../domain/seo-route-policy.ts", import.meta.url), "utf8");
  const home = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const landing = fs.readFileSync(new URL("../app/CybersecurityLanding.tsx", import.meta.url), "utf8");
  const page = fs.readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.doesNotMatch(policy, /path: "\/cyberseguranca"/);
  assert.match(home, /canonical: "\/"/);
  assert.match(home, /CybersecurityLanding/);
  assert.match(page, /source: "\/cyberseguranca", destination: "\/", permanent: true/);
  assert.match(landing, /não executa testes invasivos/i);
});

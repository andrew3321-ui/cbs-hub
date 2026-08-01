import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  connectorForSource,
  inspectOfficialArtifact,
  officialConnectorContracts,
  validateOfficialConnectorContracts,
} from "../domain/official-source-connectors.ts";
import { governedNormativeSources } from "../domain/normative-governance.ts";
import { captureNormativeSource } from "../app/normative-governance-service.ts";

const fixtureRoot = new URL("fixtures/official-connectors/", import.meta.url);
const cases = [
  ["NFE-PORTAL", "nfe", "https://www.nfe.fazenda.gov.br/portal/informe.aspx", "nfe.html"],
  ["RTC-CALCULATOR", "rtc", "https://www.gov.br/receitafederal/rtc", "rtc.html"],
  ["CONFAZ", "confaz", "https://www.confaz.fazenda.gov.br/legislacao", "confaz.html"],
  ["RFB-NEWS", "rfb", "https://www.gov.br/receitafederal/normas", "rfb.html"],
  ["DOU-FISCAL", "dou", "https://www.in.gov.br/consulta/-/buscar/dou", "dou.html"],
];

test("cinco conectores oficiais possuem contratos completos e limites conservadores", () => {
  const validation = validateOfficialConnectorContracts();
  assert.equal(validation.passed, true, validation.errors.join("\n"));
  assert.equal(validation.connectors, 5);
  assert.equal(validation.sourceCodes, 5);
  assert.deepEqual(officialConnectorContracts.map((item) => item.id), ["nfe", "rtc", "confaz", "rfb", "dou"]);
  for (const contract of officialConnectorContracts) {
    assert.ok(contract.maxAttempts <= 2);
    assert.ok(contract.maxBytes <= 750_000);
    assert.ok(contract.officialHosts.length > 0);
  }
});

test("fixtures offline extraem versão e publicação sem inferir fórmula jurídica", async () => {
  for (const [sourceCode, connectorId, url, fixture] of cases) {
    const bodyText = await readFile(new URL(fixture, fixtureRoot), "utf8");
    const result = inspectOfficialArtifact({ sourceCode, finalUrl: url, contentType: "text/html; charset=utf-8", bodyText });
    assert.equal(result.connectorId, connectorId);
    assert.equal(result.parseStatus, "parsed", `${sourceCode}: ${result.contractErrors.join(",")}`);
    assert.ok(result.detectedVersion);
    assert.match(result.publishedAt, /^2026-07-/);
    if (sourceCode === "NFE-PORTAL") assert.equal(result.effectiveFrom, "2027-01-01");
    else assert.equal(result.effectiveFrom, null);
    assert.equal(result.promotionStatus, "metadata_review");
  }
});

test("mudança de origem ou formato bloqueia promoção e abre erro de contrato", () => {
  const result = inspectOfficialArtifact({ sourceCode: "CONFAZ", finalUrl: "https://example.com/legislacao", contentType: "application/octet-stream", bodyText: "Convênio ICMS 1/2026" });
  assert.equal(result.parseStatus, "contract_blocked");
  assert.equal(result.promotionStatus, "blocked_contract");
  assert.ok(result.contractErrors.some((item) => item.startsWith("unexpected_official_host")));
  assert.ok(result.contractErrors.some((item) => item.startsWith("unexpected_content_type")));
});

test("captura envia validadores HTTP e reaproveita o snapshot em 304", async () => {
  const source = governedNormativeSources.find((item) => item.code === "NFE-PORTAL");
  assert.ok(source);
  let headers;
  const capture = await captureNormativeSource(source, async (_url, init) => {
    headers = new Headers(init?.headers);
    return new Response(null, { status: 304, headers: { etag: '"nfe-v2"' } });
  }, {
    id: "previous", capture_status: "checked", content_hash: "a".repeat(64), normalized_content_hash: "b".repeat(64), final_url: source.url,
    etag: '"nfe-v1"', last_modified: "Wed, 29 Jul 2026 12:00:00 GMT", connector_id: "nfe", artifact_kind: "technical_release",
    parser_version: "nfe-index.v1", parse_status: "parsed", detected_version: "2025.002 v1.31", published_at: "2026-07-31",
    detected_effective_from: null, promotion_status: "metadata_review", contract_errors_json: "[]",
  });
  assert.equal(headers.get("if-none-match"), '"nfe-v1"');
  assert.equal(headers.get("if-modified-since"), "Wed, 29 Jul 2026 12:00:00 GMT");
  assert.equal(capture.status, "checked");
  assert.equal(capture.notModified, true);
  assert.equal(capture.bytesHashed, 0);
  assert.equal(capture.contentHash, "a".repeat(64));
  assert.equal(capture.inspection.detectedVersion, "2025.002 v1.31");
});

test("catálogo monitorado contém os cinco conectores prioritários", () => {
  for (const [sourceCode] of cases) {
    assert.ok(governedNormativeSources.some((source) => source.code === sourceCode), sourceCode);
    assert.ok(connectorForSource(sourceCode), sourceCode);
  }
});

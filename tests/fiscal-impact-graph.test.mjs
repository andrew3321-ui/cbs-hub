import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assessReexecutionClaim,
  buildFiscalImpactGraph,
  classifyFiscalArtifactImpact,
  compareFiscalCentSnapshots,
  extractFiscalCentLedger,
} from "../domain/fiscal-impact-graph.ts";
import { inferFiscalCompetence } from "../app/fiscal-impact-graph-service.ts";

const pendingDossier = {
  type: "dossier",
  id: "dossier-pending",
  workspaceId: 3,
  companyId: 7,
  competence: "2026-08",
  status: "ready_for_review",
  contentHash: "a".repeat(64),
  snapshot: { calculation: { taxCents: 1_000 } },
  immutable: false,
};

const approvedDossier = {
  ...pendingDossier,
  id: "dossier-approved",
  status: "approved",
  contentHash: "b".repeat(64),
  immutable: true,
};

test("grafo liga fonte, regras, motores, dossiê e relatório sem perder carteira ou competência", () => {
  const report = { type: "report", id: "dossier-share:9", workspaceId: 3, companyId: 7, competence: "2026-08", status: "delivered", contentHash: approvedDossier.contentHash, snapshot: null, immutable: true, parentId: approvedDossier.id, parentType: "dossier" };
  const graph = buildFiscalImpactGraph({ sourceCode: "CONFAZ", ruleCodes: ["RULE-A", "RULE-B"], engineCodes: ["ENGINE-A"], artifacts: [pendingDossier, approvedDossier, report] });
  assert.ok(graph.nodes.some((node) => node.type === "normative_source" && node.externalId === "CONFAZ"));
  assert.equal(graph.nodes.filter((node) => node.type === "rule").length, 2);
  assert.ok(graph.edges.some((edge) => edge.relation === "defines"));
  assert.ok(graph.edges.some((edge) => edge.relation === "executes"));
  assert.ok(graph.edges.some((edge) => edge.relation === "produces"));
  assert.ok(graph.edges.some((edge) => edge.relation === "publishes"));
  const dossierNode = graph.nodes.find((node) => node.externalId === pendingDossier.id);
  assert.equal(dossierNode.workspaceId, 3);
  assert.equal(dossierNode.companyId, 7);
  assert.equal(dossierNode.competence, "2026-08");
});

test("trabalho pendente bloqueia e snapshot aprovado recebe somente aviso histórico", () => {
  assert.equal(classifyFiscalArtifactImpact(pendingDossier), "blocked_pending_reprocess");
  assert.equal(classifyFiscalArtifactImpact(approvedDossier), "historical_notice");
  assert.equal(classifyFiscalArtifactImpact({ ...pendingDossier, status: "delivered" }), "historical_notice");
});

test("comparação antes e depois é explicável e usa exclusivamente centavos inteiros", () => {
  const before = { totalCents: 12_345, nested: { taxCents: 1_200, rateBps: 900 }, items: [{ amountCents: 500 }] };
  const after = { totalCents: 12_400, nested: { taxCents: 1_250, rateBps: 900 }, items: [{ amountCents: 500 }, { amountCents: 25 }] };
  assert.deepEqual(extractFiscalCentLedger(before), { "items[0].amountCents": 500, "nested.taxCents": 1_200, totalCents: 12_345 });
  const diff = compareFiscalCentSnapshots(before, after);
  assert.equal(diff.moneyUnit, "cent");
  assert.equal(diff.changed, true);
  assert.deepEqual(diff.changes.find((item) => item.path === "totalCents"), { path: "totalCents", beforeCents: 12_345, afterCents: 12_400, deltaCents: 55 });
  assert.ok(diff.changes.some((item) => item.path === "items[1].amountCents" && item.beforeCents === null));
});

test("competência é derivada dos fatos do artefato sem inventar data ausente", () => {
  assert.equal(inferFiscalCompetence({ operationDate: "2026-08-01" }), "2026-08");
  assert.equal(inferFiscalCompetence({ targetYear: 2027 }), "2027-01");
  assert.equal(inferFiscalCompetence({ note: "sem data" }), null);
});

test("concorrência, hash divergente e versão inalterada impedem conclusão da fila", () => {
  const valid = { expectedJobStatus: "processing", lockTokenMatches: true, afterHashMatches: true, ruleVersionChanged: true };
  assert.equal(assessReexecutionClaim(valid).allowed, true);
  assert.ok(assessReexecutionClaim({ ...valid, lockTokenMatches: false }).blockers.includes("concurrent_worker_lost_lock"));
  assert.ok(assessReexecutionClaim({ ...valid, afterHashMatches: false }).blockers.includes("after_snapshot_hash_mismatch"));
  assert.ok(assessReexecutionClaim({ ...valid, ruleVersionChanged: false }).blockers.includes("rule_version_not_changed"));
});

test("persistência, monitor, release e relatório público estão ligados ao grafo", async () => {
  const [schema, service, domain, monitor, review, publicPage, report] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/fiscal-impact-graph-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../domain/fiscal-impact-graph.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/normative-governance-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/normative-monitor/review/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dossie/[token]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/relatorio-fiscal/FiscalDossierReportDocument.tsx", import.meta.url), "utf8"),
  ]);
  for (const table of ["fiscal_impact_runs", "fiscal_impact_nodes", "fiscal_impact_edges", "fiscal_reexecution_jobs", "fiscal_impact_run_events"]) assert.match(schema, new RegExp(table));
  assert.match(schema, /fiscal_reexecution_jobs_idempotency_idx/);
  assert.match(service, /status = 'processing'.*lock_token/s);
  assert.match(service, /compareFiscalCentSnapshots/);
  assert.match(service, /historical_notice/);
  assert.match(service, /blocked_pending_reprocess/);
  assert.match(service, /cancelled_by_rollback/);
  assert.match(domain, /concurrent_worker_lost_lock/);
  assert.match(monitor, /createFiscalImpactRun/);
  assert.match(review, /reconcileFiscalImpactRun/);
  assert.doesNotMatch(review, /resolved_by_new_version[^\n]+status = 'open'/);
  assert.match(publicPage, /historical_notice/);
  assert.match(report, /AVISO DE REGRA SUPERVENIENTE/);
});

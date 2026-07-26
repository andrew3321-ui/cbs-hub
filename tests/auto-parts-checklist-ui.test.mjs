import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("interface de autopeças expõe todos os itens do checklist e salva o snapshot", async () => {
  const [center, api, reportPage, reportDocument, actions] = await Promise.all([
    readFile(new URL("../app/app/NationalCoverageCenter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/national-coverage/auto-parts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/relatorio-fiscal/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/relatorio-fiscal/FiscalDossierReportDocument.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/relatorio-fiscal/[id]/FiscalReportActions.tsx", import.meta.url), "utf8"),
  ]);

  for (const expected of [
    "Resultado explicável e congelável",
    "Dados utilizados e fatos confirmados",
    "Memória de cálculo linha por linha",
    "Fontes oficiais efetivamente aplicadas",
    "VIGÊNCIA CONTROLADA",
    "coverage.status",
    "Pendências que impedem a conclusão",
    "Salvar dossiê versionado",
    "Abrir relatório para o cliente",
  ]) assert.match(center, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(api, /saveDossier/);
  assert.match(api, /INSERT INTO fiscal_dossiers/);
  assert.match(api, /inputHash/);
  assert.match(reportPage, /sha256Hex\(dossier\.snapshotJson\)/);
  assert.match(reportDocument, /SHA-256 verificado/);
  assert.match(reportDocument, /FONTES OFICIAIS APLICADAS/);
  assert.match(actions, /Imprimir \/ salvar PDF/);
});

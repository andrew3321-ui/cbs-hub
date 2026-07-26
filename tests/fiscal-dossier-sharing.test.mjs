import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("dossiê aprovado recebe link público revogável sem expor versões não revisadas", async () => {
  const [api, publicPage, actions, report, schema, migration] = await Promise.all([
    readFile(new URL("app/api/fiscal-dossier-shares/route.ts", root), "utf8"),
    readFile(new URL("app/dossie/[token]/page.tsx", root), "utf8"),
    readFile(new URL("app/relatorio-fiscal/[id]/FiscalReportActions.tsx", root), "utf8"),
    readFile(new URL("app/relatorio-fiscal/FiscalDossierReportDocument.tsx", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0025_serious_betty_brant.sql", root), "utf8"),
  ]);

  assert.match(api, /dossier\.status !== "approved"/);
  assert.match(api, /dossier\.decisionByUserId/);
  assert.match(api, /sha256Hex\(dossier\.snapshotJson\) !== dossier\.inputHash/);
  assert.match(api, /isAutoPartsDossierSnapshot/);
  assert.match(api, /isColdBeverageDossierSnapshot/);
  assert.match(api, /UPDATE fiscal_dossier_shares SET revoked_at/);
  assert.match(api, /fiscal_dossier\.share_created/);
  assert.match(api, /fiscal_dossier\.share_revoked/);

  assert.match(publicPage, /isNull\(fiscalDossierShares\.revokedAt\)/);
  assert.match(publicPage, /gt\(fiscalDossierShares\.expiresAt/);
  assert.match(publicPage, /record\.dossier\.status !== "approved"/);
  assert.match(publicPage, /sha256Hex\(record\.dossier\.snapshotJson\)/);
  assert.match(publicPage, /views: sql/);
  assert.match(publicPage, /lastViewedAt/);

  assert.match(actions, /Compartilhar/);
  assert.match(actions, /Revogar link/);
  assert.match(actions, /Copiar link/);
  assert.match(actions, /expiryDays/);
  assert.match(report, /MENSAGEM DO RESPONSÁVEL/);
  assert.match(report, /Snapshot gerado em/);
  assert.match(schema, /fiscalDossierShares/);
  assert.match(migration, /CREATE TABLE `fiscal_dossier_shares`/);
  assert.match(migration, /fiscal_dossier_shares_token_unique/);
});

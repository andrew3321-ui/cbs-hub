import assert from "node:assert/strict";
import test from "node:test";

import {
  ST_SECTORAL_RANKED_ROUTES,
  ST_SECTORAL_REPRESENTATIVES,
  hashStSectoralPriorityExpansion,
  stSectoralPriorityCases,
  stSectoralPriorityCells,
  stSectoralPriorityMetrics,
  validateStSectoralPriorityExpansion,
} from "../domain/st-sectoral-priority-expansion.ts";

test("dez segmentos são auditados nas dez rotas prioritárias sem emprestar parâmetros", () => {
  const validation = validateStSectoralPriorityExpansion();
  assert.equal(validation.passed, true, JSON.stringify(validation.errors));
  assert.equal(ST_SECTORAL_REPRESENTATIVES.length, 10);
  assert.equal(ST_SECTORAL_RANKED_ROUTES.length, 10);
  assert.equal(stSectoralPriorityCells.length, 100);
  assert.equal(stSectoralPriorityMetrics().positiveMemories, 28);
  assert.equal(stSectoralPriorityMetrics().coverage.partial, 29);
  assert.equal(stSectoralPriorityMetrics().coverage.notSupported, 43);
});

test("cada memória liberada tem snapshot legal e quatro mutações negativas", () => {
  const supported = stSectoralPriorityCells.filter((cell) => cell.status === "supported");
  for (const cell of supported) {
    assert.ok(cell.legal);
    assert.ok(cell.expectedMemory?.output !== null);
    assert.equal(stSectoralPriorityCases.filter((item) => item.cellKey === cell.key && item.kind === "negative").length, 4);
  }
  assert.equal(stSectoralPriorityCases.length, 212);
  assert.equal(stSectoralPriorityCases.filter((item) => item.kind === "negative" && item.expectedOutput !== null).length, 0);
});

test("hash cobre a matriz e as memórias versionadas", async () => {
  const first = await hashStSectoralPriorityExpansion();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(await hashStSectoralPriorityExpansion(), first);
});

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("V33 exposes the no-AI laboratory, federal modules and audit language", () => {
  const component = fs.readFileSync(new URL("../app/app/DeterministicTaxLab.tsx", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../app/app/CBSHubApp.tsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../app/deterministic-tax-lab.css", import.meta.url), "utf8");
  assert.match(component, /MOTOR DETERMINÍSTICO · SEM IA/);
  assert.equal((component.match(/id: "(?:simples_annex_i|simples_services|pis_cofins|pis_cofins_special|presumed_profit_2026|real_profit_federal|federal_withholdings|ipi_tipi|iss|icms_difal|rtc_2026)"/g) ?? []).length, 11);
  assert.match(component, /Presumido 2026/);
  assert.match(component, /Lucro Real/);
  assert.match(component, /Retencoes/);
  assert.match(component, /IPI\/TIPI/);
  assert.match(component, /fontes oficiais vinculadas/);
  assert.match(component, /O motor mostra bloqueios/);
  assert.match(shell, /Laboratório fiscal/);
  assert.match(css, /@media\(max-width:700px\)/);
});

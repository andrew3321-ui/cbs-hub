import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("V31 exposes the no-AI laboratory, five modules and audit language", () => {
  const component = fs.readFileSync(new URL("../app/app/DeterministicTaxLab.tsx", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../app/app/MargemApp.tsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../app/deterministic-tax-lab.css", import.meta.url), "utf8");
  assert.match(component, /MOTOR DETERMINÍSTICO · SEM IA/);
  assert.equal((component.match(/id: "(?:simples_annex_i|pis_cofins|iss|icms_difal|rtc_2026)"/g) ?? []).length, 5);
  assert.match(component, /fontes oficiais vinculadas/);
  assert.match(component, /O motor mostra bloqueios/);
  assert.match(shell, /Laboratório fiscal/);
  assert.match(css, /@media\(max-width:700px\)/);
});

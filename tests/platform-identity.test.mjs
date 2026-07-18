import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { formatNumericCnpj, numericCnpjIsValid, platformIdentity, publicPlatformOwnership } from "../domain/platform-identity.ts";

test("V33 attaches a mathematically valid and consistently formatted CNPJ", () => {
  assert.equal(numericCnpjIsValid("64.297.777/0001-42"), true);
  assert.equal(numericCnpjIsValid("64.297.777/0001-43"), false);
  assert.equal(numericCnpjIsValid("11.111.111/1111-11"), false);
  assert.equal(numericCnpjIsValid("64297777"), false);
  assert.equal(formatNumericCnpj(platformIdentity.cnpj), "64.297.777/0001-42");
});

test("ownership remains explicitly self-declared until Receita verification", () => {
  assert.equal(platformIdentity.declarationStatus, "self_declared");
  assert.equal(platformIdentity.checkDigitStatus, "valid");
  assert.equal(platformIdentity.registryVerification, "not_verified");
  assert.equal(platformIdentity.legalName, null);
});

test("public ownership record exposes the declaration without private account data", () => {
  const payload = publicPlatformOwnership();
  assert.equal(payload.formattedCnpj, "64.297.777/0001-42");
  assert.equal(payload.registryVerification, "not_verified");
  assert.match(payload.officialRegistryLookup, /^https:\/\/solucoes\.receita\.fazenda\.gov\.br\//);
  assert.equal("email" in payload, false);
  assert.equal("userId" in payload, false);
});

test("institutional identity is visible from the landing page and has a dedicated page", () => {
  const landing = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const ownerPage = fs.readFileSync(new URL("../app/responsavel/page.tsx", import.meta.url), "utf8");
  assert.match(landing, /Responsável declarado/);
  assert.match(landing, /\/responsavel/);
  assert.match(ownerPage, /Responsável declarado pela plataforma/);
  assert.match(ownerPage, /Cadastro oficial não verificado/);
  assert.match(ownerPage, /Consultar comprovante na Receita Federal/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { formatNumericCnpj, numericCnpjIsValid, platformIdentity, publicPlatformOwnership } from "../domain/platform-identity.ts";

test("V35 preserves a mathematically valid and consistently formatted CNPJ", () => {
  assert.equal(numericCnpjIsValid("64.297.777/0001-42"), true);
  assert.equal(numericCnpjIsValid("64.297.777/0001-43"), false);
  assert.equal(numericCnpjIsValid("11.111.111/1111-11"), false);
  assert.equal(numericCnpjIsValid("64297777"), false);
  assert.equal(formatNumericCnpj(platformIdentity.cnpj), "64.297.777/0001-42");
});

test("official Receita certificate documents the active company identity", () => {
  assert.equal(platformIdentity.declarationStatus, "documented");
  assert.equal(platformIdentity.checkDigitStatus, "valid");
  assert.equal(platformIdentity.registryVerification, "verified_from_receita_certificate");
  assert.equal(platformIdentity.registrationStatus, "active");
  assert.equal(platformIdentity.legalName, "64.297.777 ANDRE HUGO SANTOS COELHO");
  assert.equal(platformIdentity.officialDocument.issuer, "Receita Federal do Brasil");
  assert.equal(platformIdentity.officialDocument.issuedAt, "2026-07-17T21:42:07-03:00");
});

test("public ownership record exposes verification without private contact data", () => {
  const payload = publicPlatformOwnership();
  assert.equal(payload.formattedCnpj, "64.297.777/0001-42");
  assert.equal(payload.registryVerification, "verified_from_receita_certificate");
  assert.equal(payload.registrationStatus, "active");
  assert.match(payload.officialRegistryLookup, /^https:\/\/solucoes\.receita\.fazenda\.gov\.br\//);
  assert.equal("email" in payload, false);
  assert.equal("phone" in payload, false);
  assert.equal("address" in payload, false);
  assert.equal("userId" in payload, false);
});

test("institutional identity is visible from the landing page and has a dedicated page", () => {
  const landing = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const ownerPage = fs.readFileSync(new URL("../app/responsavel/page.tsx", import.meta.url), "utf8");
  assert.match(landing, /Responsável cadastral/);
  assert.match(landing, /\/responsavel/);
  assert.match(ownerPage, /Responsável cadastral da plataforma/);
  assert.match(ownerPage, /Situação cadastral ativa/);
  assert.match(ownerPage, /Razão social conferida/);
  assert.match(ownerPage, /não comprova isoladamente a titularidade jurídica/);
  assert.match(ownerPage, /Consultar comprovante na Receita Federal/);
});

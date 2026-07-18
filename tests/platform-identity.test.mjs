import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { platformIdentity, publicPlatformOwnership } from "../domain/platform-identity.ts";

test("V37 identifies a natural-person responsible without publishing a tax identifier", () => {
  assert.equal(platformIdentity.holderType, "natural_person");
  assert.equal(platformIdentity.responsibleName, "ANDRÉ HUGO SANTOS COELHO");
  assert.equal(platformIdentity.declarationStatus, "declared_by_responsible");
  assert.equal(platformIdentity.publicTaxIdDisclosure, "not_published");
  assert.equal(platformIdentity.commercialStatus, "free_beta_without_automatic_billing");
  assert.equal(platformIdentity.version, "2026.07.18-v37");
});

test("public ownership record contains no CPF, CNPJ or private contact data", () => {
  const payload = publicPlatformOwnership();
  assert.equal(payload.responsibleName, "ANDRÉ HUGO SANTOS COELHO");
  assert.equal(payload.paidLaunchRequirement, "supplier_tax_id_must_be_disclosed_before_paid_contracting");
  assert.equal("cpf" in payload, false);
  assert.equal("cnpj" in payload, false);
  assert.equal("taxId" in payload, false);
  assert.equal("email" in payload, false);
  assert.equal("phone" in payload, false);
  assert.equal("address" in payload, false);
  assert.equal("userId" in payload, false);
});

test("institutional pages identify the responsible person and remove the former company identity", () => {
  const landing = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const ownerPage = fs.readFileSync(new URL("../app/responsavel/page.tsx", import.meta.url), "utf8");
  const pricing = fs.readFileSync(new URL("../app/planos/page.tsx", import.meta.url), "utf8");
  assert.match(landing, /Responsável pela plataforma/);
  assert.match(landing, /responsibleName/);
  assert.match(ownerPage, /Responsável pela plataforma/);
  assert.match(ownerPage, /Documentos pessoais protegidos/);
  assert.match(ownerPage, /não comprova isoladamente a titularidade do código-fonte/);
  assert.match(ownerPage, /identificação fiscal obrigatória do fornecedor/);
  assert.doesNotMatch(`${landing}\n${ownerPage}\n${pricing}`, /formattedCnpj|64\.297\.777|Receita Federal|Razão social conferida/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeProfessionalRegistration,
  professionalRegistrationError,
  professionalRegistrationIsValid,
} from "../app/professional-registration.ts";

test("normaliza o registro profissional antes da assinatura", () => {
  assert.equal(normalizeProfessionalRegistration("  crc   sp-123456/o-7  "), "CRC SP-123456/O-7");
});

test("aceita registro profissional com letras e números", () => {
  assert.equal(professionalRegistrationError("CRC SP-123456/O-7"), null);
  assert.equal(professionalRegistrationIsValid("crc sp-123456/o-7"), true);
});

test("bloqueia registros incompletos antes de chamar a API", () => {
  assert.equal(professionalRegistrationIsValid("1234"), false);
  assert.equal(professionalRegistrationIsValid("CRC-SP"), false);
  assert.equal(professionalRegistrationIsValid("CR@1234"), false);
  assert.match(professionalRegistrationError("1234"), /letras e números/);
});

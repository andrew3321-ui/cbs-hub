import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("cadastro público pede somente usuário e uma senha", async () => {
  const auth = await read("../app/auth-ui/AuthScreen.tsx");

  assert.match(auth, /profissional-\$\{suffix\}/);
  assert.match(auth, /Já reservamos uma sugestão para você/);
  assert.match(auth, /Nome de usuário/);
  assert.match(auth, /Começar meus 5 dias/);
  assert.match(auth, /E-mail só se contratar/);
  assert.match(auth, /mode === "recover" && <label>Confirmar senha/);
  assert.doesNotMatch(auth, /mode !== "login" && <><div className="password-strength"/);
});

test("servidor cria identidade pseudônima e login aceita usuário ou e-mail", async () => {
  const [register, login, reset, auth, schema, migration] = await Promise.all([
    read("../app/api/auth/register/route.ts"),
    read("../app/api/auth/login/route.ts"),
    read("../app/api/auth/reset-password/route.ts"),
    read("../app/auth.ts"),
    read("../db/schema.ts"),
    read("../drizzle/0042_minimal_signup_identity.sql"),
  ]);

  assert.match(register, /internalAccountEmail\(accountCode\)/);
  assert.match(register, /usernameIsValid\(username\)/);
  assert.match(register, /IDENTITY_EXISTS/);
  assert.match(login, /eq\(users\.username/);
  assert.match(login, /eq\(users\.email/);
  assert.match(reset, /eq\(users\.username/);
  assert.match(auth, /account\.cbshub\.invalid/);
  assert.match(schema, /accountCode: text\("account_code"\)\.notNull\(\)\.unique\(\)/);
  assert.match(migration, /users_username_unique/);
  assert.match(migration, /users_account_code_unique/);
});

test("perfil pode ser completado depois e pagamento exige contato real", async () => {
  const [profile, shell, account, checkout, pix, pricing] = await Promise.all([
    read("../app/app/AccountProfileCenter.tsx"),
    read("../app/app/CBSHubApp.tsx"),
    read("../app/api/account/route.ts"),
    read("../app/api/billing/checkout/route.ts"),
    read("../app/api/billing/pix/route.ts"),
    read("../app/planos/PricingClient.tsx"),
  ]);

  assert.match(profile, /Primeiro nome/);
  assert.match(profile, /E-mail de contato/);
  assert.match(profile, /IDENTIFICADOR CBSHUB/);
  assert.match(shell, /Minha conta/);
  assert.match(account, /firstNameChanged/);
  assert.match(account, /usernameChanged/);
  assert.match(checkout, /BILLING_PROFILE_REQUIRED/);
  assert.match(pix, /BILLING_PROFILE_REQUIRED/);
  assert.match(pricing, /window\.location\.assign\(data\.profileUrl\)/);
});

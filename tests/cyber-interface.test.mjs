import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("public product surfaces share the cybersecurity interface system", () => {
  const layout = read("../app/layout.tsx");
  const interfaceCss = read("../app/cyber-interface.css");

  assert.match(layout, /import "\.\/cyber-interface\.css"/);
  assert.match(interfaceCss, /--cyber-cyan: #35defe/);
  assert.match(interfaceCss, /--cyber-lime: #b8ff3d/);
  assert.match(interfaceCss, /\.auth-access-header/);
  assert.match(interfaceCss, /\.legal-grid-backdrop/);
  assert.match(interfaceCss, /@media \(max-width: 720px\)/);
});

test("institutional pages use the shared cyber navigation instead of legacy shells", () => {
  for (const page of ["privacidade", "termos", "responsavel"]) {
    const source = read(`../app/${page}/page.tsx`);
    assert.match(source, /CyberMarketingHeader/);
    assert.match(source, /CyberMarketingFooter/);
    assert.doesNotMatch(source, /className="(?:legal|ownership)-nav"/);
  }
});

test("access screens expose a product header and retain mobile-first controls", () => {
  const auth = read("../app/auth-ui/AuthScreen.tsx");
  const interfaceCss = read("../app/cyber-interface.css");

  assert.match(auth, /className="auth-access-header"/);
  assert.match(auth, /Cybersecurity/);
  assert.match(auth, /Segurança e confiança/);
  assert.match(interfaceCss, /\.auth-card input[\s\S]*height: 52px/);
  assert.match(interfaceCss, /\.auth-submit,[\s\S]*min-height: 54px/);
});

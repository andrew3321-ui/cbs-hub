const baseUrl = new URL(process.env.SMOKE_BASE_URL ?? "https://cbshub.com.br").origin;
const strict = process.env.SMOKE_STRICT === "1";
const email = process.env.SMOKE_TEST_EMAIL ?? "";
const password = process.env.SMOKE_TEST_PASSWORD ?? "";
const reportToken = process.env.SMOKE_REPORT_TOKEN ?? "";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 15_000);

async function request(pathname, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(pathname, `${baseUrl}/`), {
      redirect: "manual",
      ...init,
      signal: controller.signal,
      headers: { "User-Agent": "CBSHub-PostDeploy-Smoke/1.0", ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function requireStatus(label, response, allowed) {
  if (!allowed.includes(response.status)) {
    throw new Error(`${label}: HTTP ${response.status}; esperado ${allowed.join("/")}.`);
  }
}

const health = await request("/api/health");
requireStatus("health", health, [200]);
const healthBody = await health.json();
if (healthBody.status !== "healthy" || healthBody.checks?.database !== "up") {
  throw new Error("health: banco ou assinatura indisponível.");
}
if (!healthBody.release?.id) throw new Error("health: versão do Worker ausente.");

for (const [label, pathname] of [["login-page", "/entrar"], ["plans-page", "/planos"]]) {
  const response = await request(pathname);
  requireStatus(label, response, [200]);
}

let cookie = "";
if (email && password) {
  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });
  requireStatus("login", login, [200]);
  cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
  if (!cookie) throw new Error("login: cookie de sessão ausente.");
} else {
  if (strict) throw new Error("SMOKE_STRICT exige SMOKE_TEST_EMAIL e SMOKE_TEST_PASSWORD.");
  const loginBoundary = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ email: `smoke-${Date.now()}@invalid.cbshub.local`, password: "invalid-smoke-password" }),
  });
  requireStatus("login-boundary", loginBoundary, [401]);
}

const calculation = await request("/api/deterministic-tax-lab", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: baseUrl, ...(cookie ? { Cookie: cookie } : {}) },
  body: JSON.stringify({
    module: "simples_annex_i",
    rbt12Cents: 12_000_000,
    monthlySegregatedRevenueCents: 1_000_000,
    annexConfirmed: true,
    revenueSegregated: true,
    periodClosed: true,
    noSpecialTreatment: true,
  }),
});
requireStatus("calculation", calculation, cookie ? [200] : [401]);

const billing = await request("/api/billing", { headers: cookie ? { Cookie: cookie } : {} });
requireStatus("payment-readiness", billing, cookie ? [200] : [401]);

if (reportToken) {
  const report = await request(`/relatorio/${encodeURIComponent(reportToken)}`);
  requireStatus("report", report, [200]);
} else {
  if (strict) throw new Error("SMOKE_STRICT exige SMOKE_REPORT_TOKEN.");
  const reportBoundary = await request("/relatorio/smoke-token-inexistente");
  requireStatus("report-boundary", reportBoundary, [200, 404]);
}

console.log(JSON.stringify({
  event: "post_deploy_smoke.passed",
  baseUrl,
  mode: strict ? "strict" : cookie ? "authenticated" : "boundary",
  releaseId: healthBody.release.id,
  checkedAt: new Date().toISOString(),
}));


import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const wrangler = resolve("node_modules", "wrangler", "bin", "wrangler.js");
const node = process.execPath;
const branch = process.env.WORKERS_CI_BRANCH ?? "";

if (process.env.WORKERS_CI === "1" && branch !== "main") {
  throw new Error(`Publicação bloqueada para ${branch || "branch desconhecida"}. Somente main pode publicar.`);
}

if (process.env.WORKERS_CI === "1") {
  const localHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const remoteMain = execFileSync("git", ["ls-remote", "origin", "refs/heads/main"], { encoding: "utf8" }).trim().split(/\s+/)[0];
  if (!remoteMain || localHead !== remoteMain) {
    throw new Error(`Publicação obsoleta bloqueada: ${localHead || "HEAD ausente"} não é a main atual.`);
  }
}

function currentVersionId() {
  const output = execFileSync(node, [wrangler,
    "deployments", "list", "--config", "wrangler.migrations.jsonc", "--json",
  ], { encoding: "utf8" });
  const deployments = JSON.parse(output);
  return deployments.at(-1)?.versions?.find((item) => item.percentage === 100)?.version_id ?? null;
}

const previousVersionId = currentVersionId();

function ensureQueue(name) {
  try {
    execFileSync(node, [wrangler, "queues", "create", name], { stdio: "pipe" });
    console.log(`Queue ${name} criada.`);
  } catch (error) {
    const output = `${error?.stdout?.toString?.() ?? ""}\n${error?.stderr?.toString?.() ?? ""}`;
    if (/already exists|já existe/i.test(output)) return;
    throw error;
  }
}

function putSecret(config, value) {
  const result = spawnSync(node, [wrangler, "secret", "put", "SECURITY_RUNNER_SIGNING_KEY", "--config", config], {
    input: `${value}\n`, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"],
  });
  if (result.status !== 0) throw new Error(`Falha ao sincronizar o segredo do runner em ${config}.`);
}

// Refuse stale/local Vinext artifacts before touching D1 or uploading assets.
execFileSync(node, ["scripts/finalize-workers-config.mjs"], { stdio: "inherit" });

execFileSync(node, [wrangler,
  "d1", "migrations", "apply", "margem-clara-production",
  "--remote", "--config", "wrangler.migrations.jsonc",
], { stdio: "inherit" });

ensureQueue("cbs-hub-active-security-runs");
ensureQueue("cbs-hub-active-security-runs-dlq");
execFileSync(node, [wrangler, "deploy", "--config", "security-runner/wrangler.jsonc"], { stdio: "inherit" });
const runnerSigningKey = randomBytes(48).toString("base64url");
putSecret("security-runner/wrangler.jsonc", runnerSigningKey);
putSecret("dist/server/wrangler.json", runnerSigningKey);

execFileSync(node, [wrangler, "deploy", "--config", "dist/server/wrangler.json"], { stdio: "inherit" });

try {
  execFileSync(node, ["scripts/post-deploy-smoke.mjs"], {
    stdio: "inherit",
    env: {
      ...process.env,
      SMOKE_BASE_URL: process.env.SMOKE_BASE_URL ?? "https://cbshub.com.br",
      SMOKE_PREVIOUS_RELEASE_ID: previousVersionId ?? "",
    },
  });
} catch (error) {
  if (previousVersionId) {
    console.error(`Smoke pós-deploy falhou; restaurando automaticamente ${previousVersionId}.`);
    execFileSync(node, [wrangler,
      "rollback", previousVersionId,
      "--config", "wrangler.migrations.jsonc",
      "--message", "Automatic rollback after post-deploy smoke failure",
      "--yes",
    ], { stdio: "inherit" });
  }
  throw error;
}

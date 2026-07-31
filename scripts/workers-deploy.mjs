import { execFileSync } from "node:child_process";
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

execFileSync(node, [wrangler,
  "d1", "migrations", "apply", "margem-clara-production",
  "--remote", "--config", "wrangler.migrations.jsonc",
], { stdio: "inherit" });

execFileSync(node, [wrangler, "deploy", "--config", "dist/server/wrangler.json"], { stdio: "inherit" });

try {
  execFileSync(node, ["scripts/post-deploy-smoke.mjs"], {
    stdio: "inherit",
    env: {
      ...process.env,
      SMOKE_BASE_URL: process.env.SMOKE_BASE_URL ?? "https://cbshub.com.br",
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

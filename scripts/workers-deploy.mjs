import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const wrangler = resolve("node_modules", "wrangler", "bin", "wrangler.js");
const node = process.execPath;
const branch = process.env.WORKERS_CI_BRANCH ?? "";

if (process.env.WORKERS_CI === "1" && branch !== "main") {
  throw new Error(`Publicação bloqueada para ${branch || "branch desconhecida"}. Somente main pode publicar.`);
}

execFileSync(node, [wrangler,
  "d1", "migrations", "apply", "margem-clara-production",
  "--remote", "--config", "wrangler.migrations.jsonc",
], { stdio: "inherit" });

execFileSync(node, [wrangler, "deploy", "--config", "dist/server/wrangler.json"], { stdio: "inherit" });

execFileSync(node, ["scripts/post-deploy-smoke.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    SMOKE_BASE_URL: process.env.SMOKE_BASE_URL ?? "https://cbshub.com.br",
  },
});

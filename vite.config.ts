import vinext from "vinext";
import { defineConfig } from "vite";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";
const MARGEM_CLARA_PRODUCTION_DATABASE_ID =
  "ce069e8f-9efb-4142-8a76-0721bfb04a1c";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
// Cloudflare injects WORKERS_CI=1 only in Workers Builds. Keep the OpenAI
// preview binding isolated while using the real external D1 during CI deploys.
const isCloudflareWorkersBuild = process.env.WORKERS_CI === "1";

const localBindingConfig = {
  ...(isCloudflareWorkersBuild
    ? {
        name: "margem-clara",
        compatibility_date: "2026-07-25",
      }
    : {}),
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: [
    {
      binding: "DB",
      database_name: isCloudflareWorkersBuild
        ? "margem-clara-production"
        : "margem-clara-local",
      database_id: isCloudflareWorkersBuild
        ? MARGEM_CLARA_PRODUCTION_DATABASE_ID
        : SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
      ...(isCloudflareWorkersBuild ? { migrations_dir: "./drizzle" } : {}),
    },
  ],
  triggers: {
    crons: ["*/30 * * * *", "15 8 * * *"],
  },
  r2_buckets: [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});

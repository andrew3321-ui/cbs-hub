import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let scenarioSchemaReady: Promise<unknown> | undefined;

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export function ensureScenarioSchema() {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }

  scenarioSchemaReady ??= (async () => {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        revenue_cents INTEGER NOT NULL,
        current_rate_bps INTEGER NOT NULL,
        new_rate_bps INTEGER NOT NULL,
        cost_rate_bps INTEGER NOT NULL,
        price_adjustment_bps INTEGER DEFAULT 0 NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `).run();

    try {
      await env.DB.prepare("ALTER TABLE scenarios ADD COLUMN price_adjustment_bps INTEGER DEFAULT 0 NOT NULL").run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }
  })();

  return scenarioSchemaReady;
}

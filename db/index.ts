import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is unavailable.");
  return drizzle(env.DB, { schema });
}

/** Schema changes are applied through versioned D1 migrations in every environment. */
export async function ensureScenarioSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is unavailable.");
  await env.DB.prepare("SELECT id FROM users LIMIT 0").all();
}

export async function checkDatabaseHealth() {
  if (!env.DB) return false;
  try {
    const row = await env.DB.prepare("SELECT 1 AS healthy").first<{ healthy: number }>();
    return row?.healthy === 1;
  } catch {
    return false;
  }
}

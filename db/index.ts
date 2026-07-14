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
    await env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          name TEXT NOT NULL,
          cnpj TEXT,
          tax_regime TEXT NOT NULL,
          sector TEXT DEFAULT 'Serviços' NOT NULL,
          owner_user_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        INSERT INTO companies (id, name, cnpj, tax_regime, sector)
        SELECT 1, 'Aurora Consultoria Ltda.', NULL, 'Lucro Presumido', 'Serviços B2B'
        WHERE NOT EXISTS (SELECT 1 FROM companies)
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS scenarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          name TEXT NOT NULL,
          revenue_cents INTEGER NOT NULL,
          current_rate_bps INTEGER NOT NULL,
          new_rate_bps INTEGER NOT NULL,
          cost_rate_bps INTEGER NOT NULL,
          fixed_costs_cents INTEGER DEFAULT 0 NOT NULL,
          volume_loss_bps INTEGER DEFAULT 0 NOT NULL,
          price_adjustment_bps INTEGER DEFAULT 0 NOT NULL,
          target_year INTEGER DEFAULT 2027 NOT NULL,
          rate_source TEXT DEFAULT 'legacy_unverified' NOT NULL,
          source_note TEXT DEFAULT 'Registro anterior ao versionamento de premissas.' NOT NULL,
          review_status TEXT DEFAULT 'draft' NOT NULL,
          calculation_version TEXT DEFAULT 'legacy' NOT NULL,
          methodology_version TEXT DEFAULT 'legacy' NOT NULL,
          input_hash TEXT,
          snapshot_json TEXT,
          calculated_at TEXT,
          company_id INTEGER DEFAULT 1 NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS billing_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id INTEGER NOT NULL UNIQUE,
          plan_key TEXT DEFAULT 'beta' NOT NULL,
          provider TEXT DEFAULT 'mercado_pago' NOT NULL,
          external_reference TEXT NOT NULL UNIQUE,
          provider_subscription_id TEXT,
          status TEXT DEFAULT 'beta' NOT NULL,
          checkout_url TEXT,
          next_payment_at TEXT,
          last_synced_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          recovery_key_hash TEXT NOT NULL,
          failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
          locked_until TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY NOT NULL,
          user_id INTEGER NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS report_shares (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          scenario_id INTEGER NOT NULL,
          company_id INTEGER NOT NULL,
          owner_user_id INTEGER NOT NULL,
          note TEXT,
          expires_at TEXT NOT NULL,
          revoked_at TEXT,
          views INTEGER DEFAULT 0 NOT NULL,
          last_viewed_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS audit_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          owner_user_id INTEGER NOT NULL,
          company_id INTEGER,
          scenario_id INTEGER,
          event_type TEXT NOT NULL,
          event_data TEXT DEFAULT '{}' NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
    ]);

    try {
      await env.DB.prepare("ALTER TABLE scenarios ADD COLUMN price_adjustment_bps INTEGER DEFAULT 0 NOT NULL").run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }

    try {
      await env.DB.prepare("ALTER TABLE scenarios ADD COLUMN fixed_costs_cents INTEGER DEFAULT 0 NOT NULL").run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }

    try {
      await env.DB.prepare("ALTER TABLE scenarios ADD COLUMN volume_loss_bps INTEGER DEFAULT 0 NOT NULL").run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }

    try {
      await env.DB.prepare("ALTER TABLE scenarios ADD COLUMN company_id INTEGER DEFAULT 1 NOT NULL").run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }

    try {
      await env.DB.prepare("ALTER TABLE companies ADD COLUMN owner_user_id INTEGER").run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }

    const reliabilityColumns = [
      "ALTER TABLE scenarios ADD COLUMN target_year INTEGER DEFAULT 2027 NOT NULL",
      "ALTER TABLE scenarios ADD COLUMN rate_source TEXT DEFAULT 'legacy_unverified' NOT NULL",
      "ALTER TABLE scenarios ADD COLUMN source_note TEXT DEFAULT 'Registro anterior ao versionamento de premissas.' NOT NULL",
      "ALTER TABLE scenarios ADD COLUMN review_status TEXT DEFAULT 'draft' NOT NULL",
      "ALTER TABLE scenarios ADD COLUMN calculation_version TEXT DEFAULT 'legacy' NOT NULL",
      "ALTER TABLE scenarios ADD COLUMN methodology_version TEXT DEFAULT 'legacy' NOT NULL",
      "ALTER TABLE scenarios ADD COLUMN input_hash TEXT",
      "ALTER TABLE scenarios ADD COLUMN snapshot_json TEXT",
      "ALTER TABLE scenarios ADD COLUMN calculated_at TEXT",
    ];
    for (const statement of reliabilityColumns) {
      try {
        await env.DB.prepare(statement).run();
      } catch (error) {
        if (!String(error).toLowerCase().includes("duplicate column")) throw error;
      }
    }

    await env.DB.batch([
      env.DB.prepare("CREATE INDEX IF NOT EXISTS companies_owner_user_id_idx ON companies (owner_user_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS report_shares_owner_user_id_idx ON report_shares (owner_user_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS report_shares_company_id_idx ON report_shares (company_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS report_shares_scenario_id_idx ON report_shares (scenario_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS billing_accounts_user_id_idx ON billing_accounts (user_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS billing_accounts_external_reference_idx ON billing_accounts (external_reference)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS billing_accounts_provider_subscription_id_idx ON billing_accounts (provider_subscription_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_owner_user_id_idx ON audit_events (owner_user_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_company_id_idx ON audit_events (company_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_scenario_id_idx ON audit_events (scenario_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events (created_at)"),
    ]);
  })();

  return scenarioSchemaReady;
}

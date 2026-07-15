import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { hashFiscalRuleContent, rtc2026ReferenceCases, rtc2026RuleSeed } from "../domain/fiscal-rules";
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
          signature_version TEXT DEFAULT 'legacy' NOT NULL,
          record_signature TEXT,
          request_key TEXT,
          company_id INTEGER DEFAULT 1 NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS scenario_approvals (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          scenario_id INTEGER NOT NULL,
          company_id INTEGER NOT NULL,
          owner_user_id INTEGER NOT NULL,
          reviewer_user_id INTEGER NOT NULL,
          reviewer_name TEXT NOT NULL,
          reviewer_email TEXT NOT NULL,
          professional_registration TEXT NOT NULL,
          assurance_level TEXT DEFAULT 'responsible_self_review' NOT NULL,
          credential_verification TEXT DEFAULT 'self_declared' NOT NULL,
          decision TEXT DEFAULT 'approved' NOT NULL,
          declaration_version TEXT NOT NULL,
          scenario_input_hash TEXT NOT NULL,
          scenario_record_signature TEXT NOT NULL,
          decision_note TEXT DEFAULT '' NOT NULL,
          signature_version TEXT NOT NULL,
          approval_signature TEXT NOT NULL,
          decided_at TEXT NOT NULL,
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
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_rule_sets (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          code TEXT NOT NULL,
          version TEXT NOT NULL,
          name TEXT NOT NULL,
          jurisdiction TEXT NOT NULL,
          status TEXT DEFAULT 'draft' NOT NULL,
          effective_from TEXT NOT NULL,
          effective_to TEXT NOT NULL,
          content_json TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          source_count INTEGER DEFAULT 0 NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_reference_cases (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          rule_set_id INTEGER NOT NULL,
          code TEXT NOT NULL,
          title TEXT NOT NULL,
          input_json TEXT NOT NULL,
          expected_json TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS tax_periods (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          owner_user_id INTEGER NOT NULL,
          company_id INTEGER NOT NULL,
          period_key TEXT NOT NULL,
          tax_regime TEXT NOT NULL,
          legal_effect TEXT DEFAULT 'simulation_2026' NOT NULL,
          status TEXT DEFAULT 'draft' NOT NULL,
          active_revision INTEGER DEFAULT 1 NOT NULL,
          rule_set_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS tax_ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          period_id INTEGER NOT NULL,
          owner_user_id INTEGER NOT NULL,
          source_key TEXT NOT NULL,
          tax TEXT NOT NULL,
          entry_kind TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          source_type TEXT NOT NULL,
          source_document_key TEXT,
          credit_status TEXT DEFAULT 'not_applicable' NOT NULL,
          evidence_status TEXT DEFAULT 'pending' NOT NULL,
          classification_status TEXT DEFAULT 'pending' NOT NULL,
          classification_json TEXT DEFAULT '{}' NOT NULL,
          occurred_at TEXT NOT NULL,
          extinguishment_method TEXT,
          reversal_of_entry_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS tax_reconciliation_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          period_id INTEGER NOT NULL,
          owner_user_id INTEGER NOT NULL,
          source_type TEXT NOT NULL,
          tax TEXT NOT NULL,
          debits_cents INTEGER NOT NULL,
          credits_cents INTEGER NOT NULL,
          extinguishments_cents INTEGER NOT NULL,
          evidence_hash TEXT NOT NULL,
          captured_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS tax_period_closures (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          period_id INTEGER NOT NULL,
          owner_user_id INTEGER NOT NULL,
          revision INTEGER NOT NULL,
          status TEXT DEFAULT 'ready_for_review' NOT NULL,
          rule_set_id INTEGER,
          calculation_version TEXT NOT NULL,
          snapshot_json TEXT NOT NULL,
          input_hash TEXT NOT NULL,
          signature_version TEXT NOT NULL,
          record_signature TEXT NOT NULL,
          reviewer_reference TEXT,
          reviewed_at TEXT,
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
      "ALTER TABLE scenarios ADD COLUMN signature_version TEXT DEFAULT 'legacy' NOT NULL",
      "ALTER TABLE scenarios ADD COLUMN record_signature TEXT",
      "ALTER TABLE scenarios ADD COLUMN request_key TEXT",
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
      env.DB.prepare("CREATE INDEX IF NOT EXISTS companies_owner_name_idx ON companies (owner_user_id, name)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS sessions_user_expires_idx ON sessions (user_id, expires_at)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS scenarios_request_key_idx ON scenarios (request_key) WHERE request_key IS NOT NULL"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenarios_company_created_idx ON scenarios (company_id, created_at, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS scenario_approvals_scenario_idx ON scenario_approvals (scenario_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenario_approvals_owner_company_decided_idx ON scenario_approvals (owner_user_id, company_id, decided_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_owner_company_created_idx ON audit_events (owner_user_id, company_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS report_shares_owner_company_created_idx ON report_shares (owner_user_id, company_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS report_shares_scenario_owner_idx ON report_shares (scenario_id, owner_user_id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_rule_sets_code_version_idx ON fiscal_rule_sets (code, version)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_rule_sets_status_effective_idx ON fiscal_rule_sets (status, effective_from, effective_to)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_reference_cases_rule_code_idx ON fiscal_reference_cases (rule_set_id, code)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_reference_cases_rule_set_idx ON fiscal_reference_cases (rule_set_id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS tax_periods_owner_company_period_idx ON tax_periods (owner_user_id, company_id, period_key)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS tax_periods_owner_status_period_idx ON tax_periods (owner_user_id, status, period_key, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS tax_ledger_entries_period_source_idx ON tax_ledger_entries (period_id, source_key)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS tax_ledger_entries_period_tax_date_idx ON tax_ledger_entries (period_id, tax, occurred_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS tax_ledger_entries_owner_period_idx ON tax_ledger_entries (owner_user_id, period_id, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS tax_reconciliation_period_source_tax_capture_idx ON tax_reconciliation_snapshots (period_id, source_type, tax, captured_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS tax_reconciliation_owner_period_idx ON tax_reconciliation_snapshots (owner_user_id, period_id, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS tax_period_closures_period_revision_idx ON tax_period_closures (period_id, revision)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS tax_period_closures_owner_status_idx ON tax_period_closures (owner_user_id, status, id)"),
    ]);

    const contentHash = await hashFiscalRuleContent(rtc2026RuleSeed.contentJson);
    await env.DB.prepare(`
      INSERT OR IGNORE INTO fiscal_rule_sets (
        code, version, name, jurisdiction, status, effective_from, effective_to,
        content_json, content_hash, source_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      rtc2026RuleSeed.code,
      rtc2026RuleSeed.version,
      rtc2026RuleSeed.name,
      rtc2026RuleSeed.jurisdiction,
      rtc2026RuleSeed.status,
      rtc2026RuleSeed.effectiveFrom,
      rtc2026RuleSeed.effectiveTo,
      rtc2026RuleSeed.contentJson,
      contentHash,
      rtc2026RuleSeed.sourceCount,
    ).run();

    const ruleSet = await env.DB.prepare(
      "SELECT id, content_hash FROM fiscal_rule_sets WHERE code = ? AND version = ?",
    ).bind(rtc2026RuleSeed.code, rtc2026RuleSeed.version).first<{ id: number; content_hash: string }>();
    if (!ruleSet) throw new Error("fiscal_rule_seed_unavailable");
    if (ruleSet.content_hash !== contentHash) throw new Error("fiscal_rule_version_conflict");

    await env.DB.batch(rtc2026ReferenceCases.map((referenceCase) => env.DB.prepare(`
      INSERT OR IGNORE INTO fiscal_reference_cases (
        rule_set_id, code, title, input_json, expected_json
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      ruleSet.id,
      referenceCase.code,
      referenceCase.title,
      JSON.stringify(referenceCase.input),
      JSON.stringify(referenceCase.expected),
    )));
  })();

  return scenarioSchemaReady;
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

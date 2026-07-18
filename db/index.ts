import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { fiscalIntelligenceSeed, hashFiscalIntelligenceContent } from "../domain/fiscal-intelligence";
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
          workspace_id INTEGER,
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
          prepared_by_user_id INTEGER,
          supersedes_scenario_id INTEGER,
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
        CREATE TABLE IF NOT EXISTS scenario_review_rounds (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          workspace_id INTEGER NOT NULL,
          scenario_id INTEGER NOT NULL,
          company_id INTEGER NOT NULL,
          owner_user_id INTEGER NOT NULL,
          prepared_by_user_id INTEGER NOT NULL,
          assigned_reviewer_user_id INTEGER,
          requested_by_user_id INTEGER NOT NULL,
          round_number INTEGER DEFAULT 1 NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          due_at TEXT,
          decision_by_user_id INTEGER,
          decision_note TEXT DEFAULT '' NOT NULL,
          decided_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS scenario_review_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          review_round_id INTEGER NOT NULL,
          workspace_id INTEGER NOT NULL,
          scenario_id INTEGER NOT NULL,
          author_user_id INTEGER NOT NULL,
          kind TEXT DEFAULT 'comment' NOT NULL,
          body TEXT NOT NULL,
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
        CREATE TABLE IF NOT EXISTS billing_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          billing_account_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          provider TEXT DEFAULT 'mercado_pago' NOT NULL,
          provider_invoice_id TEXT NOT NULL,
          provider_payment_id TEXT,
          external_reference TEXT NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          status_detail TEXT DEFAULT '' NOT NULL,
          gross_amount_cents INTEGER NOT NULL,
          fee_amount_cents INTEGER,
          net_amount_cents INTEGER,
          currency TEXT DEFAULT 'BRL' NOT NULL,
          payment_method TEXT,
          approved_at TEXT,
          provider_summary_json TEXT DEFAULT '{}' NOT NULL,
          last_synced_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_issuances (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          transaction_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          customer_type TEXT DEFAULT 'unknown' NOT NULL,
          customer_name TEXT DEFAULT '' NOT NULL,
          customer_tax_id TEXT,
          note_requested INTEGER DEFAULT 0 NOT NULL,
          service_code TEXT,
          service_description TEXT NOT NULL,
          competence_month TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          status TEXT DEFAULT 'pending_data' NOT NULL,
          nfse_number TEXT,
          nfse_key TEXT,
          issued_at TEXT,
          internal_note TEXT DEFAULT '' NOT NULL,
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
          account_type TEXT DEFAULT 'individual' NOT NULL,
          suggested_plan_key TEXT DEFAULT 'pro' NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS accounting_workspaces (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          name TEXT NOT NULL,
          workspace_type TEXT DEFAULT 'individual' NOT NULL,
          owner_user_id INTEGER NOT NULL,
          suggested_plan_key TEXT DEFAULT 'pro' NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS workspace_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          workspace_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT DEFAULT 'preparer' NOT NULL,
          status TEXT DEFAULT 'active' NOT NULL,
          joined_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS workspace_invitations (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          workspace_id INTEGER NOT NULL,
          email TEXT NOT NULL,
          role TEXT DEFAULT 'reviewer' NOT NULL,
          token_hash TEXT NOT NULL,
          invited_by_user_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          expires_at TEXT NOT NULL,
          accepted_by_user_id INTEGER,
          accepted_at TEXT,
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
        CREATE TABLE IF NOT EXISTS fiscal_knowledge_bases (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          code TEXT NOT NULL,
          version TEXT NOT NULL,
          name TEXT NOT NULL,
          scope TEXT NOT NULL,
          status TEXT DEFAULT 'pilot' NOT NULL,
          content_json TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          source_count INTEGER DEFAULT 0 NOT NULL,
          checked_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_dossiers (
          id TEXT PRIMARY KEY NOT NULL,
          workspace_id INTEGER NOT NULL,
          owner_user_id INTEGER NOT NULL,
          company_id INTEGER,
          created_by_user_id INTEGER NOT NULL,
          assigned_reviewer_user_id INTEGER,
          decision_by_user_id INTEGER,
          title TEXT NOT NULL,
          question TEXT NOT NULL,
          status TEXT DEFAULT 'draft' NOT NULL,
          base_code TEXT NOT NULL,
          base_version TEXT NOT NULL,
          engine_version TEXT NOT NULL,
          facts_json TEXT NOT NULL,
          calculation_input_json TEXT NOT NULL,
          snapshot_json TEXT NOT NULL,
          input_hash TEXT NOT NULL,
          professional_registration TEXT,
          review_note TEXT DEFAULT '' NOT NULL,
          due_at TEXT,
          decided_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_dossier_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          dossier_id TEXT NOT NULL,
          workspace_id INTEGER NOT NULL,
          actor_user_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          note TEXT DEFAULT '' NOT NULL,
          event_data TEXT DEFAULT '{}' NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_documents (
          id TEXT PRIMARY KEY NOT NULL,
          workspace_id INTEGER NOT NULL,
          owner_user_id INTEGER NOT NULL,
          company_id INTEGER,
          uploaded_by_user_id INTEGER NOT NULL,
          dossier_id TEXT,
          filename TEXT NOT NULL,
          source_hash TEXT NOT NULL,
          access_key TEXT,
          schema_version TEXT,
          profile_version TEXT NOT NULL,
          status TEXT NOT NULL,
          authorization_code TEXT,
          authorization_label TEXT,
          issued_at TEXT,
          emitter_name TEXT,
          emitter_tax_id_hash TEXT,
          emitter_tax_id_masked TEXT,
          emitter_state TEXT,
          recipient_name TEXT,
          recipient_tax_id_hash TEXT,
          recipient_tax_id_masked TEXT,
          recipient_state TEXT,
          item_count INTEGER DEFAULT 0 NOT NULL,
          total_product_cents INTEGER,
          total_invoice_cents INTEGER,
          audit_json TEXT NOT NULL,
          comparison_json TEXT DEFAULT '{}' NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_document_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          document_id TEXT NOT NULL,
          workspace_id INTEGER NOT NULL,
          actor_user_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          note TEXT DEFAULT '' NOT NULL,
          event_data TEXT DEFAULT '{}' NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_homologation_cases (
          id TEXT PRIMARY KEY NOT NULL,
          workspace_id INTEGER NOT NULL,
          owner_user_id INTEGER NOT NULL,
          created_by_user_id INTEGER NOT NULL,
          assigned_reviewer_user_id INTEGER,
          decision_by_user_id INTEGER,
          title TEXT NOT NULL,
          question TEXT NOT NULL,
          topic_code TEXT NOT NULL,
          status TEXT DEFAULT 'draft' NOT NULL,
          assurance_level TEXT DEFAULT 'engine_verified' NOT NULL,
          base_code TEXT NOT NULL,
          base_version TEXT NOT NULL,
          base_hash TEXT NOT NULL,
          engine_version TEXT NOT NULL,
          snapshot_json TEXT NOT NULL,
          snapshot_hash TEXT NOT NULL,
          expected_json TEXT DEFAULT '{}' NOT NULL,
          comparison_outcome TEXT,
          independent_conclusion TEXT DEFAULT '' NOT NULL,
          professional_registration TEXT,
          review_note TEXT DEFAULT '' NOT NULL,
          due_at TEXT,
          decided_at TEXT,
          signature_version TEXT,
          decision_signature TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_homologation_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          case_id TEXT NOT NULL,
          workspace_id INTEGER NOT NULL,
          actor_user_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          note TEXT DEFAULT '' NOT NULL,
          event_data TEXT DEFAULT '{}' NOT NULL,
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
      "ALTER TABLE scenarios ADD COLUMN prepared_by_user_id INTEGER",
      "ALTER TABLE scenarios ADD COLUMN supersedes_scenario_id INTEGER",
    ];
    for (const statement of reliabilityColumns) {
      try {
        await env.DB.prepare(statement).run();
      } catch (error) {
        if (!String(error).toLowerCase().includes("duplicate column")) throw error;
      }
    }

    const workspaceColumns = [
      "ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'individual' NOT NULL",
      "ALTER TABLE users ADD COLUMN suggested_plan_key TEXT DEFAULT 'pro' NOT NULL",
      "ALTER TABLE companies ADD COLUMN workspace_id INTEGER",
    ];
    for (const statement of workspaceColumns) {
      try {
        await env.DB.prepare(statement).run();
      } catch (error) {
        if (!String(error).toLowerCase().includes("duplicate column")) throw error;
      }
    }

    await env.DB.prepare(`
      INSERT INTO accounting_workspaces (name, workspace_type, owner_user_id, suggested_plan_key)
      SELECT
        CASE WHEN users.account_type = 'office' THEN users.name || ' Contabilidade' ELSE 'Espaço profissional de ' || users.name END,
        CASE WHEN users.account_type = 'office' THEN 'office' ELSE 'individual' END,
        users.id,
        CASE WHEN users.account_type = 'office' THEN 'escritorio' ELSE 'pro' END
      FROM users
      WHERE NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.user_id = users.id)
        AND NOT EXISTS (SELECT 1 FROM accounting_workspaces WHERE accounting_workspaces.owner_user_id = users.id)
    `).run();
    await env.DB.prepare(`
      INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role, status)
      SELECT id, owner_user_id, 'owner', 'active' FROM accounting_workspaces
    `).run();
    await env.DB.prepare(`
      UPDATE companies
      SET workspace_id = (
        SELECT workspace_members.workspace_id FROM workspace_members
        WHERE workspace_members.user_id = companies.owner_user_id AND workspace_members.status = 'active'
        LIMIT 1
      )
      WHERE workspace_id IS NULL AND owner_user_id IS NOT NULL
    `).run();
    await env.DB.prepare(`
      UPDATE scenarios
      SET prepared_by_user_id = (
        SELECT companies.owner_user_id FROM companies WHERE companies.id = scenarios.company_id
      )
      WHERE prepared_by_user_id IS NULL
    `).run();

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
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS billing_transactions_provider_invoice_idx ON billing_transactions (provider_invoice_id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS billing_transactions_provider_payment_idx ON billing_transactions (provider_payment_id) WHERE provider_payment_id IS NOT NULL"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS billing_transactions_user_status_idx ON billing_transactions (user_id, status, approved_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS billing_transactions_account_created_idx ON billing_transactions (billing_account_id, created_at, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_issuances_transaction_idx ON fiscal_issuances (transaction_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_issuances_status_competence_idx ON fiscal_issuances (status, competence_month, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_issuances_user_created_idx ON fiscal_issuances (user_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_owner_user_id_idx ON audit_events (owner_user_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_company_id_idx ON audit_events (company_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_scenario_id_idx ON audit_events (scenario_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events (created_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS companies_owner_name_idx ON companies (owner_user_id, name)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS companies_workspace_name_idx ON companies (workspace_id, name)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS sessions_user_expires_idx ON sessions (user_id, expires_at)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS scenarios_request_key_idx ON scenarios (request_key) WHERE request_key IS NOT NULL"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenarios_company_created_idx ON scenarios (company_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenarios_prepared_by_idx ON scenarios (prepared_by_user_id, created_at, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS scenarios_supersedes_idx ON scenarios (supersedes_scenario_id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS accounting_workspaces_owner_idx ON accounting_workspaces (owner_user_id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members (user_id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_workspace_user_idx ON workspace_members (workspace_id, user_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_members_workspace_status_idx ON workspace_members (workspace_id, status, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_token_idx ON workspace_invitations (token_hash)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_invitations_workspace_status_idx ON workspace_invitations (workspace_id, status, created_at)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS scenario_approvals_scenario_idx ON scenario_approvals (scenario_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenario_approvals_owner_company_decided_idx ON scenario_approvals (owner_user_id, company_id, decided_at, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS scenario_review_rounds_scenario_idx ON scenario_review_rounds (scenario_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenario_review_rounds_workspace_status_due_idx ON scenario_review_rounds (workspace_id, status, due_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenario_review_rounds_reviewer_status_idx ON scenario_review_rounds (assigned_reviewer_user_id, status, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenario_review_rounds_company_created_idx ON scenario_review_rounds (company_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenario_review_comments_round_created_idx ON scenario_review_comments (review_round_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scenario_review_comments_workspace_scenario_idx ON scenario_review_comments (workspace_id, scenario_id, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_events_owner_company_created_idx ON audit_events (owner_user_id, company_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS report_shares_owner_company_created_idx ON report_shares (owner_user_id, company_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS report_shares_scenario_owner_idx ON report_shares (scenario_id, owner_user_id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_rule_sets_code_version_idx ON fiscal_rule_sets (code, version)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_rule_sets_status_effective_idx ON fiscal_rule_sets (status, effective_from, effective_to)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_reference_cases_rule_code_idx ON fiscal_reference_cases (rule_set_id, code)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_reference_cases_rule_set_idx ON fiscal_reference_cases (rule_set_id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_knowledge_bases_code_version_idx ON fiscal_knowledge_bases (code, version)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_knowledge_bases_status_checked_idx ON fiscal_knowledge_bases (status, checked_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_dossiers_workspace_status_created_idx ON fiscal_dossiers (workspace_id, status, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_dossiers_reviewer_status_due_idx ON fiscal_dossiers (assigned_reviewer_user_id, status, due_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_dossiers_company_created_idx ON fiscal_dossiers (company_id, created_at, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_dossiers_workspace_hash_idx ON fiscal_dossiers (workspace_id, input_hash)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_dossier_events_dossier_created_idx ON fiscal_dossier_events (dossier_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_dossier_events_workspace_created_idx ON fiscal_dossier_events (workspace_id, created_at, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_documents_workspace_hash_profile_idx ON fiscal_documents (workspace_id, source_hash, profile_version)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_documents_workspace_status_created_idx ON fiscal_documents (workspace_id, status, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_documents_workspace_access_key_idx ON fiscal_documents (workspace_id, access_key, created_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_documents_company_created_idx ON fiscal_documents (company_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_documents_dossier_created_idx ON fiscal_documents (dossier_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_document_events_document_created_idx ON fiscal_document_events (document_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_document_events_workspace_created_idx ON fiscal_document_events (workspace_id, created_at, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_homologation_workspace_snapshot_idx ON fiscal_homologation_cases (workspace_id, snapshot_hash)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_homologation_workspace_status_created_idx ON fiscal_homologation_cases (workspace_id, status, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_homologation_reviewer_status_due_idx ON fiscal_homologation_cases (assigned_reviewer_user_id, status, due_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_homologation_topic_status_idx ON fiscal_homologation_cases (topic_code, status, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_homologation_events_case_created_idx ON fiscal_homologation_events (case_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_homologation_events_workspace_created_idx ON fiscal_homologation_events (workspace_id, created_at, id)"),
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

    const knowledgeHash = await hashFiscalIntelligenceContent(fiscalIntelligenceSeed.contentJson);
    await env.DB.prepare(`
      INSERT OR IGNORE INTO fiscal_knowledge_bases (
        code, version, name, scope, status, content_json, content_hash, source_count, checked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fiscalIntelligenceSeed.code,
      fiscalIntelligenceSeed.version,
      fiscalIntelligenceSeed.name,
      fiscalIntelligenceSeed.scope,
      fiscalIntelligenceSeed.status,
      fiscalIntelligenceSeed.contentJson,
      knowledgeHash,
      fiscalIntelligenceSeed.sourceCount,
      fiscalIntelligenceSeed.checkedAt,
    ).run();

    const knowledgeBase = await env.DB.prepare(
      "SELECT content_hash FROM fiscal_knowledge_bases WHERE code = ? AND version = ?",
    ).bind(fiscalIntelligenceSeed.code, fiscalIntelligenceSeed.version).first<{ content_hash: string }>();
    if (!knowledgeBase) throw new Error("fiscal_knowledge_seed_unavailable");
    if (knowledgeBase.content_hash !== knowledgeHash) throw new Error("fiscal_knowledge_version_conflict");
  })();

  return scenarioSchemaReady.catch((error) => {
    scenarioSchemaReady = undefined;
    throw error;
  });
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

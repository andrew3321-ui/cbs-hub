CREATE TABLE IF NOT EXISTS monthly_closing_configs (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  due_day INTEGER NOT NULL DEFAULT 10,
  preparation_sla_hours INTEGER NOT NULL DEFAULT 72,
  review_sla_hours INTEGER NOT NULL DEFAULT 48,
  preparer_user_id INTEGER,
  reviewer_user_id INTEGER,
  required_document_count INTEGER NOT NULL DEFAULT 1,
  require_snapshot INTEGER NOT NULL DEFAULT 1,
  require_conclusion INTEGER NOT NULL DEFAULT 1,
  created_by_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS monthly_closing_configs_workspace_company_idx ON monthly_closing_configs(workspace_id, company_id);
CREATE INDEX IF NOT EXISTS monthly_closing_configs_workspace_active_idx ON monthly_closing_configs(workspace_id, active, company_id);

CREATE TABLE IF NOT EXISTS monthly_closing_cycles (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  period_key TEXT NOT NULL,
  report_id TEXT NOT NULL,
  config_id TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'preparation',
  due_at TEXT NOT NULL,
  preparation_due_at TEXT NOT NULL,
  review_due_at TEXT,
  delivered_at TEXT,
  decided_at TEXT,
  client_decision TEXT,
  client_note TEXT NOT NULL DEFAULT '',
  accepted_report_revision INTEGER,
  accepted_snapshot_hash TEXT,
  reopened_from_revision INTEGER,
  reopened_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS monthly_closing_cycles_workspace_company_period_idx ON monthly_closing_cycles(workspace_id, company_id, period_key);
CREATE INDEX IF NOT EXISTS monthly_closing_cycles_workspace_stage_due_idx ON monthly_closing_cycles(workspace_id, stage, due_at, id);
CREATE INDEX IF NOT EXISTS monthly_closing_cycles_report_idx ON monthly_closing_cycles(report_id, period_key);

CREATE TABLE IF NOT EXISTS monthly_closing_events (
  id TEXT PRIMARY KEY NOT NULL,
  cycle_id TEXT NOT NULL,
  workspace_id INTEGER NOT NULL,
  actor_type TEXT NOT NULL,
  actor_user_id INTEGER,
  event_type TEXT NOT NULL,
  event_data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS monthly_closing_events_cycle_created_idx ON monthly_closing_events(cycle_id, created_at, id);
CREATE INDEX IF NOT EXISTS monthly_closing_events_workspace_created_idx ON monthly_closing_events(workspace_id, created_at, id);

CREATE TABLE IF NOT EXISTS monthly_closing_reminders (
  id TEXT PRIMARY KEY NOT NULL,
  cycle_id TEXT NOT NULL,
  workspace_id INTEGER NOT NULL,
  reminder_kind TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  recipient_user_id INTEGER,
  status TEXT NOT NULL DEFAULT 'queued',
  created_by_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS monthly_closing_reminders_dedupe_idx ON monthly_closing_reminders(workspace_id, dedupe_key);
CREATE INDEX IF NOT EXISTS monthly_closing_reminders_cycle_created_idx ON monthly_closing_reminders(cycle_id, created_at, id);

CREATE TABLE IF NOT EXISTS monthly_closing_shares (
  id TEXT PRIMARY KEY NOT NULL,
  cycle_id TEXT NOT NULL,
  workspace_id INTEGER NOT NULL,
  report_id TEXT NOT NULL,
  report_revision INTEGER NOT NULL,
  snapshot_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  viewed_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  decision TEXT,
  decision_note TEXT NOT NULL DEFAULT '',
  decided_at TEXT,
  created_by_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS monthly_closing_shares_token_hash_idx ON monthly_closing_shares(token_hash);
CREATE INDEX IF NOT EXISTS monthly_closing_shares_cycle_created_idx ON monthly_closing_shares(cycle_id, created_at, id);


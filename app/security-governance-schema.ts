export async function ensureSecurityGovernanceSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS privacy_request_events (
      id TEXT PRIMARY KEY NOT NULL,
      subject_hash TEXT NOT NULL,
      workspace_hash TEXT,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      request_id TEXT NOT NULL,
      details_json TEXT DEFAULT '{}' NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      retain_until TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS privacy_request_events_subject_created_idx ON privacy_request_events (subject_hash, created_at, id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS privacy_request_events_retention_idx ON privacy_request_events (retain_until, id)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS security_incidents (
      id TEXT PRIMARY KEY NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'open' NOT NULL,
      summary TEXT NOT NULL,
      impact_summary TEXT DEFAULT '' NOT NULL,
      personal_data_involved INTEGER DEFAULT 0 NOT NULL,
      authority_notification TEXT DEFAULT 'pending_assessment' NOT NULL,
      data_subject_notification TEXT DEFAULT 'pending_assessment' NOT NULL,
      detected_at TEXT NOT NULL,
      contained_at TEXT,
      resolved_at TEXT,
      reported_by_user_id INTEGER,
      request_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      retain_until TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS security_incidents_status_severity_idx ON security_incidents (status, severity, detected_at, id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS security_incidents_retention_idx ON security_incidents (retain_until, id)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS security_incident_events (
      id TEXT PRIMARY KEY NOT NULL,
      incident_id TEXT NOT NULL,
      actor_user_id INTEGER,
      event_type TEXT NOT NULL,
      details_json TEXT DEFAULT '{}' NOT NULL,
      request_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS security_incident_events_incident_created_idx ON security_incident_events (incident_id, created_at, id)"),
  ]);
}

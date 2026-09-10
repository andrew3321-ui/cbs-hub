CREATE TABLE github_connections (
 id text PRIMARY KEY, workspace_id integer NOT NULL, installation_id integer NOT NULL UNIQUE,
 account_login text NOT NULL, status text NOT NULL DEFAULT 'active', created_by_user_id integer NOT NULL,
 created_at text NOT NULL, updated_at text NOT NULL
);
--> statement-breakpoint
CREATE TABLE github_oauth_states (
 state_hash text PRIMARY KEY, workspace_id integer NOT NULL, user_id integer NOT NULL,
 expires_at text NOT NULL, consumed_at text
);
--> statement-breakpoint
CREATE TABLE security_repositories (
 id text PRIMARY KEY, workspace_id integer NOT NULL, connection_id text NOT NULL,
 github_id integer NOT NULL, full_name text NOT NULL, default_branch text NOT NULL,
 enabled integer NOT NULL DEFAULT 0, monitoring_enabled integer NOT NULL DEFAULT 0, rescan_requested integer NOT NULL DEFAULT 0,
 authorized_until text NOT NULL, last_scan_at text, created_at text NOT NULL, updated_at text NOT NULL,
 UNIQUE(workspace_id, github_id)
);
--> statement-breakpoint
CREATE TABLE security_repository_jobs (
 id text PRIMARY KEY, workspace_id integer NOT NULL, repository_id text NOT NULL,
 commit_sha text, status text NOT NULL DEFAULT 'queued', trigger_kind text NOT NULL,
 coverage_json text NOT NULL DEFAULT '{}', error_code text, created_at text NOT NULL,
 started_at text, completed_at text
);
--> statement-breakpoint
CREATE UNIQUE INDEX security_repository_active_job ON security_repository_jobs(repository_id) WHERE status IN ('queued','running');
--> statement-breakpoint
CREATE TABLE security_repository_findings (
 id text PRIMARY KEY, workspace_id integer NOT NULL, repository_id text NOT NULL,
 fingerprint text NOT NULL, kind text NOT NULL, title text NOT NULL, severity text NOT NULL,
 file_path text NOT NULL, line integer NOT NULL DEFAULT 1, details_json text NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'open', source_job_id text NOT NULL, commit_sha text NOT NULL,
 first_observed_at text NOT NULL, last_observed_at text NOT NULL, resolved_at text,
 UNIQUE(repository_id, fingerprint)
);
--> statement-breakpoint
CREATE TABLE security_repository_fixes (
 id text PRIMARY KEY, workspace_id integer NOT NULL, repository_id text NOT NULL, finding_id text NOT NULL,
 base_sha text NOT NULL, status text NOT NULL DEFAULT 'draft', patch_json text NOT NULL,
 validation_json text NOT NULL, approved_by_user_id integer, approved_at text,
 external_pr_url text, external_pr_number integer, error_code text, created_at text NOT NULL, updated_at text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX security_repository_active_fix ON security_repository_fixes(finding_id) WHERE status IN ('draft','publishing','opened');
--> statement-breakpoint
CREATE TABLE security_repository_events (
 id text PRIMARY KEY, workspace_id integer NOT NULL, repository_id text, actor_user_id integer,
 event_type text NOT NULL, details_json text NOT NULL DEFAULT '{}', created_at text NOT NULL
);
--> statement-breakpoint
CREATE TABLE github_webhook_deliveries (id text PRIMARY KEY, event_type text NOT NULL, received_at text NOT NULL);
--> statement-breakpoint
CREATE INDEX security_repository_findings_workspace ON security_repository_findings(workspace_id, status, last_observed_at);
--> statement-breakpoint
CREATE INDEX security_repository_jobs_workspace ON security_repository_jobs(workspace_id, created_at);

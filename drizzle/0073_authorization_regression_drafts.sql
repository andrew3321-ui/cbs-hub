CREATE TABLE security_auth_regression_drafts (
  id text PRIMARY KEY NOT NULL,
  workspace_id integer NOT NULL,
  contract_id text NOT NULL,
  code_map_id text NOT NULL,
  repository_id text NOT NULL,
  base_sha text NOT NULL CHECK (length(base_sha) = 40),
  spec_sha256 text NOT NULL CHECK (length(spec_sha256) = 64),
  map_evidence_sha256 text NOT NULL CHECK (length(map_evidence_sha256) = 64),
  generator_version text NOT NULL,
  bundle_sha256 text NOT NULL CHECK (length(bundle_sha256) = 64),
  files_json text NOT NULL CHECK (length(files_json) <= 26000),
  created_by_user_id integer NOT NULL,
  created_at text NOT NULL,
  UNIQUE(workspace_id, code_map_id, generator_version)
);
--> statement-breakpoint
CREATE INDEX security_auth_regression_workspace ON security_auth_regression_drafts (workspace_id, repository_id, created_at);
--> statement-breakpoint
CREATE TRIGGER security_auth_regression_insert_guard BEFORE INSERT ON security_auth_regression_drafts
WHEN NOT EXISTS (
  SELECT 1 FROM security_auth_code_maps m
  JOIN security_auth_contracts c ON c.id = m.contract_id AND c.workspace_id = m.workspace_id
  JOIN security_agent_scopes s ON s.id = c.scope_id AND s.workspace_id = c.workspace_id
  JOIN security_repositories r ON r.id = m.repository_id AND r.workspace_id = m.workspace_id
  JOIN github_connections g ON g.id = r.connection_id AND g.workspace_id = r.workspace_id
  JOIN security_repository_jobs j ON j.id = (
    SELECT j2.id FROM security_repository_jobs j2 WHERE j2.workspace_id = r.workspace_id AND j2.repository_id = r.id AND j2.status = 'completed'
    ORDER BY j2.completed_at DESC, j2.id DESC LIMIT 1
  )
  WHERE m.id = NEW.code_map_id AND m.workspace_id = NEW.workspace_id AND m.status = 'completed'
    AND m.contract_id = NEW.contract_id AND m.repository_id = NEW.repository_id AND m.commit_sha = NEW.base_sha
    AND m.spec_sha256 = NEW.spec_sha256 AND c.spec_sha256 = NEW.spec_sha256 AND m.evidence_sha256 = NEW.map_evidence_sha256
    AND j.commit_sha = NEW.base_sha AND s.status = 'verified' AND g.status = 'active' AND r.enabled = 1
    AND julianday(s.authorization_expires_at) > julianday('now') AND julianday(r.authorized_until) > julianday('now')
)
BEGIN SELECT RAISE(ABORT, 'AUTH_REGRESSION_AUTHORIZATION_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER security_auth_regression_immutable BEFORE UPDATE OF id, workspace_id, contract_id, code_map_id, repository_id, base_sha, spec_sha256, map_evidence_sha256, generator_version, bundle_sha256, files_json, created_at ON security_auth_regression_drafts
BEGIN SELECT RAISE(ABORT, 'AUTH_REGRESSION_IMMUTABLE'); END;

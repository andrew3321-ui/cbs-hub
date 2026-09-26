CREATE TABLE security_auth_code_maps (
  id text PRIMARY KEY NOT NULL,
  workspace_id integer NOT NULL,
  contract_id text NOT NULL,
  repository_id text NOT NULL,
  source_job_id text NOT NULL,
  source_file text NOT NULL,
  route_pattern text NOT NULL,
  commit_sha text NOT NULL CHECK (length(commit_sha) = 40),
  spec_sha256 text NOT NULL CHECK (length(spec_sha256) = 64),
  policy_version text NOT NULL DEFAULT 'authorization-code-map.1',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  result_json text NOT NULL DEFAULT '{}' CHECK (length(result_json) <= 18000),
  evidence_sha256 text,
  error_code text,
  created_by_user_id integer NOT NULL,
  created_at text NOT NULL,
  completed_at text
);
--> statement-breakpoint
CREATE UNIQUE INDEX security_auth_code_maps_active_idx ON security_auth_code_maps (contract_id, repository_id, commit_sha, source_file, policy_version) WHERE status IN ('pending','completed');
--> statement-breakpoint
CREATE INDEX security_auth_code_maps_workspace_idx ON security_auth_code_maps (workspace_id, created_at);
--> statement-breakpoint
CREATE INDEX security_auth_code_maps_contract_idx ON security_auth_code_maps (contract_id, created_at);
--> statement-breakpoint
CREATE TRIGGER security_auth_code_maps_insert_guard BEFORE INSERT ON security_auth_code_maps
WHEN NOT EXISTS (
  SELECT 1 FROM security_auth_contracts c
  JOIN security_agent_scopes s ON s.id = c.scope_id AND s.workspace_id = c.workspace_id
  JOIN security_repositories r ON r.id = NEW.repository_id AND r.workspace_id = c.workspace_id
  JOIN github_connections g ON g.id = r.connection_id AND g.workspace_id = r.workspace_id
  JOIN security_repository_jobs j ON j.id = NEW.source_job_id AND j.repository_id = r.id AND j.workspace_id = r.workspace_id
  WHERE c.id = NEW.contract_id AND c.workspace_id = NEW.workspace_id AND c.spec_sha256 = NEW.spec_sha256
    AND j.commit_sha = NEW.commit_sha AND j.status = 'completed' AND r.enabled = 1 AND g.status = 'active'
    AND s.status = 'verified' AND julianday(s.authorization_expires_at) > julianday('now')
    AND julianday(r.authorized_until) > julianday('now')
)
BEGIN SELECT RAISE(ABORT, 'AUTH_CODE_MAP_AUTHORIZATION_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER security_auth_code_maps_complete_guard BEFORE UPDATE OF status ON security_auth_code_maps
WHEN NEW.status = 'completed' AND NOT EXISTS (
  SELECT 1 FROM security_auth_contracts c
  JOIN security_agent_scopes s ON s.id = c.scope_id AND s.workspace_id = c.workspace_id
  JOIN security_repositories r ON r.id = NEW.repository_id AND r.workspace_id = c.workspace_id
  JOIN github_connections g ON g.id = r.connection_id AND g.workspace_id = r.workspace_id
  JOIN security_repository_jobs j ON j.id = NEW.source_job_id AND j.repository_id = r.id AND j.workspace_id = r.workspace_id
  WHERE c.id = NEW.contract_id AND c.workspace_id = NEW.workspace_id AND c.spec_sha256 = NEW.spec_sha256
    AND j.commit_sha = NEW.commit_sha AND j.status = 'completed' AND r.enabled = 1 AND g.status = 'active'
    AND s.status = 'verified' AND julianday(s.authorization_expires_at) > julianday('now')
    AND julianday(r.authorized_until) > julianday('now')
)
BEGIN SELECT RAISE(ABORT, 'AUTH_CODE_MAP_AUTHORIZATION_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER security_auth_code_maps_binding_immutable BEFORE UPDATE OF id, workspace_id, contract_id, repository_id, source_job_id, source_file, route_pattern, commit_sha, spec_sha256, policy_version, created_at ON security_auth_code_maps
BEGIN SELECT RAISE(ABORT, 'AUTH_CODE_MAP_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER security_auth_code_maps_evidence_immutable BEFORE UPDATE OF status, result_json, evidence_sha256, error_code, completed_at ON security_auth_code_maps
WHEN OLD.status = 'completed'
BEGIN SELECT RAISE(ABORT, 'AUTH_CODE_MAP_IMMUTABLE'); END;

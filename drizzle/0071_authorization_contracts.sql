CREATE TABLE security_auth_contracts (
  id text PRIMARY KEY NOT NULL,
  workspace_id integer NOT NULL,
  scope_id text NOT NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 80),
  path text NOT NULL,
  review_mode text NOT NULL CHECK (review_mode IN ('vertical','horizontal')),
  marker_sha256 text NOT NULL CHECK (length(marker_sha256) = 64),
  spec_sha256 text NOT NULL CHECK (length(spec_sha256) = 64),
  spec_version text NOT NULL DEFAULT 'authorization-contract.1' CHECK (spec_version = 'authorization-contract.1'),
  expectation text NOT NULL DEFAULT 'anonymous_and_other_identity_denied' CHECK (expectation = 'anonymous_and_other_identity_denied'),
  baseline_review_id text NOT NULL,
  created_by_user_id integer NOT NULL,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, spec_sha256)
);
--> statement-breakpoint
CREATE INDEX security_auth_contracts_workspace_idx ON security_auth_contracts (workspace_id, created_at);
--> statement-breakpoint
ALTER TABLE security_auth_reviews ADD COLUMN contract_id text;
--> statement-breakpoint
CREATE INDEX security_auth_reviews_contract_idx ON security_auth_reviews (contract_id, created_at);
--> statement-breakpoint
CREATE TRIGGER security_auth_contracts_baseline_guard BEFORE INSERT ON security_auth_contracts
WHEN NOT EXISTS (
  SELECT 1 FROM security_auth_reviews r JOIN security_agent_scopes s ON s.id = r.scope_id AND s.workspace_id = r.workspace_id
  WHERE r.id = NEW.baseline_review_id AND r.workspace_id = NEW.workspace_id AND r.scope_id = NEW.scope_id
    AND r.path = NEW.path AND r.review_mode = NEW.review_mode AND r.marker_sha256 = NEW.marker_sha256
    AND r.status = 'completed' AND r.privileged_marker_observed = 1 AND r.anonymous_marker_observed = 0
    AND r.privileged_status BETWEEN 200 AND 299 AND r.anonymous_status IN (401,403)
    AND ((r.verdict = 'verified_test_marker_exposure' AND r.limited_status BETWEEN 200 AND 299 AND r.limited_marker_observed = 1)
      OR (r.verdict = 'access_restricted' AND r.limited_status IN (401,403) AND r.limited_marker_observed = 0))
    AND s.status = 'verified'
    AND julianday(s.authorization_expires_at) > julianday('now')
)
BEGIN SELECT RAISE(ABORT, 'AUTH_CONTRACT_BASELINE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER security_auth_contracts_immutable BEFORE UPDATE OF id, workspace_id, scope_id, path, review_mode, marker_sha256, spec_sha256, spec_version, expectation, baseline_review_id, created_at ON security_auth_contracts
BEGIN SELECT RAISE(ABORT, 'AUTH_CONTRACT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER security_auth_reviews_contract_guard BEFORE INSERT ON security_auth_reviews
WHEN NEW.contract_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM security_auth_contracts c WHERE c.id = NEW.contract_id AND c.workspace_id = NEW.workspace_id
    AND c.scope_id = NEW.scope_id AND c.path = NEW.path AND c.review_mode = NEW.review_mode AND c.marker_sha256 = NEW.marker_sha256
)
BEGIN SELECT RAISE(ABORT, 'AUTH_CONTRACT_EXECUTION_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER security_auth_reviews_contract_immutable BEFORE UPDATE OF contract_id, workspace_id, scope_id, path, review_mode, marker_sha256 ON security_auth_reviews
WHEN OLD.contract_id IS NOT NULL OR NEW.contract_id IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'AUTH_CONTRACT_EXECUTION_IMMUTABLE'); END;

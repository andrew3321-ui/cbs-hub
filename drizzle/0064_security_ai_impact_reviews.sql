CREATE TABLE security_ai_impact_reviews (
 id text PRIMARY KEY, workspace_id integer NOT NULL, repository_id text NOT NULL,
 campaign_id text NOT NULL, signal_code text NOT NULL, base_sha text NOT NULL,
 status text NOT NULL DEFAULT 'pending', model text, result_json text NOT NULL DEFAULT '{}',
 input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0,
 total_tokens integer NOT NULL DEFAULT 0, error_code text,
 created_by_user_id integer NOT NULL, created_at text NOT NULL, completed_at text,
 UNIQUE(workspace_id, repository_id, campaign_id, signal_code, base_sha)
);
--> statement-breakpoint
CREATE INDEX security_ai_impact_workspace_day ON security_ai_impact_reviews(workspace_id, created_at);

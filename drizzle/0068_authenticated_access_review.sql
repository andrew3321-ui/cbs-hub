CREATE TABLE `security_auth_reviews` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` integer NOT NULL,
  `scope_id` text NOT NULL,
  `actor_user_id` integer NOT NULL,
  `path` text NOT NULL,
  `bucket_start` text NOT NULL,
  `status` text DEFAULT 'running' NOT NULL CHECK (`status` IN ('running','executing','completed','failed')),
  `anonymous_status` integer,
  `limited_status` integer,
  `privileged_status` integer,
  `anonymous_marker_observed` integer,
  `limited_marker_observed` integer,
  `privileged_marker_observed` integer,
  `verdict` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_auth_reviews_scope_bucket_idx` ON `security_auth_reviews` (`scope_id`,`bucket_start`);
--> statement-breakpoint
CREATE INDEX `security_auth_reviews_workspace_idx` ON `security_auth_reviews` (`workspace_id`,`created_at`);

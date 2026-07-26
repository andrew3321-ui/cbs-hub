CREATE TABLE `privacy_request_events` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_hash` text NOT NULL,
	`workspace_hash` text,
	`action` text NOT NULL,
	`status` text NOT NULL,
	`request_id` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`retain_until` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `privacy_request_events_subject_created_idx` ON `privacy_request_events` (`subject_hash`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `privacy_request_events_retention_idx` ON `privacy_request_events` (`retain_until`,`id`);--> statement-breakpoint
CREATE TABLE `security_incident_events` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`request_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_incident_events_incident_created_idx` ON `security_incident_events` (`incident_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `security_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`severity` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`summary` text NOT NULL,
	`impact_summary` text DEFAULT '' NOT NULL,
	`personal_data_involved` integer DEFAULT false NOT NULL,
	`authority_notification` text DEFAULT 'pending_assessment' NOT NULL,
	`data_subject_notification` text DEFAULT 'pending_assessment' NOT NULL,
	`detected_at` text NOT NULL,
	`contained_at` text,
	`resolved_at` text,
	`reported_by_user_id` integer,
	`request_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`retain_until` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_incidents_status_severity_idx` ON `security_incidents` (`status`,`severity`,`detected_at`,`id`);--> statement-breakpoint
CREATE INDEX `security_incidents_retention_idx` ON `security_incidents` (`retain_until`,`id`);
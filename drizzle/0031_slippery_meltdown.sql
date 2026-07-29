CREATE TABLE `support_ticket_events` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`request_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `support_ticket_events_ticket_created_idx` ON `support_ticket_events` (`ticket_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`protocol` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`reporter_user_id` integer NOT NULL,
	`company_id` integer,
	`category` text NOT NULL,
	`module_code` text NOT NULL,
	`release_id` text NOT NULL,
	`release_tag` text NOT NULL,
	`trace_code` text,
	`subject` text NOT NULL,
	`description` text NOT NULL,
	`consent_version` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`response_due_at` text NOT NULL,
	`resolved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `support_tickets_protocol_idx` ON `support_tickets` (`protocol`);--> statement-breakpoint
CREATE INDEX `support_tickets_workspace_status_idx` ON `support_tickets` (`workspace_id`,`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `support_tickets_reporter_created_idx` ON `support_tickets` (`reporter_user_id`,`created_at`,`id`);
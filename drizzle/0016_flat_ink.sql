CREATE TABLE `fiscal_document_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`actor_user_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`event_data` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fiscal_document_events_document_created_idx` ON `fiscal_document_events` (`document_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_document_events_workspace_created_idx` ON `fiscal_document_events` (`workspace_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `fiscal_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`company_id` integer,
	`uploaded_by_user_id` integer NOT NULL,
	`dossier_id` text,
	`filename` text NOT NULL,
	`source_hash` text NOT NULL,
	`access_key` text,
	`schema_version` text,
	`profile_version` text NOT NULL,
	`status` text NOT NULL,
	`authorization_code` text,
	`authorization_label` text,
	`issued_at` text,
	`emitter_name` text,
	`emitter_tax_id_hash` text,
	`emitter_tax_id_masked` text,
	`emitter_state` text,
	`recipient_name` text,
	`recipient_tax_id_hash` text,
	`recipient_tax_id_masked` text,
	`recipient_state` text,
	`item_count` integer DEFAULT 0 NOT NULL,
	`total_product_cents` integer,
	`total_invoice_cents` integer,
	`audit_json` text NOT NULL,
	`comparison_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_documents_workspace_hash_profile_idx` ON `fiscal_documents` (`workspace_id`,`source_hash`,`profile_version`);--> statement-breakpoint
CREATE INDEX `fiscal_documents_workspace_status_created_idx` ON `fiscal_documents` (`workspace_id`,`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_documents_workspace_access_key_idx` ON `fiscal_documents` (`workspace_id`,`access_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `fiscal_documents_company_created_idx` ON `fiscal_documents` (`company_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_documents_dossier_created_idx` ON `fiscal_documents` (`dossier_id`,`created_at`,`id`);
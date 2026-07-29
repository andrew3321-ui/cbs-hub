CREATE TABLE `fiscal_issuance_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issuance_id` integer NOT NULL,
	`transaction_id` integer NOT NULL,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`reason_code` text,
	`note` text DEFAULT '' NOT NULL,
	`adapter_code` text DEFAULT 'manual' NOT NULL,
	`event_data_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fiscal_issuance_events_issuance_created_idx` ON `fiscal_issuance_events` (`issuance_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_issuance_events_transaction_created_idx` ON `fiscal_issuance_events` (`transaction_id`,`created_at`,`id`);--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `request_key` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `customer_tax_id_masked` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `customer_tax_id_hash` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `adapter_code` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `provider_document_id` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `verification_url` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `pdf_reference` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `pdf_sha256` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `xml_reference` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `xml_sha256` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `failure_code` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `failure_reason` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `canceled_at` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `cancel_reason` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `last_attempt_at` text;--> statement-breakpoint
ALTER TABLE `fiscal_issuances` ADD `attempt_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `fiscal_issuances` SET `request_key` = 'fiscal:' || `transaction_id` WHERE `request_key` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_issuances_request_key_idx` ON `fiscal_issuances` (`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_issuances_provider_document_idx` ON `fiscal_issuances` (`adapter_code`,`provider_document_id`);

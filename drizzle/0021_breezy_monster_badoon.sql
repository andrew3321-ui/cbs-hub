CREATE TABLE `billing_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`billing_account_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`provider` text DEFAULT 'mercado_pago' NOT NULL,
	`provider_invoice_id` text NOT NULL,
	`provider_payment_id` text,
	`external_reference` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`status_detail` text DEFAULT '' NOT NULL,
	`gross_amount_cents` integer NOT NULL,
	`fee_amount_cents` integer,
	`net_amount_cents` integer,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`payment_method` text,
	`approved_at` text,
	`provider_summary_json` text DEFAULT '{}' NOT NULL,
	`last_synced_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_transactions_provider_invoice_idx` ON `billing_transactions` (`provider_invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_transactions_provider_payment_idx` ON `billing_transactions` (`provider_payment_id`);--> statement-breakpoint
CREATE INDEX `billing_transactions_user_status_idx` ON `billing_transactions` (`user_id`,`status`,`approved_at`);--> statement-breakpoint
CREATE INDEX `billing_transactions_account_created_idx` ON `billing_transactions` (`billing_account_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `fiscal_issuances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`customer_type` text DEFAULT 'unknown' NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`customer_tax_id` text,
	`note_requested` integer DEFAULT false NOT NULL,
	`service_code` text,
	`service_description` text NOT NULL,
	`competence_month` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending_data' NOT NULL,
	`nfse_number` text,
	`nfse_key` text,
	`issued_at` text,
	`internal_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_issuances_transaction_idx` ON `fiscal_issuances` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `fiscal_issuances_status_competence_idx` ON `fiscal_issuances` (`status`,`competence_month`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_issuances_user_created_idx` ON `fiscal_issuances` (`user_id`,`created_at`,`id`);
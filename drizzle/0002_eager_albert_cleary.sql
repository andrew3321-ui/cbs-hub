CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cnpj` text,
	`tax_regime` text NOT NULL,
	`sector` text DEFAULT 'Serviços' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `scenarios` ADD `company_id` integer DEFAULT 1 NOT NULL;
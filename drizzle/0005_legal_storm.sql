CREATE TABLE `billing_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`plan_key` text DEFAULT 'beta' NOT NULL,
	`provider` text DEFAULT 'mercado_pago' NOT NULL,
	`external_reference` text NOT NULL,
	`provider_subscription_id` text,
	`status` text DEFAULT 'beta' NOT NULL,
	`checkout_url` text,
	`next_payment_at` text,
	`last_synced_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_accounts_user_id_unique` ON `billing_accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_accounts_external_reference_unique` ON `billing_accounts` (`external_reference`);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `fixed_costs_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `volume_loss_bps` integer DEFAULT 0 NOT NULL;
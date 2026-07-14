CREATE TABLE `scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`revenue_cents` integer NOT NULL,
	`current_rate_bps` integer NOT NULL,
	`new_rate_bps` integer NOT NULL,
	`cost_rate_bps` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

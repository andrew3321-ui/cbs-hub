ALTER TABLE `scenarios` ADD `signature_version` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `record_signature` text;
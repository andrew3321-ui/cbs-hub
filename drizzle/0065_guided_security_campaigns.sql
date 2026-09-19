ALTER TABLE `security_campaigns` ADD COLUMN `auto_dispatch` integer DEFAULT 0 NOT NULL CHECK (`auto_dispatch` IN (0, 1));
--> statement-breakpoint
ALTER TABLE `security_campaigns` ADD COLUMN `guided` integer DEFAULT 0 NOT NULL CHECK (`guided` IN (0, 1));
--> statement-breakpoint
CREATE INDEX `security_campaigns_auto_dispatch_idx` ON `security_campaigns` (`auto_dispatch`, `status`, `window_start`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_campaigns_active_guided_scope_idx` ON `security_campaigns` (`scope_id`) WHERE `guided` = 1 AND `status` IN ('approved','queued','running');

ALTER TABLE `users` ADD `first_name` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `username` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `account_code` text;
--> statement-breakpoint
UPDATE `users`
SET `first_name` = CASE
  WHEN instr(trim(`name`), ' ') > 0 THEN substr(trim(`name`), 1, instr(trim(`name`), ' ') - 1)
  ELSE trim(`name`)
END,
`username` = 'profissional-' || printf('%05d', `id`),
`account_code` = 'CBS-' || printf('%010X', `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_account_code_unique` ON `users` (`account_code`);

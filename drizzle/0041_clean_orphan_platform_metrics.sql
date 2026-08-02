UPDATE `trial_device_claims`
SET `user_id` = NULL,
    `workspace_id` = NULL,
    `status` = 'retained_antifraud'
WHERE `user_id` IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM `users`
     WHERE `users`.`id` = `trial_device_claims`.`user_id`
   );--> statement-breakpoint
UPDATE `platform_metric_events`
SET `user_id` = NULL
WHERE `user_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `users`
    WHERE `users`.`id` = `platform_metric_events`.`user_id`
  );

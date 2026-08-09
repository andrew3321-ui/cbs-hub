UPDATE `users`
SET `suggested_plan_key` = CASE
  WHEN `account_type` = 'office' THEN 'escritorio'
  ELSE 'pro'
END
WHERE `suggested_plan_key` = 'unico'
  AND NOT EXISTS (
    SELECT 1
    FROM `billing_accounts`
    WHERE `billing_accounts`.`user_id` = `users`.`id`
      AND `billing_accounts`.`plan_key` = 'unico'
      AND `billing_accounts`.`status` IN ('active', 'renewal_pending', 'pending')
  );
--> statement-breakpoint
UPDATE `accounting_workspaces`
SET `suggested_plan_key` = CASE
  WHEN `workspace_type` = 'office' THEN 'escritorio'
  ELSE 'pro'
END
WHERE `suggested_plan_key` = 'unico'
  AND NOT EXISTS (
    SELECT 1
    FROM `billing_accounts`
    WHERE `billing_accounts`.`user_id` = `accounting_workspaces`.`owner_user_id`
      AND `billing_accounts`.`plan_key` = 'unico'
      AND `billing_accounts`.`status` IN ('active', 'renewal_pending', 'pending')
  );

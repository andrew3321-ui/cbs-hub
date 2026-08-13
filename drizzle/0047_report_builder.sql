ALTER TABLE `report_work_items` ADD COLUMN `template_key` text DEFAULT 'monthly-pme' NOT NULL;
ALTER TABLE `report_work_items` ADD COLUMN `template_version` integer DEFAULT 1 NOT NULL CHECK (`template_version` > 0);
ALTER TABLE `report_work_items` ADD COLUMN `blocks_json` text DEFAULT '[]' NOT NULL;
ALTER TABLE `report_work_items` ADD COLUMN `commercial_notes` text DEFAULT '' NOT NULL;
ALTER TABLE `report_work_items` ADD COLUMN `recommendations_json` text DEFAULT '[]' NOT NULL;

CREATE TABLE `report_templates` (
  `id` text PRIMARY KEY NOT NULL, `workspace_id` integer NOT NULL, `name` text NOT NULL,
  `service_type` text NOT NULL, `client_type` text NOT NULL, `blocks_json` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL CHECK (`version` > 0), `created_by_user_id` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `report_templates_workspace_name_idx` ON `report_templates` (`workspace_id`,`name`);
CREATE INDEX `report_templates_workspace_service_idx` ON `report_templates` (`workspace_id`,`service_type`,`client_type`,`updated_at`);

CREATE TABLE `report_workspace_branding` (
  `workspace_id` integer PRIMARY KEY NOT NULL, `branding_json` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL CHECK (`version` > 0), `updated_by_user_id` integer NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `report_approvals` (
  `id` text PRIMARY KEY NOT NULL, `report_id` text NOT NULL, `workspace_id` integer NOT NULL,
  `revision` integer NOT NULL, `snapshot_hash` text NOT NULL, `reviewer_user_id` integer NOT NULL,
  `reviewer_name` text NOT NULL, `professional_registration` text NOT NULL,
  `signature_version` text NOT NULL, `approval_signature` text NOT NULL, `decided_at` text NOT NULL
);
CREATE UNIQUE INDEX `report_approvals_report_revision_idx` ON `report_approvals` (`report_id`,`revision`);
CREATE INDEX `report_approvals_workspace_decided_idx` ON `report_approvals` (`workspace_id`,`decided_at`,`id`);

CREATE TABLE `report_exports` (
  `id` text PRIMARY KEY NOT NULL, `report_id` text NOT NULL, `workspace_id` integer NOT NULL,
  `revision` integer NOT NULL, `snapshot_hash` text NOT NULL, `template_key` text NOT NULL,
  `template_version` integer NOT NULL, `pdf_sha256` text NOT NULL, `created_by_user_id` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX `report_exports_report_revision_idx` ON `report_exports` (`report_id`,`revision`,`created_at`,`id`);
CREATE INDEX `report_exports_workspace_created_idx` ON `report_exports` (`workspace_id`,`created_at`,`id`);

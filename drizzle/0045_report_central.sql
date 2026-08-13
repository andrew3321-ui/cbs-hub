CREATE TABLE `report_work_items` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` integer NOT NULL,
  `company_id` integer NOT NULL,
  `period_key` text NOT NULL,
  `created_by_user_id` integer NOT NULL,
  `assigned_user_id` integer,
  `reviewer_user_id` integer,
  `status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','ready_for_review','changes_requested','approved')),
  `revision` integer DEFAULT 1 NOT NULL CHECK (`revision` > 0),
  `executive_summary` text DEFAULT '' NOT NULL,
  `conclusion` text DEFAULT '' NOT NULL,
  `indicators_json` text DEFAULT '{}' NOT NULL,
  `pending_items_json` text DEFAULT '[]' NOT NULL,
  `snapshot_hash` text,
  `due_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CHECK (`period_key` GLOB '[1-2][0-9][0-9][0-9]-[0-1][0-9]')
);
CREATE UNIQUE INDEX `report_work_items_workspace_company_period_idx` ON `report_work_items` (`workspace_id`,`company_id`,`period_key`);
CREATE INDEX `report_work_items_workspace_status_period_idx` ON `report_work_items` (`workspace_id`,`status`,`period_key`,`id`);
CREATE INDEX `report_work_items_workspace_assignee_idx` ON `report_work_items` (`workspace_id`,`assigned_user_id`,`status`,`id`);
CREATE INDEX `report_work_items_workspace_reviewer_idx` ON `report_work_items` (`workspace_id`,`reviewer_user_id`,`status`,`id`);

CREATE TABLE `report_work_item_links` (
  `id` text PRIMARY KEY NOT NULL,
  `report_id` text NOT NULL,
  `workspace_id` integer NOT NULL,
  `company_id` integer NOT NULL,
  `artifact_type` text NOT NULL CHECK (`artifact_type` IN ('document','dossier','tax_period','rule_set','scenario')),
  `artifact_id` text NOT NULL,
  `artifact_label` text NOT NULL,
  `artifact_hash` text NOT NULL,
  `artifact_version` text,
  `artifact_status` text NOT NULL,
  `created_by_user_id` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `report_work_item_links_report_artifact_idx` ON `report_work_item_links` (`report_id`,`artifact_type`,`artifact_id`);
CREATE INDEX `report_work_item_links_workspace_report_idx` ON `report_work_item_links` (`workspace_id`,`report_id`,`created_at`,`id`);

CREATE TABLE `report_work_item_revisions` (
  `id` text PRIMARY KEY NOT NULL,
  `report_id` text NOT NULL,
  `workspace_id` integer NOT NULL,
  `company_id` integer NOT NULL,
  `period_key` text NOT NULL,
  `revision` integer NOT NULL,
  `snapshot_json` text NOT NULL,
  `snapshot_hash` text NOT NULL,
  `created_by_user_id` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `report_work_item_revisions_report_revision_idx` ON `report_work_item_revisions` (`report_id`,`revision`);
CREATE INDEX `report_work_item_revisions_workspace_report_idx` ON `report_work_item_revisions` (`workspace_id`,`report_id`,`revision`);

CREATE TABLE `report_work_item_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `report_id` text NOT NULL,
  `workspace_id` integer NOT NULL,
  `actor_user_id` integer NOT NULL,
  `event_type` text NOT NULL,
  `note` text DEFAULT '' NOT NULL,
  `event_data` text DEFAULT '{}' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX `report_work_item_events_report_created_idx` ON `report_work_item_events` (`report_id`,`created_at`,`id`);
CREATE INDEX `report_work_item_events_workspace_created_idx` ON `report_work_item_events` (`workspace_id`,`created_at`,`id`);

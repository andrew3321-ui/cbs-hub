CREATE TABLE `spreadsheet_import_profiles` (
  `id` text PRIMARY KEY NOT NULL, `workspace_id` integer NOT NULL, `name` text NOT NULL,
  `model` text NOT NULL, `column_mapping_json` text NOT NULL, `created_by_user_id` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `spreadsheet_import_profiles_workspace_name_idx` ON `spreadsheet_import_profiles` (`workspace_id`,`name`);
CREATE INDEX `spreadsheet_import_profiles_workspace_model_idx` ON `spreadsheet_import_profiles` (`workspace_id`,`model`,`updated_at`,`id`);

CREATE TABLE `spreadsheet_import_batches` (
  `id` text PRIMARY KEY NOT NULL, `workspace_id` integer NOT NULL, `company_id` integer NOT NULL,
  `period_key` text NOT NULL, `profile_id` text, `created_by_user_id` integer NOT NULL,
  `filename` text NOT NULL, `format` text NOT NULL CHECK (`format` IN ('csv','xlsx')), `source_hash` text NOT NULL,
  `model` text NOT NULL, `status` text DEFAULT 'committed' NOT NULL CHECK (`status` IN ('committed','rolled_back')),
  `total_rows` integer NOT NULL, `accepted_rows` integer NOT NULL, `invalid_rows` integer NOT NULL,
  `duplicate_rows` integer NOT NULL, `divergent_rows` integer NOT NULL, `formula_cells_discarded` integer NOT NULL,
  `raw_file_persisted` integer DEFAULT 0 NOT NULL CHECK (`raw_file_persisted` = 0),
  `report_json` text NOT NULL, `rolled_back_at` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CHECK (`period_key` GLOB '[1-2][0-9][0-9][0-9]-[0-1][0-9]')
);
CREATE INDEX `spreadsheet_import_batches_workspace_source_idx` ON `spreadsheet_import_batches` (`workspace_id`,`company_id`,`period_key`,`source_hash`,`status`);
CREATE INDEX `spreadsheet_import_batches_workspace_company_period_idx` ON `spreadsheet_import_batches` (`workspace_id`,`company_id`,`period_key`,`created_at`,`id`);

CREATE TABLE `spreadsheet_import_rows` (
  `id` text PRIMARY KEY NOT NULL, `batch_id` text NOT NULL, `workspace_id` integer NOT NULL, `company_id` integer NOT NULL,
  `period_key` text NOT NULL, `row_number` integer NOT NULL, `document_key` text NOT NULL, `record_type` text NOT NULL,
  `normalized_json` text NOT NULL, `evidence_hash` text NOT NULL,
  `status` text NOT NULL CHECK (`status` IN ('accepted','invalid','duplicate','divergent')),
  `issues_json` text NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `spreadsheet_import_rows_batch_row_idx` ON `spreadsheet_import_rows` (`batch_id`,`row_number`);
CREATE INDEX `spreadsheet_import_rows_reconcile_idx` ON `spreadsheet_import_rows` (`workspace_id`,`company_id`,`period_key`,`document_key`,`record_type`);

CREATE TABLE `spreadsheet_import_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `batch_id` text NOT NULL, `workspace_id` integer NOT NULL,
  `actor_user_id` integer NOT NULL, `event_type` text NOT NULL, `event_data` text DEFAULT '{}' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX `spreadsheet_import_events_batch_created_idx` ON `spreadsheet_import_events` (`batch_id`,`created_at`,`id`);
CREATE INDEX `spreadsheet_import_events_workspace_created_idx` ON `spreadsheet_import_events` (`workspace_id`,`created_at`,`id`);

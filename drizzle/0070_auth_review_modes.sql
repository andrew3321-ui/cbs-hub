ALTER TABLE `security_auth_reviews` ADD COLUMN `review_mode` text DEFAULT 'vertical' NOT NULL CHECK (`review_mode` IN ('vertical','horizontal'));

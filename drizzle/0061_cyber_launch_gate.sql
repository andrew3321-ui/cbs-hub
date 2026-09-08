INSERT INTO `platform_settings` (`key`, `value`, `revision`, `updated_at`)
VALUES ('cyber_launch_gate_enabled', 'true', 1, CURRENT_TIMESTAMP)
ON CONFLICT(`key`) DO NOTHING;

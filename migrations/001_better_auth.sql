-- Better Auth schema migration for Diadem.
-- Targets upgrades from main schema.
--
-- Usage:
--   mysql -u <user> -p <database> < migrations/001_better_auth.sql
--
-- Fresh installs should use drizzle `db:push`.

SET @db_name = DATABASE();

-- user: add Better Auth columns while keeping app-owned permissions/settings.
SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'user'
				AND column_name = 'name'
		),
		'SELECT 1',
		'ALTER TABLE `user` ADD COLUMN `name` VARCHAR(255) NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'user'
				AND column_name = 'email'
		),
		'SELECT 1',
		'ALTER TABLE `user` ADD COLUMN `email` VARCHAR(255) NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'user'
				AND column_name = 'email_verified'
		),
		'SELECT 1',
		'ALTER TABLE `user` ADD COLUMN `email_verified` BOOLEAN NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'user'
				AND column_name = 'image'
		),
		'SELECT 1',
		'ALTER TABLE `user` ADD COLUMN `image` TEXT NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'user'
				AND column_name = 'created_at'
		),
		'SELECT 1',
		'ALTER TABLE `user` ADD COLUMN `created_at` DATETIME NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'user'
				AND column_name = 'updated_at'
		),
		'SELECT 1',
		'ALTER TABLE `user` ADD COLUMN `updated_at` DATETIME NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `user`
SET
	`name` = CASE
		WHEN `name` IS NULL OR `name` = '' THEN CONCAT('discord-', `discord_id`)
		ELSE `name`
	END,
	`email` = CASE
		WHEN `email` IS NULL OR `email` = '' THEN CONCAT(`discord_id`, '@discord.diadem.local')
		ELSE `email`
	END,
	`email_verified` = COALESCE(`email_verified`, TRUE),
	`created_at` = COALESCE(`created_at`, NOW()),
	`updated_at` = COALESCE(`updated_at`, NOW());

ALTER TABLE `user`
	MODIFY COLUMN `name` VARCHAR(255) NOT NULL,
	MODIFY COLUMN `email` VARCHAR(255) NOT NULL,
	MODIFY COLUMN `email_verified` BOOLEAN NOT NULL,
	MODIFY COLUMN `created_at` DATETIME NOT NULL,
	MODIFY COLUMN `updated_at` DATETIME NOT NULL;

ALTER TABLE `user`
	MODIFY COLUMN `permissions` JSON NULL,
	MODIFY COLUMN `user_settings` JSON NULL;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.statistics
			WHERE table_schema = @db_name
				AND table_name = 'user'
				AND index_name = 'user_email_unique'
		),
		'SELECT 1',
		'ALTER TABLE `user` ADD UNIQUE INDEX `user_email_unique` (`email`)'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- session: reuse table for Better Auth session shape.
SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND column_name = 'token'
		),
		'SELECT 1',
		'ALTER TABLE `session` ADD COLUMN `token` VARCHAR(255) NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND column_name = 'ip_address'
		),
		'SELECT 1',
		'ALTER TABLE `session` ADD COLUMN `ip_address` TEXT NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND column_name = 'user_agent'
		),
		'SELECT 1',
		'ALTER TABLE `session` ADD COLUMN `user_agent` TEXT NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND column_name = 'created_at'
		),
		'SELECT 1',
		'ALTER TABLE `session` ADD COLUMN `created_at` DATETIME NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND column_name = 'updated_at'
		),
		'SELECT 1',
		'ALTER TABLE `session` ADD COLUMN `updated_at` DATETIME NULL'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Old sessions are incompatible with Better Auth cookies/tokens.
DELETE FROM `session`;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND column_name = 'discord_token'
		),
		'ALTER TABLE `session` DROP COLUMN `discord_token`',
		'SELECT 1'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND column_name = 'discord_refresh_token'
		),
		'ALTER TABLE `session` DROP COLUMN `discord_refresh_token`',
		'SELECT 1'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND column_name = 'discord_last_refresh'
		),
		'ALTER TABLE `session` DROP COLUMN `discord_last_refresh`',
		'SELECT 1'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `session`
SET
	`token` = COALESCE(`token`, `id`),
	`created_at` = COALESCE(`created_at`, NOW()),
	`updated_at` = COALESCE(`updated_at`, NOW());

ALTER TABLE `session`
	MODIFY COLUMN `token` VARCHAR(255) NOT NULL,
	MODIFY COLUMN `created_at` DATETIME NOT NULL,
	MODIFY COLUMN `updated_at` DATETIME NOT NULL;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.statistics
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND index_name = 'session_token_unique'
		),
		'SELECT 1',
		'ALTER TABLE `session` ADD UNIQUE INDEX `session_token_unique` (`token`)'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.statistics
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND index_name = 'session_user_id_idx'
		),
		'SELECT 1',
		'ALTER TABLE `session` ADD INDEX `session_user_id_idx` (`user_id`)'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.statistics
			WHERE table_schema = @db_name
				AND table_name = 'session'
				AND index_name = 'session_expires_at_idx'
		),
		'SELECT 1',
		'ALTER TABLE `session` ADD INDEX `session_expires_at_idx` (`expires_at`)'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `account` (
	`id` VARCHAR(255) NOT NULL,
	`account_id` VARCHAR(255) NOT NULL,
	`provider_id` VARCHAR(255) NOT NULL,
	`user_id` VARCHAR(255) NOT NULL,
	`access_token` TEXT,
	`refresh_token` TEXT,
	`id_token` TEXT,
	`access_token_expires_at` DATETIME,
	`refresh_token_expires_at` DATETIME,
	`scope` TEXT,
	`password` TEXT,
	`created_at` DATETIME NOT NULL,
	`updated_at` DATETIME NOT NULL,
	PRIMARY KEY (`id`),
	UNIQUE KEY `account_provider_account_unique` (`provider_id`, `account_id`),
	KEY `account_user_id_idx` (`user_id`),
	CONSTRAINT `account_user_id_user_id_fk`
		FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
);

CREATE TABLE IF NOT EXISTS `verification` (
	`id` VARCHAR(255) NOT NULL,
	`identifier` VARCHAR(255) NOT NULL,
	`value` TEXT NOT NULL,
	`expires_at` DATETIME NOT NULL,
	`created_at` DATETIME NOT NULL,
	`updated_at` DATETIME NOT NULL,
	PRIMARY KEY (`id`),
	KEY `verification_identifier_idx` (`identifier`),
	KEY `verification_expires_at_idx` (`expires_at`)
);

ALTER TABLE `verification` MODIFY COLUMN `value` TEXT NOT NULL;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.statistics
			WHERE table_schema = @db_name
				AND table_name = 'account'
				AND index_name = 'account_provider_account_unique'
		),
		'SELECT 1',
		'ALTER TABLE `account` ADD UNIQUE INDEX `account_provider_account_unique` (`provider_id`, `account_id`)'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.statistics
			WHERE table_schema = @db_name
				AND table_name = 'account'
				AND index_name = 'account_user_id_idx'
		),
		'SELECT 1',
		'ALTER TABLE `account` ADD INDEX `account_user_id_idx` (`user_id`)'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.key_column_usage
			WHERE table_schema = @db_name
				AND table_name = 'account'
				AND column_name = 'user_id'
				AND referenced_table_name = 'user'
				AND referenced_column_name = 'id'
		),
		'SELECT 1',
		'ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.statistics
			WHERE table_schema = @db_name
				AND table_name = 'verification'
				AND index_name = 'verification_identifier_idx'
		),
		'SELECT 1',
		'ALTER TABLE `verification` ADD INDEX `verification_identifier_idx` (`identifier`)'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (
	SELECT IF(
		EXISTS(
			SELECT 1
			FROM information_schema.statistics
			WHERE table_schema = @db_name
				AND table_name = 'verification'
				AND index_name = 'verification_expires_at_idx'
		),
		'SELECT 1',
		'ALTER TABLE `verification` ADD INDEX `verification_expires_at_idx` (`expires_at`)'
	)
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

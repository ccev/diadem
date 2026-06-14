CREATE TABLE `account` (
	`id` varchar(255) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime,
	`refresh_token_expires_at` datetime,
	`scope` text,
	`password` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_provider_account_unique` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(255) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user` MODIFY COLUMN `user_settings` json;--> statement-breakpoint
ALTER TABLE `session` ADD `token` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD `ip_address` text;--> statement-breakpoint
ALTER TABLE `session` ADD `user_agent` text;--> statement-breakpoint
ALTER TABLE `session` ADD `created_at` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD `updated_at` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `email` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `email_verified` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `image` text;--> statement-breakpoint
ALTER TABLE `user` ADD `created_at` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `updated_at` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_token_unique` UNIQUE(`token`);--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `verification_expires_at_idx` ON `verification` (`expires_at`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_expires_at_idx` ON `session` (`expires_at`);--> statement-breakpoint
ALTER TABLE `session` DROP COLUMN `discord_token`;--> statement-breakpoint
ALTER TABLE `session` DROP COLUMN `discord_refresh_token`;--> statement-breakpoint
ALTER TABLE `session` DROP COLUMN `discord_last_refresh`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `permissions`;
CREATE TABLE IF NOT EXISTS `session` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`discord_token` varchar(255) NOT NULL,
	`discord_refresh_token` varchar(255) NOT NULL,
	`discord_last_refresh` datetime NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user` (
	`id` varchar(255) NOT NULL,
	`discord_id` varchar(255) NOT NULL,
	`permissions` json NOT NULL,
	`user_settings` json NOT NULL,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_discord_id_unique` UNIQUE(`discord_id`)
);
--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY IF NOT EXISTS (`user_id`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
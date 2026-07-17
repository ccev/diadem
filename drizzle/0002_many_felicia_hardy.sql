CREATE TABLE `connected_accounts` (
	`user_id` varchar(255) NOT NULL,
	`friend_code` varchar(12) NOT NULL,
	`last_updated` datetime NOT NULL,
	`state` enum('active','pending','inactive') NOT NULL,
	`team` int NOT NULL,
	`level` int NOT NULL,
	`nickname` varchar(255) NOT NULL,
	CONSTRAINT `connected_accounts_user_id_friend_code_pk` PRIMARY KEY(`user_id`,`friend_code`)
);
--> statement-breakpoint
ALTER TABLE `connected_accounts` ADD CONSTRAINT `connected_accounts_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;
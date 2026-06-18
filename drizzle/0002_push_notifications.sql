CREATE TABLE `push_subscription` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`endpoint` text NOT NULL,
	`endpoint_hash` varchar(64) NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`failure_count` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `push_subscription_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscription_endpoint_hash_unique` UNIQUE(`endpoint_hash`)
);
--> statement-breakpoint
ALTER TABLE `user` ADD `push_alerts` json;--> statement-breakpoint
ALTER TABLE `push_subscription` ADD CONSTRAINT `push_subscription_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `push_subscription_user_id_idx` ON `push_subscription` (`user_id`);
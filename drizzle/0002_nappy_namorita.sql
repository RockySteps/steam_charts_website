CREATE TABLE `crawl_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` varchar(64) NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`total_games` int DEFAULT 0,
	`success_count` int DEFAULT 0,
	`failed_count` int DEFAULT 0,
	`skipped_count` int DEFAULT 0,
	`status` enum('running','completed','stopped','failed') NOT NULL DEFAULT 'running',
	`trigger_type` enum('startup','scheduled','manual','admin') NOT NULL DEFAULT 'manual',
	`notes` text,
	CONSTRAINT `crawl_log_id` PRIMARY KEY(`id`),
	CONSTRAINT `crawl_log_job_id_unique` UNIQUE(`job_id`)
);
--> statement-breakpoint
CREATE TABLE `crawl_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appid` int NOT NULL,
	`priority` int NOT NULL DEFAULT 2,
	`status` enum('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
	`retry_count` int NOT NULL DEFAULT 0,
	`last_crawled_at` timestamp,
	`next_crawl_at` timestamp,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crawl_queue_id` PRIMARY KEY(`id`),
	CONSTRAINT `crawl_queue_appid_unique` UNIQUE(`appid`)
);
--> statement-breakpoint
CREATE TABLE `monthly_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appid` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`avg_players` float DEFAULT 0,
	`peak_players` int DEFAULT 0,
	`min_players` int DEFAULT 0,
	`gain` float DEFAULT 0,
	`gain_percent` float DEFAULT 0,
	`data_points` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `game_cache` ADD `review_summary` varchar(256);--> statement-breakpoint
ALTER TABLE `game_cache` ADD `review_type` varchar(64);
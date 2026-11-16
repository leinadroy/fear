CREATE TABLE `activity_materials` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`field_activity_id` bigint unsigned NOT NULL,
	`material_id` bigint unsigned NOT NULL,
	`quantity` decimal(12,2) NOT NULL,
	`notes` varchar(255),
	CONSTRAINT `activity_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_photos` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`field_activity_id` bigint unsigned NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`caption` varchar(255),
	`taken_at` datetime,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_types` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `activity_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_types_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`contact_person` varchar(100),
	`phone` varchar(30),
	`email` varchar(150),
	`address` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `field_activities` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`work_order_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`check_in_at` datetime NOT NULL,
	`check_in_lat` decimal(10,7),
	`check_in_lng` decimal(10,7),
	`check_out_at` datetime,
	`check_out_lat` decimal(10,7),
	`check_out_lng` decimal(10,7),
	`status` enum('ongoing','done','failed') NOT NULL DEFAULT 'ongoing',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`),
	CONSTRAINT `materials_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`customer_id` bigint unsigned NOT NULL,
	`code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`address` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `sites_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(150) NOT NULL,
	`phone` varchar(30),
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','supervisor','engineer') NOT NULL DEFAULT 'engineer',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `work_order_assignees` (
	`work_order_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`role` enum('lead','member') NOT NULL DEFAULT 'member',
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `work_order_assignees_work_order_id_user_id_pk` PRIMARY KEY(`work_order_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`wo_number` varchar(30) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`site_id` bigint unsigned NOT NULL,
	`activity_type_id` bigint unsigned NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('draft','assigned','in_progress','on_hold','completed','cancelled') NOT NULL DEFAULT 'draft',
	`scheduled_start` datetime,
	`scheduled_end` datetime,
	`completed_at` datetime,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `work_orders_wo_number_unique` UNIQUE(`wo_number`)
);
--> statement-breakpoint
ALTER TABLE `activity_materials` ADD CONSTRAINT `activity_materials_field_activity_id_field_activities_id_fk` FOREIGN KEY (`field_activity_id`) REFERENCES `field_activities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_materials` ADD CONSTRAINT `activity_materials_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_photos` ADD CONSTRAINT `activity_photos_field_activity_id_field_activities_id_fk` FOREIGN KEY (`field_activity_id`) REFERENCES `field_activities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_activities` ADD CONSTRAINT `field_activities_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_activities` ADD CONSTRAINT `field_activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sites` ADD CONSTRAINT `sites_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_assignees` ADD CONSTRAINT `work_order_assignees_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_assignees` ADD CONSTRAINT `work_order_assignees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_activity_type_id_activity_types_id_fk` FOREIGN KEY (`activity_type_id`) REFERENCES `activity_types`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `am_activity_idx` ON `activity_materials` (`field_activity_id`);--> statement-breakpoint
CREATE INDEX `ap_activity_idx` ON `activity_photos` (`field_activity_id`);--> statement-breakpoint
CREATE INDEX `fa_wo_idx` ON `field_activities` (`work_order_id`);--> statement-breakpoint
CREATE INDEX `fa_user_checkin_idx` ON `field_activities` (`user_id`,`check_in_at`);--> statement-breakpoint
CREATE INDEX `sites_customer_idx` ON `sites` (`customer_id`);--> statement-breakpoint
CREATE INDEX `woa_user_idx` ON `work_order_assignees` (`user_id`);--> statement-breakpoint
CREATE INDEX `wo_site_idx` ON `work_orders` (`site_id`);--> statement-breakpoint
CREATE INDEX `wo_status_idx` ON `work_orders` (`status`);--> statement-breakpoint
CREATE INDEX `wo_scheduled_idx` ON `work_orders` (`scheduled_start`);
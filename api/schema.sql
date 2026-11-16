-- Skema database FEAR (MySQL 5.7+ / MariaDB 10.3+). Aman dijalankan ulang (IF NOT EXISTS).
-- Semua kolom waktu berisi UTC.

CREATE TABLE IF NOT EXISTS `users` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`name` varchar(100) NOT NULL,
	`email` varchar(150) NOT NULL,
	`phone` varchar(30) DEFAULT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','supervisor','engineer') NOT NULL DEFAULT 'engineer',
	`is_active` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `sessions_user_idx` (`user_id`),
	CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `login_attempts` (
	`id` varchar(64) NOT NULL,
	`failures` int unsigned NOT NULL DEFAULT 0,
	`reset_at` datetime NOT NULL,
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`contact_person` varchar(100) DEFAULT NULL,
	`phone` varchar(30) DEFAULT NULL,
	`email` varchar(150) DEFAULT NULL,
	`address` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `customers_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sites` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`customer_id` bigint unsigned NOT NULL,
	`code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`address` text,
	`latitude` decimal(10,7) DEFAULT NULL,
	`longitude` decimal(10,7) DEFAULT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `sites_code_unique` (`code`),
	KEY `sites_customer_idx` (`customer_id`),
	CONSTRAINT `sites_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_types` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` tinyint(1) NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	UNIQUE KEY `activity_types_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `materials` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `materials_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `work_orders` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`wo_number` varchar(30) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`site_id` bigint unsigned NOT NULL,
	`activity_type_id` bigint unsigned NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('draft','assigned','in_progress','on_hold','completed','cancelled') NOT NULL DEFAULT 'draft',
	`scheduled_start` datetime DEFAULT NULL,
	`scheduled_end` datetime DEFAULT NULL,
	`completed_at` datetime DEFAULT NULL,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `work_orders_wo_number_unique` (`wo_number`),
	KEY `wo_site_idx` (`site_id`),
	KEY `wo_status_idx` (`status`),
	KEY `wo_scheduled_idx` (`scheduled_start`),
	CONSTRAINT `work_orders_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`),
	CONSTRAINT `work_orders_activity_type_id_activity_types_id_fk` FOREIGN KEY (`activity_type_id`) REFERENCES `activity_types` (`id`),
	CONSTRAINT `work_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `work_order_assignees` (
	`work_order_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`role` enum('lead','member') NOT NULL DEFAULT 'member',
	`assigned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`work_order_id`, `user_id`),
	KEY `woa_user_idx` (`user_id`),
	CONSTRAINT `work_order_assignees_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
	CONSTRAINT `work_order_assignees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `field_activities` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`work_order_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`check_in_at` datetime NOT NULL,
	`check_in_lat` decimal(10,7) DEFAULT NULL,
	`check_in_lng` decimal(10,7) DEFAULT NULL,
	`check_out_at` datetime DEFAULT NULL,
	`check_out_lat` decimal(10,7) DEFAULT NULL,
	`check_out_lng` decimal(10,7) DEFAULT NULL,
	`status` enum('ongoing','done','failed') NOT NULL DEFAULT 'ongoing',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `fa_wo_idx` (`work_order_id`),
	KEY `fa_user_checkin_idx` (`user_id`, `check_in_at`),
	CONSTRAINT `field_activities_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
	CONSTRAINT `field_activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_photos` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`field_activity_id` bigint unsigned NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`caption` varchar(255) DEFAULT NULL,
	`taken_at` datetime DEFAULT NULL,
	`latitude` decimal(10,7) DEFAULT NULL,
	`longitude` decimal(10,7) DEFAULT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `ap_activity_idx` (`field_activity_id`),
	CONSTRAINT `activity_photos_field_activity_id_field_activities_id_fk` FOREIGN KEY (`field_activity_id`) REFERENCES `field_activities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_materials` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT,
	`field_activity_id` bigint unsigned NOT NULL,
	`material_id` bigint unsigned NOT NULL,
	`quantity` decimal(12,2) NOT NULL,
	`notes` varchar(255) DEFAULT NULL,
	PRIMARY KEY (`id`),
	KEY `am_activity_idx` (`field_activity_id`),
	CONSTRAINT `activity_materials_field_activity_id_field_activities_id_fk` FOREIGN KEY (`field_activity_id`) REFERENCES `field_activities` (`id`) ON DELETE CASCADE,
	CONSTRAINT `activity_materials_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data master awal (tidak menimpa data yang sudah ada).
INSERT IGNORE INTO `activity_types` (`code`, `name`, `description`) VALUES
	('INST', 'Instalasi', 'Pemasangan perangkat/jaringan baru'),
	('PM', 'Preventive Maintenance', 'Perawatan rutin terjadwal'),
	('CM', 'Corrective Maintenance', 'Perbaikan kerusakan'),
	('SURV', 'Survey', 'Survei lokasi sebelum pekerjaan'),
	('TS', 'Troubleshooting', 'Analisa dan penanganan gangguan'),
	('DISM', 'Dismantle', 'Pembongkaran perangkat');

INSERT IGNORE INTO `materials` (`code`, `name`, `unit`) VALUES
	('CBL-UTP6', 'Kabel UTP Cat6', 'meter'),
	('CBL-FO', 'Kabel Fiber Optik', 'meter'),
	('CON-RJ45', 'Konektor RJ45', 'pcs'),
	('PTC-SC', 'Patch Cord SC-SC', 'pcs'),
	('CBL-TIE', 'Cable Tie', 'pack');

CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_sessions_user_idx` ON `admin_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`failed_logins` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`last_login_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `availability_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	CONSTRAINT "availability_rules_day" CHECK("availability_rules"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "availability_rules_order" CHECK("availability_rules"."start_time" < "availability_rules"."end_time")
);
--> statement-breakpoint
CREATE INDEX `availability_rules_day_idx` ON `availability_rules` (`day_of_week`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer,
	`service_name` text NOT NULL,
	`price_cents` integer,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`preferred_date` text,
	`start_at` text,
	`end_at` text,
	`status` text NOT NULL,
	`manage_token_hash` text NOT NULL,
	`manage_token_enc` text NOT NULL,
	`google_event_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "bookings_status" CHECK("bookings"."status" IN ('pending','quote_requested','confirmed','declined','cancelled','completed')),
	CONSTRAINT "bookings_times" CHECK(("bookings"."start_at" IS NULL) = ("bookings"."end_at" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `bookings_start_idx` ON `bookings` (`start_at`);--> statement-breakpoint
CREATE INDEX `bookings_status_idx` ON `bookings` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_manage_token_idx` ON `bookings` (`manage_token_hash`);--> statement-breakpoint
CREATE TABLE `integrations` (
	`provider` text PRIMARY KEY NOT NULL,
	`credentials` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'connected' NOT NULL,
	`last_error` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`duration_minutes` integer NOT NULL,
	`price_cents` integer,
	`price_label` text DEFAULT '' NOT NULL,
	`requires_quote` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`business_name` text NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`logo_url` text DEFAULT '' NOT NULL,
	`contact_email` text DEFAULT '' NOT NULL,
	`contact_phone` text DEFAULT '' NOT NULL,
	`notification_email` text DEFAULT '' NOT NULL,
	`timezone` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`color_accent` text DEFAULT '#1f4d3a' NOT NULL,
	`color_background` text DEFAULT '#f7f5f0' NOT NULL,
	`color_text` text DEFAULT '#1c1b19' NOT NULL,
	`font_family` text DEFAULT 'instrument' NOT NULL,
	`slot_interval_minutes` integer DEFAULT 30 NOT NULL,
	`buffer_minutes` integer DEFAULT 0 NOT NULL,
	`min_notice_hours` integer DEFAULT 12 NOT NULL,
	`max_advance_days` integer DEFAULT 90 NOT NULL,
	`require_approval` integer DEFAULT true NOT NULL,
	`show_powered_by` integer DEFAULT false NOT NULL,
	`booking_policy` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "settings_single_row" CHECK("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `time_off` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "time_off_order" CHECK("time_off"."start_date" <= "time_off"."end_date")
);

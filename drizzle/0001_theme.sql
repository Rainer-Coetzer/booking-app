ALTER TABLE `settings` ADD `color_scheme` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `cover_image_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `settings` SET `font_family` = 'geist' WHERE `font_family` IN ('instrument', 'fraunces');

CREATE TABLE `elements` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`emoji` text,
	`image_path` text,
	`prompt_hint` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))
);
--> statement-breakpoint
CREATE TABLE `heroes` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`emoji` text,
	`image_path` text,
	`prompt_hint` text NOT NULL,
	`image_hint` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))
);
--> statement-breakpoint
ALTER TABLE `stories` ADD `hero_snapshots` text;--> statement-breakpoint
ALTER TABLE `stories` ADD `element_snapshots` text;
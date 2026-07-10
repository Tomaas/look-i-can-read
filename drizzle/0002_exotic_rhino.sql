CREATE TABLE `places` (
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
ALTER TABLE `stories` ADD `custom_prompt` text;--> statement-breakpoint
ALTER TABLE `stories` ADD `place_label` text;--> statement-breakpoint
ALTER TABLE `stories` ADD `place_prompt_hint` text;
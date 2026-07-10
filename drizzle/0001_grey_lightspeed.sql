CREATE TABLE `story_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`idx` integer NOT NULL,
	`paragraphs` text NOT NULL,
	`image_path` text,
	`choices` text,
	`chosen_choice_id` text,
	`pending_choice_id` text,
	`status` text DEFAULT 'complete' NOT NULL,
	`error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%d %H:%M:%S.000+00', 'now')),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `story_segments_story_idx` ON `story_segments` (`story_id`,`idx`);--> statement-breakpoint
ALTER TABLE `stories` ADD `mode` text DEFAULT 'classic' NOT NULL;
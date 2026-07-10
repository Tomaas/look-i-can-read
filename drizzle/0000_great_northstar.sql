CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`lang` text DEFAULT 'fr' NOT NULL,
	`hero_id` text NOT NULL,
	`place_id` text NOT NULL,
	`element_id` text NOT NULL,
	`title` text NOT NULL,
	`paragraphs` text NOT NULL,
	`image_path` text,
	`audio_path` text,
	`kept` text DEFAULT '1' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))
);

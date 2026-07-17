CREATE TABLE `math_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`skill` text NOT NULL,
	`palier` text NOT NULL,
	`serie_size` integer DEFAULT 3 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `math_skills_skill_idx` ON `math_skills` (`skill`);
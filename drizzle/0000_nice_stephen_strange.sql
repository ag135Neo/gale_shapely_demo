CREATE TABLE `ai_scores` (
	`project_id` text NOT NULL,
	`netid` text NOT NULL,
	`core_stack` integer NOT NULL,
	`architecture` integer NOT NULL,
	`domain` integer NOT NULL,
	`evidence_json` text NOT NULL,
	`missing_information_json` text NOT NULL,
	`run_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `netid`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`netid`) REFERENCES `candidates`(`netid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ai_scores_project` ON `ai_scores` (`project_id`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`detail_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_events_entity` ON `audit_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `candidate_profiles` (
	`netid` text PRIMARY KEY NOT NULL,
	`source_fingerprint` text NOT NULL,
	`profile_json` text NOT NULL,
	`model` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`netid`) REFERENCES `candidates`(`netid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`netid` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`grade` text NOT NULL,
	`resume_url` text NOT NULL,
	`application_json` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`roster_version` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `engineer_preferences` (
	`netid` text PRIMARY KEY NOT NULL,
	`project_order_json` text NOT NULL,
	`finalized` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`netid`) REFERENCES `candidates`(`netid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lead_rankings` (
	`project_id` text NOT NULL,
	`netid` text NOT NULL,
	`position` integer,
	`acceptable` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `netid`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`netid`) REFERENCES `candidates`(`netid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lead_rankings_project_position` ON `lead_rankings` (`project_id`,`position`);--> statement-breakpoint
CREATE TABLE `matching_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`input_hash` text NOT NULL,
	`result_json` text NOT NULL,
	`email_status` text DEFAULT 'not_sent' NOT NULL,
	`resend_id` text,
	`created_at` integer NOT NULL,
	`locked_at` integer
);
--> statement-breakpoint
CREATE TABLE `placements` (
	`run_id` text NOT NULL,
	`netid` text NOT NULL,
	`project_id` text NOT NULL,
	`source` text NOT NULL,
	`overridden_unacceptable` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`run_id`, `netid`),
	FOREIGN KEY (`run_id`) REFERENCES `matching_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`netid`) REFERENCES `candidates`(`netid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_placements_project` ON `placements` (`run_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`account_username` text NOT NULL,
	`name` text NOT NULL,
	`contact_persons` text NOT NULL,
	`project_manager` text NOT NULL,
	`tech_lead` text NOT NULL,
	`description` text NOT NULL,
	`prd_url` text NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`ranking_finalized` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_account_username_unique` ON `projects` (`account_username`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`subject` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_subject` ON `sessions` (`role`,`subject`);
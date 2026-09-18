CREATE TABLE "ai_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"status" text NOT NULL,
	"roster_version" text NOT NULL,
	"project_version" integer NOT NULL,
	"error" text,
	"warnings_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_scores" (
	"project_id" text NOT NULL,
	"netid" text NOT NULL,
	"core_stack" integer NOT NULL,
	"architecture" integer NOT NULL,
	"domain" integer NOT NULL,
	"total_basis_points" integer NOT NULL,
	"evidence_json" text NOT NULL,
	"missing_information_json" text NOT NULL,
	"run_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ai_scores_project_id_netid_pk" PRIMARY KEY("project_id","netid")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"detail_json" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_profiles" (
	"netid" text PRIMARY KEY NOT NULL,
	"source_fingerprint" text NOT NULL,
	"profile_json" text NOT NULL,
	"model" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"netid" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"grade" text NOT NULL,
	"resume_url" text NOT NULL,
	"application_json" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"roster_version" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engineer_preferences" (
	"netid" text PRIMARY KEY NOT NULL,
	"project_order_json" text NOT NULL,
	"finalized" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_rankings" (
	"project_id" text NOT NULL,
	"netid" text NOT NULL,
	"position" integer,
	"acceptable" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lead_rankings_project_id_netid_pk" PRIMARY KEY("project_id","netid")
);
--> statement-breakpoint
CREATE TABLE "matching_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"input_hash" text NOT NULL,
	"result_json" text NOT NULL,
	"email_status" text DEFAULT 'not_sent' NOT NULL,
	"resend_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"locked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "placements" (
	"run_id" text NOT NULL,
	"netid" text NOT NULL,
	"project_id" text NOT NULL,
	"source" text NOT NULL,
	"overridden_unacceptable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "placements_run_id_netid_pk" PRIMARY KEY("run_id","netid")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"account_username" text NOT NULL,
	"name" text NOT NULL,
	"contact_persons" text NOT NULL,
	"project_manager" text NOT NULL,
	"tech_lead" text NOT NULL,
	"description" text NOT NULL,
	"prd_url" text NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"ranking_finalized" boolean DEFAULT false NOT NULL,
	"ranking_roster_version" text,
	"ranking_project_version" integer,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "projects_account_username_unique" UNIQUE("account_username")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"subject" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_scores" ADD CONSTRAINT "ai_scores_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_scores" ADD CONSTRAINT "ai_scores_netid_candidates_netid_fk" FOREIGN KEY ("netid") REFERENCES "public"."candidates"("netid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_scores" ADD CONSTRAINT "ai_scores_run_id_ai_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_netid_candidates_netid_fk" FOREIGN KEY ("netid") REFERENCES "public"."candidates"("netid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineer_preferences" ADD CONSTRAINT "engineer_preferences_netid_candidates_netid_fk" FOREIGN KEY ("netid") REFERENCES "public"."candidates"("netid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_rankings" ADD CONSTRAINT "lead_rankings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_rankings" ADD CONSTRAINT "lead_rankings_netid_candidates_netid_fk" FOREIGN KEY ("netid") REFERENCES "public"."candidates"("netid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_run_id_matching_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."matching_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_netid_candidates_netid_fk" FOREIGN KEY ("netid") REFERENCES "public"."candidates"("netid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_runs_project" ON "ai_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_ai_scores_project" ON "ai_scores" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_entity" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_lead_rankings_project_position" ON "lead_rankings" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "idx_placements_project" ON "placements" USING btree ("run_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_subject" ON "sessions" USING btree ("role","subject");
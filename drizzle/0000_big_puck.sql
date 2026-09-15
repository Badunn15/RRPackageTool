CREATE TABLE "scenario_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"rev" integer NOT NULL,
	"doc" jsonb NOT NULL,
	"note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"doc" jsonb NOT NULL,
	"schema" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rev" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scenario_versions" ADD CONSTRAINT "scenario_versions_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_versions_scenario_id_rev_key" ON "scenario_versions" USING btree ("scenario_id","rev");--> statement-breakpoint
CREATE INDEX "scenario_versions_scenario_id_rev_desc_idx" ON "scenario_versions" USING btree ("scenario_id","rev" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scenarios_active_idx" ON "scenarios" USING btree ("archived_at") WHERE "scenarios"."archived_at" is null;
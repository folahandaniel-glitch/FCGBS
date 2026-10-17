CREATE TABLE "hard_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"summary" text,
	"exegetical" text,
	"genealogical" text,
	"archaeological" text,
	"apostolic" text,
	"prophetic" text,
	"theological" text,
	"views" text,
	"pastoral" text,
	"scriptures" text,
	"readings" text,
	"featured" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hard_questions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "hard_questions_cat_idx" ON "hard_questions" USING btree ("category","sort");--> statement-breakpoint
CREATE INDEX "hard_questions_status_idx" ON "hard_questions" USING btree ("status");
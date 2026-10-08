CREATE TABLE "bible_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"kind" text DEFAULT 'NOTE' NOT NULL,
	"color" text,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'URL' NOT NULL,
	"description" text,
	"course_id" uuid,
	"teaching_id" uuid,
	"asset_id" uuid,
	"url" text,
	"audience" text DEFAULT 'STUDENTS' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teaching_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text,
	"description" text,
	"colour" text DEFAULT 'royal' NOT NULL,
	"icon" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teaching_tracks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "teachings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text,
	"scriptures" text,
	"level" text DEFAULT 'FOUNDATION' NOT NULL,
	"minutes" integer DEFAULT 10 NOT NULL,
	"author" text,
	"audio_url" text,
	"video_url" text,
	"audio_asset_id" uuid,
	"image_asset_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"audience" text DEFAULT 'PUBLIC' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teachings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "bible_notes" ADD CONSTRAINT "bible_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_teaching_id_teachings_id_fk" FOREIGN KEY ("teaching_id") REFERENCES "public"."teachings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachings" ADD CONSTRAINT "teachings_track_id_teaching_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."teaching_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bible_notes_user_idx" ON "bible_notes" USING btree ("user_id","book","chapter");--> statement-breakpoint
CREATE INDEX "materials_course_idx" ON "materials" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "materials_teaching_idx" ON "materials" USING btree ("teaching_id");--> statement-breakpoint
CREATE INDEX "teachings_track_idx" ON "teachings" USING btree ("track_id","sort");--> statement-breakpoint
CREATE INDEX "teachings_status_idx" ON "teachings" USING btree ("status");
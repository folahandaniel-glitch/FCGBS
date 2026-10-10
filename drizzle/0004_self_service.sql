CREATE TABLE "enrolment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"programme_id" uuid,
	"course_id" uuid,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"student_note" text,
	"admin_note" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrolment_requests" ADD CONSTRAINT "enrolment_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_requests" ADD CONSTRAINT "enrolment_requests_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_requests" ADD CONSTRAINT "enrolment_requests_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrolment_requests_user_idx" ON "enrolment_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "enrolment_requests_status_idx" ON "enrolment_requests" USING btree ("status","created_at");
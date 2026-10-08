CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'SUSPENDED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INTERVIEW_REQUIRED', 'ACCEPTED', 'CONDITIONALLY_ACCEPTED', 'WAITLISTED', 'REJECTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."assessment_kind" AS ENUM('ASSIGNMENT', 'TEST', 'QUIZ', 'EXAM', 'PRACTICAL');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('DRAFT', 'PUBLISHED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."certificate_status" AS ENUM('PENDING', 'VALID', 'REVOKED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."enrolment_status" AS ENUM('ACTIVE', 'COMPLETED', 'WITHDRAWN', 'TRANSFERRED', 'DEFERRED');--> statement-breakpoint
CREATE TYPE "public"."graduation_status" AS ENUM('ELIGIBLE', 'REGISTRAR_APPROVED', 'BOARD_APPROVED', 'GRADUATED', 'CERTIFICATE_ISSUED', 'DEFERRED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('MCQ', 'TRUE_FALSE', 'MULTI', 'SHORT', 'ESSAY', 'MATCHING');--> statement-breakpoint
CREATE TYPE "public"."registration_source" AS ENUM('REGISTERED', 'EXEMPTION', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('PENDING', 'APPROVED', 'DROPPED', 'COMPLETED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."result_status" AS ENUM('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'PUBLISHED', 'LOCKED');--> statement-breakpoint
CREATE TYPE "public"."academic_standing" AS ENUM('GOOD_STANDING', 'ACADEMIC_WARNING', 'ACADEMIC_PROBATION', 'SUSPENDED', 'WITHDRAWN', 'GRADUATING', 'GRADUATED');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'WITHDRAWN', 'GRADUATED');--> statement-breakpoint
CREATE TYPE "public"."transcript_status" AS ENUM('DRAFT', 'APPROVED', 'ISSUED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('SUPER_ADMIN', 'STAFF', 'STUDENT', 'APPLICANT', 'ALUMNI');--> statement-breakpoint
CREATE TABLE "academic_appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"decided_by" uuid,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "academic_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"admission_deadline" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_sessions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "academic_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ordinal" integer DEFAULT 1 NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"registration_opens" date,
	"registration_closes" date,
	"exams_start" date,
	"exams_end" date,
	"is_current" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"prompt" text NOT NULL,
	"provider" text,
	"model" text,
	"status" text DEFAULT 'OK' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alumni_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"graduation_year" integer,
	"ministry" text,
	"location" text,
	"bio" text,
	"public_profile" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alumni_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_no" text NOT NULL,
	"user_id" uuid NOT NULL,
	"programme_id" uuid NOT NULL,
	"session_id" uuid,
	"campus_id" uuid,
	"status" "application_status" DEFAULT 'DRAFT' NOT NULL,
	"personal" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"education" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ministry_background" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"references_list" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"statement" text,
	"submitted_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_notes" text,
	"interview_at" timestamp with time zone,
	"decision_by" uuid,
	"decision_at" timestamp with time zone,
	"decision_note" text,
	"conditions" text,
	"offer_accepted_at" timestamp with time zone,
	"registered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_application_no_unique" UNIQUE("application_no")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"kind" "assessment_kind" NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"max_score" numeric(6, 1) DEFAULT 100 NOT NULL,
	"opens_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"time_limit_min" integer,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"shuffle" boolean DEFAULT true NOT NULL,
	"pool" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"late_allowed" boolean DEFAULT false NOT NULL,
	"late_penalty_pct" integer DEFAULT 10 NOT NULL,
	"resubmission" boolean DEFAULT false NOT NULL,
	"ai_policy" text DEFAULT 'DISCLOSE' NOT NULL,
	"status" "assessment_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"data" "bytea" NOT NULL,
	"alt" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"owner_id" uuid,
	"scope_ref" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"session_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"status" text DEFAULT 'PRESENT' NOT NULL,
	CONSTRAINT "attendance_records_session_id_registration_id_pk" PRIMARY KEY("session_id","registration_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"held_on" date NOT NULL,
	"kind" text DEFAULT 'LECTURE' NOT NULL,
	"topic" text,
	"taken_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_type" text DEFAULT 'SYSTEM' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"summary" text,
	"metadata" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"ref_type" text,
	"ref_id" text,
	"title" text NOT NULL,
	"decision" text NOT NULL,
	"notes" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"country" text,
	"timezone" text,
	"is_online" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campuses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"verify_token" text NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"graduation_id" uuid NOT NULL,
	"award_title" text NOT NULL,
	"holder_name" text NOT NULL,
	"programme_name" text NOT NULL,
	"award_date" date NOT NULL,
	"cgpa" numeric(3, 2),
	"classification" text,
	"status" "certificate_status" DEFAULT 'VALID' NOT NULL,
	"issued_by" uuid,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoked_reason" text,
	"superseded_by_id" uuid,
	CONSTRAINT "certificates_number_unique" UNIQUE("number"),
	CONSTRAINT "certificates_verify_token_unique" UNIQUE("verify_token")
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_blocks_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"offering_id" uuid,
	"course_id" uuid NOT NULL,
	"status" "registration_status" DEFAULT 'APPROVED' NOT NULL,
	"source" "registration_source" DEFAULT 'REGISTERED' NOT NULL,
	"is_repeat" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_relations" (
	"course_id" uuid NOT NULL,
	"related_course_id" uuid NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "course_relations_course_id_related_course_id_kind_pk" PRIMARY KEY("course_id","related_course_id","kind")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"department_id" uuid,
	"level_rank" integer DEFAULT 1 NOT NULL,
	"credits" integer DEFAULT 2 NOT NULL,
	"contact_hours" integer DEFAULT 30 NOT NULL,
	"category" text DEFAULT 'GENERAL' NOT NULL,
	"objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"readings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"practical_requirements" text,
	"ministry_requirements" text,
	"attendance_min_pct" integer DEFAULT 70 NOT NULL,
	"assessment_weights" jsonb DEFAULT '{"assignment":20,"test":20,"exam":60,"practical":0}'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"hod_user_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "discussion_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"course_id" uuid,
	"parent_id" uuid,
	"user_id" uuid NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'VISIBLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"body_html" text,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "enrolments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"programme_id" uuid NOT NULL,
	"start_session_id" uuid,
	"status" "enrolment_status" DEFAULT 'ACTIVE' NOT NULL,
	"standing" "academic_standing" DEFAULT 'GOOD_STANDING' NOT NULL,
	"started_on" date DEFAULT current_date NOT NULL,
	"completed_on" date,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"offering_id" uuid,
	"programme_id" uuid,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"ratings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"auto_score" numeric(6, 1),
	"manual_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"final_score" numeric(6, 1),
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ip" text,
	"graded_by" uuid
);
--> statement-breakpoint
CREATE TABLE "formation_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"entry_on" date DEFAULT current_date NOT NULL,
	"reflection" text NOT NULL,
	"shared_with_mentor" boolean DEFAULT false NOT NULL,
	"mentor_id" uuid,
	"mentor_response" text,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graduations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"session_id" uuid,
	"status" "graduation_status" DEFAULT 'ELIGIBLE' NOT NULL,
	"eligibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"registrar_by" uuid,
	"registrar_at" timestamp with time zone,
	"board_by" uuid,
	"board_at" timestamp with time zone,
	"graduated_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "graduations_enrolment_id_unique" UNIQUE("enrolment_id")
);
--> statement-breakpoint
CREATE TABLE "integrity_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_no" text NOT NULL,
	"kind" text NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid,
	"reported_by" uuid,
	"description" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'REPORTED' NOT NULL,
	"investigator_id" uuid,
	"decision" text,
	"sanction" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"appeal_note" text,
	"appeal_decision" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integrity_cases_case_no_unique" UNIQUE("case_no")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'UNPAID' NOT NULL,
	"due_on" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text,
	"video_url" text,
	"audio_url" text,
	"asset_id" uuid,
	"read_minutes" integer DEFAULT 8 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"authority" text DEFAULT 'ACADEMIC' NOT NULL,
	"status" "content_status" DEFAULT 'PUBLISHED' NOT NULL,
	"author_id" uuid,
	"approved_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"category" text DEFAULT 'General' NOT NULL,
	"publisher" text,
	"year" integer,
	"isbn" text,
	"resource_type" text DEFAULT 'BOOK' NOT NULL,
	"access_level" text DEFAULT 'STUDENTS' NOT NULL,
	"asset_id" uuid,
	"external_url" text,
	"citation" text,
	"description" text,
	"rights_confirmed" boolean DEFAULT false NOT NULL,
	"rights_note" text,
	"hub" text,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_assignments" (
	"mentor_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"started_on" date DEFAULT current_date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "mentor_assignments_mentor_id_student_id_pk" PRIMARY KEY("mentor_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "ministry_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"placement_id" uuid,
	"kind" text NOT NULL,
	"activity_on" date NOT NULL,
	"hours" numeric(5, 1) DEFAULT 1 NOT NULL,
	"description" text NOT NULL,
	"reflection" text,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"verified_by" uuid,
	"verifier_note" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ministry_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"enrolment_id" uuid,
	"kind" text NOT NULL,
	"organisation" text NOT NULL,
	"location" text,
	"supervisor_name" text,
	"supervisor_contact" text,
	"mentor_id" uuid,
	"starts_on" date,
	"ends_on" date,
	"hours_required" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"final_outcome" text,
	"final_note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'PUBLISHED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offering_staff" (
	"offering_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'TEACHING_ASSISTANT' NOT NULL,
	CONSTRAINT "offering_staff_offering_id_user_id_pk" PRIMARY KEY("offering_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"campus_id" uuid,
	"lecturer_id" uuid,
	"capacity" integer,
	"schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meeting_url" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"receipt_no" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"status" text DEFAULT 'CONFIRMED' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" uuid,
	"note" text,
	CONSTRAINT "payments_receipt_no_unique" UNIQUE("receipt_no")
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"effective_on" date,
	"body" text NOT NULL,
	"change_note" text,
	"author_id" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"previous_id" uuid,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"body" text,
	"image_asset_id" uuid,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"location" text,
	"audience" text DEFAULT 'PUBLIC' NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"show_in_carousel" boolean DEFAULT false NOT NULL,
	"link_url" text,
	"link_label" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practicum_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"evaluator_id" uuid,
	"evaluator_name" text,
	"ratings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"narrative" text,
	"recommendation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_courses" (
	"programme_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"kind" text DEFAULT 'CORE' NOT NULL,
	"year" integer DEFAULT 1 NOT NULL,
	"semester" integer DEFAULT 1 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "programme_courses_programme_id_course_id_pk" PRIMARY KEY("programme_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "programme_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL,
	"description" text,
	CONSTRAINT "programme_levels_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"level_id" uuid NOT NULL,
	"department_id" uuid,
	"description" text,
	"objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"learning_outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"admission_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"graduation_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"practical_requirements" text,
	"assessment_requirements" text,
	"recognition_note" text,
	"duration_months" integer DEFAULT 12 NOT NULL,
	"min_credits" integer DEFAULT 0 NOT NULL,
	"min_cgpa" numeric(3, 2) DEFAULT 1.5 NOT NULL,
	"practicum_hours" integer DEFAULT 0 NOT NULL,
	"research_required" boolean DEFAULT false NOT NULL,
	"tuition_fee" numeric(12, 2) DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programmes_code_unique" UNIQUE("code"),
	CONSTRAINT "programmes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"type" "question_type" NOT NULL,
	"stem" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"answer" jsonb,
	"marks" numeric(5, 1) DEFAULT 1 NOT NULL,
	"difficulty" text DEFAULT 'MEDIUM' NOT NULL,
	"explanation" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"author_id" uuid,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"enrolment_id" uuid,
	"title" text NOT NULL,
	"abstract" text,
	"supervisor_id" uuid,
	"status" text DEFAULT 'TOPIC' NOT NULL,
	"viva_on" timestamp with time zone,
	"score" numeric(5, 2),
	"grade" text,
	"assessment_note" text,
	"approved_by" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"asset_id" uuid,
	"ai_disclosure" text,
	"feedback" text,
	"feedback_by" uuid,
	"feedback_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"old_total" numeric(5, 2),
	"old_grade" text,
	"new_total" numeric(5, 2) NOT NULL,
	"new_grade" text NOT NULL,
	"new_grade_point" numeric(3, 2) NOT NULL,
	"reason" text NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"decided_by" uuid,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"components" jsonb DEFAULT '{"assignment":null,"test":null,"exam":null,"practical":null}'::jsonb NOT NULL,
	"total" numeric(5, 2),
	"grade" text,
	"grade_point" numeric(3, 2),
	"credits" integer DEFAULT 0 NOT NULL,
	"passed" boolean,
	"status" "result_status" DEFAULT 'DRAFT' NOT NULL,
	"remarks" text,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"published_by" uuid,
	"published_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "results_registration_id_unique" UNIQUE("registration_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_key_pk" PRIMARY KEY("role_id","permission_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"group_name" text DEFAULT 'Custom' NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"severity" text DEFAULT 'LOW' NOT NULL,
	"user_id" uuid,
	"detail" jsonb,
	"ip" text,
	"user_agent" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"mfa_pending" boolean DEFAULT false NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"department_id" uuid,
	"title" text,
	"rank" text,
	"appointment_type" text,
	"employed_on" date,
	"specialization" text,
	"qualifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ministry_experience" text,
	"research_interests" text,
	"bio" text,
	"public_profile" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"student_number" text NOT NULL,
	"date_of_birth" date,
	"gender" text,
	"address" text,
	"nationality" text,
	"emergency_contact" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"campus_id" uuid,
	"admission_session_id" uuid,
	"status" "student_status" DEFAULT 'ACTIVE' NOT NULL,
	"standing" "academic_standing" DEFAULT 'GOOD_STANDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "students_student_number_unique" UNIQUE("student_number")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"text" text,
	"asset_id" uuid,
	"ai_used" boolean DEFAULT false NOT NULL,
	"ai_disclosure" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"score" numeric(6, 1),
	"feedback" text,
	"graded_by" uuid,
	"graded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"status" "transcript_status" DEFAULT 'DRAFT' NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verify_token" text NOT NULL,
	"approved_by" uuid,
	"issued_by" uuid,
	"issued_at" timestamp with time zone,
	"revoked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transcripts_number_unique" UNIQUE("number"),
	CONSTRAINT "transcripts_verify_token_unique" UNIQUE("verify_token")
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"user_type" "user_type" NOT NULL,
	"status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"other_names" text,
	"phone" text,
	"country" text,
	"timezone" text,
	"avatar_asset_id" uuid,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"totp_secret_enc" text,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"outcome" text NOT NULL,
	"certificate_id" uuid,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_appeals" ADD CONSTRAINT "academic_appeals_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_appeals" ADD CONSTRAINT "academic_appeals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_events" ADD CONSTRAINT "academic_events_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_registration_id_course_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."course_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_graduation_id_graduations_id_fk" FOREIGN KEY ("graduation_id") REFERENCES "public"."graduations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_block_id_content_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."content_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_relations" ADD CONSTRAINT "course_relations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_relations" ADD CONSTRAINT "course_relations_related_course_id_courses_id_fk" FOREIGN KEY ("related_course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_hod_user_id_users_id_fk" FOREIGN KEY ("hod_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_reports" ADD CONSTRAINT "discussion_reports_post_id_discussion_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."discussion_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_reports" ADD CONSTRAINT "discussion_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_start_session_id_academic_sessions_id_fk" FOREIGN KEY ("start_session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_registration_id_course_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."course_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_entries" ADD CONSTRAINT "formation_entries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graduations" ADD CONSTRAINT "graduations_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graduations" ADD CONSTRAINT "graduations_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrity_cases" ADD CONSTRAINT "integrity_cases_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrity_cases" ADD CONSTRAINT "integrity_cases_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_activities" ADD CONSTRAINT "ministry_activities_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_activities" ADD CONSTRAINT "ministry_activities_placement_id_ministry_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."ministry_placements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_placements" ADD CONSTRAINT "ministry_placements_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_placements" ADD CONSTRAINT "ministry_placements_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_placements" ADD CONSTRAINT "ministry_placements_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offering_staff" ADD CONSTRAINT "offering_staff_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offering_staff" ADD CONSTRAINT "offering_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_lecturer_id_users_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practicum_evaluations" ADD CONSTRAINT "practicum_evaluations_placement_id_ministry_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."ministry_placements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_courses" ADD CONSTRAINT "programme_courses_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_courses" ADD CONSTRAINT "programme_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_level_id_programme_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."programme_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_projects" ADD CONSTRAINT "research_projects_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_projects" ADD CONSTRAINT "research_projects_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_projects" ADD CONSTRAINT "research_projects_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_submissions" ADD CONSTRAINT "research_submissions_project_id_research_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."research_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_amendments" ADD CONSTRAINT "result_amendments_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_registration_id_course_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."course_registrations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_admission_session_id_academic_sessions_id_fk" FOREIGN KEY ("admission_session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_registration_id_course_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."course_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "terms_session_ord_uq" ON "academic_terms" USING btree ("session_id","ordinal");--> statement-breakpoint
CREATE INDEX "applications_user_idx" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessments_offering_idx" ON "assessments" USING btree ("offering_id","kind");--> statement-breakpoint
CREATE INDEX "assets_kind_idx" ON "assets" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "certificates_enrol_idx" ON "certificates" USING btree ("enrolment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_versions_uq" ON "content_versions" USING btree ("block_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_enrol_offering_uq" ON "course_registrations" USING btree ("enrolment_id","offering_id");--> statement-breakpoint
CREATE INDEX "registrations_course_idx" ON "course_registrations" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "registrations_offering_idx" ON "course_registrations" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "courses_dept_idx" ON "courses" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discussion_scope_idx" ON "discussion_posts" USING btree ("scope","course_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "enrolments_student_programme_uq" ON "enrolments" USING btree ("student_id","programme_id");--> statement-breakpoint
CREATE INDEX "enrolments_programme_idx" ON "enrolments" USING btree ("programme_id");--> statement-breakpoint
CREATE INDEX "evaluations_offering_idx" ON "evaluations" USING btree ("offering_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_uq" ON "exam_attempts" USING btree ("assessment_id","registration_id","attempt_no");--> statement-breakpoint
CREATE INDEX "formation_student_idx" ON "formation_entries" USING btree ("student_id","entry_on");--> statement-breakpoint
CREATE INDEX "invoices_user_idx" ON "invoices" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "lessons_module_idx" ON "lessons" USING btree ("module_id","position");--> statement-breakpoint
CREATE INDEX "lessons_course_idx" ON "lessons" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "library_status_idx" ON "library_resources" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "ministry_activities_student_idx" ON "ministry_activities" USING btree ("student_id","activity_on");--> statement-breakpoint
CREATE INDEX "modules_course_idx" ON "modules" USING btree ("course_id","position");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "offerings_course_term_uq" ON "offerings" USING btree ("course_id","term_id");--> statement-breakpoint
CREATE INDEX "offerings_lecturer_idx" ON "offerings" USING btree ("lecturer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "policies_key_version_uq" ON "policies" USING btree ("key","version");--> statement-breakpoint
CREATE INDEX "policies_current_idx" ON "policies" USING btree ("key","is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_kind_slug_uq" ON "posts" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("kind","status","published_at");--> statement-breakpoint
CREATE INDEX "programmes_level_idx" ON "programmes" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "questions_course_idx" ON "questions" USING btree ("course_id","status");--> statement-breakpoint
CREATE INDEX "results_status_idx" ON "results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "secev_created_idx" ON "security_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "students_status_idx" ON "students" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_uq" ON "submissions" USING btree ("assessment_id","registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_type_idx" ON "users" USING btree ("user_type");
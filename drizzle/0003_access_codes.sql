CREATE TABLE "access_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"code_enc" text NOT NULL,
	"code_suffix" text NOT NULL,
	"status" text DEFAULT 'UNUSED' NOT NULL,
	"duration_days" integer NOT NULL,
	"features" jsonb,
	"batch_id" uuid,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_by" uuid,
	"activated_at" timestamp with time zone,
	"status_changed_at" timestamp with time zone,
	"status_reason" text,
	CONSTRAINT "access_codes_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "access_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_expires_at" timestamp with time zone NOT NULL,
	"new_expires_at" timestamp with time zone NOT NULL,
	"delta_days" integer,
	"reason" text NOT NULL,
	"admin_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_id" uuid NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"activated_at" timestamp with time zone NOT NULL,
	"original_expires_at" timestamp with time zone NOT NULL,
	"current_expires_at" timestamp with time zone NOT NULL,
	"duration_days" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_periods_code_id_unique" UNIQUE("code_id")
);
--> statement-breakpoint
ALTER TABLE "access_codes" ADD CONSTRAINT "access_codes_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_extensions" ADD CONSTRAINT "access_extensions_period_id_access_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."access_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_periods" ADD CONSTRAINT "access_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_periods" ADD CONSTRAINT "access_periods_code_id_access_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."access_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_codes_status_idx" ON "access_codes" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "access_codes_user_idx" ON "access_codes" USING btree ("activated_by");--> statement-breakpoint
CREATE INDEX "access_codes_batch_idx" ON "access_codes" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "access_ext_period_idx" ON "access_extensions" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "access_periods_user_idx" ON "access_periods" USING btree ("user_id","status","current_expires_at");
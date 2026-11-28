CREATE TABLE "book_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"code_enc" text NOT NULL,
	"status" text DEFAULT 'UNUSED' NOT NULL,
	"note" text,
	"used_by" uuid,
	"used_at" timestamp with time zone,
	"download_allowed" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_codes_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"author" text NOT NULL,
	"description" text,
	"price" text,
	"how_to_buy" text,
	"manuscript" text DEFAULT '' NOT NULL,
	"cover_asset_id" uuid,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "book_codes" ADD CONSTRAINT "book_codes_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_codes" ADD CONSTRAINT "book_codes_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_codes_book_idx" ON "book_codes" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_codes_user_idx" ON "book_codes" USING btree ("used_by");
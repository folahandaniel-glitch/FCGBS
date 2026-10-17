ALTER TABLE "materials" ADD COLUMN "place" text;--> statement-breakpoint
CREATE INDEX "materials_place_idx" ON "materials" USING btree ("place");
ALTER TABLE "auth_sessions" ADD COLUMN "family_id" uuid;
--> statement-breakpoint
UPDATE "auth_sessions" SET "family_id" = "id" WHERE "family_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "family_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions" USING btree ("family_id");
--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");
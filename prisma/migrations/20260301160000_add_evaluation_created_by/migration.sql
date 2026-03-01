-- Add createdById to evaluation_sessions
ALTER TABLE "evaluation_sessions" ADD COLUMN "created_by_id" BIGINT;

-- Add createdById to evaluations
ALTER TABLE "evaluations" ADD COLUMN "created_by_id" BIGINT;

-- Foreign keys
ALTER TABLE "evaluation_sessions" ADD CONSTRAINT "evaluation_sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "evaluation_sessions_created_by_id_idx" ON "evaluation_sessions"("created_by_id");
CREATE INDEX "evaluations_created_by_id_idx" ON "evaluations"("created_by_id");

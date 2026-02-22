-- Add context summary and archive fields to chat_sessions
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "context_summary" TEXT;
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "summary_up_to" INTEGER DEFAULT 0 NOT NULL;

-- Add index for is_archived
CREATE INDEX IF NOT EXISTS "chat_sessions_is_archived_idx" ON "chat_sessions"("is_archived");

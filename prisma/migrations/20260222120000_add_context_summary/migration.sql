-- Add context summary fields to chat_sessions
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "context_summary" TEXT;
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "summary_up_to" INTEGER DEFAULT 0 NOT NULL;

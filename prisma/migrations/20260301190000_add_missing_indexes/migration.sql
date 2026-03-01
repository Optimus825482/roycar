-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "evaluation_sessions_status_idx" ON "evaluation_sessions"("status");
CREATE INDEX IF NOT EXISTS "evaluation_sessions_created_by_id_idx" ON "evaluation_sessions"("created_by_id");
CREATE INDEX IF NOT EXISTS "form_configs_is_published_is_active_idx" ON "form_configs"("is_published", "is_active");
CREATE INDEX IF NOT EXISTS "applications_full_name_idx" ON "applications"("full_name");

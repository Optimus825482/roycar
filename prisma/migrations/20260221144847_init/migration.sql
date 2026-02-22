-- CreateTable
CREATE TABLE "admin_users" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'hr_manager',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_configs" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'static',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "form_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" BIGSERIAL NOT NULL,
    "form_config_id" BIGINT NOT NULL,
    "group_label" TEXT,
    "question_text" TEXT NOT NULL,
    "question_type" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,
    "options" JSONB,
    "validation" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_images" (
    "id" BIGSERIAL NOT NULL,
    "question_id" BIGINT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branching_rules" (
    "id" BIGSERIAL NOT NULL,
    "source_question_id" BIGINT NOT NULL,
    "target_question_id" BIGINT NOT NULL,
    "condition_logic" TEXT NOT NULL DEFAULT 'AND',
    "conditions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branching_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" BIGSERIAL NOT NULL,
    "application_no" TEXT NOT NULL,
    "form_config_id" BIGINT NOT NULL,
    "department_id" BIGINT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "photo_path" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "response_summary" JSONB,
    "import_log_id" BIGINT,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_responses" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "answer_text" TEXT,
    "answer_json" JSONB,
    "answer_file" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "report" JSONB NOT NULL,
    "raw_response" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "evaluated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" BIGSERIAL NOT NULL,
    "admin_user_id" BIGINT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "chat_session_id" BIGINT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_logs" (
    "id" BIGSERIAL NOT NULL,
    "file_name" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "imported_count" INTEGER NOT NULL,
    "skipped_count" INTEGER NOT NULL,
    "error_details" JSONB,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "questions_form_config_id_sort_order_idx" ON "questions"("form_config_id", "sort_order");

-- CreateIndex
CREATE INDEX "question_images_question_id_idx" ON "question_images"("question_id");

-- CreateIndex
CREATE INDEX "branching_rules_source_question_id_idx" ON "branching_rules"("source_question_id");

-- CreateIndex
CREATE INDEX "branching_rules_target_question_id_idx" ON "branching_rules"("target_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_application_no_key" ON "applications"("application_no");

-- CreateIndex
CREATE INDEX "applications_email_department_id_idx" ON "applications"("email", "department_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_department_id_idx" ON "applications"("department_id");

-- CreateIndex
CREATE INDEX "applications_submitted_at_idx" ON "applications"("submitted_at");

-- CreateIndex
CREATE INDEX "application_responses_application_id_idx" ON "application_responses"("application_id");

-- CreateIndex
CREATE INDEX "application_responses_question_id_idx" ON "application_responses"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_responses_application_id_question_id_key" ON "application_responses"("application_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_application_id_key" ON "evaluations"("application_id");

-- CreateIndex
CREATE INDEX "evaluations_status_idx" ON "evaluations"("status");

-- CreateIndex
CREATE INDEX "evaluations_overall_score_idx" ON "evaluations"("overall_score");

-- CreateIndex
CREATE INDEX "chat_sessions_admin_user_id_idx" ON "chat_sessions"("admin_user_id");

-- CreateIndex
CREATE INDEX "chat_messages_chat_session_id_idx" ON "chat_messages"("chat_session_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_form_config_id_fkey" FOREIGN KEY ("form_config_id") REFERENCES "form_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_images" ADD CONSTRAINT "question_images_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branching_rules" ADD CONSTRAINT "branching_rules_source_question_id_fkey" FOREIGN KEY ("source_question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branching_rules" ADD CONSTRAINT "branching_rules_target_question_id_fkey" FOREIGN KEY ("target_question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_form_config_id_fkey" FOREIGN KEY ("form_config_id") REFERENCES "form_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_import_log_id_fkey" FOREIGN KEY ("import_log_id") REFERENCES "import_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_responses" ADD CONSTRAINT "application_responses_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_responses" ADD CONSTRAINT "application_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

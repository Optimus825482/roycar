-- CreateTable
CREATE TABLE "import_field_definitions" (
    "id" BIGSERIAL NOT NULL,
    "field_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "field_category" TEXT NOT NULL DEFAULT 'general',
    "data_type" TEXT NOT NULL DEFAULT 'text',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_field_values" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "field_definition_id" BIGINT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_field_definitions_normalized_name_key" ON "import_field_definitions"("normalized_name");

-- CreateIndex
CREATE INDEX "import_field_definitions_field_category_idx" ON "import_field_definitions"("field_category");

-- CreateIndex
CREATE INDEX "import_field_definitions_is_active_idx" ON "import_field_definitions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "application_field_values_application_id_field_definition_id_key" ON "application_field_values"("application_id", "field_definition_id");

-- CreateIndex
CREATE INDEX "application_field_values_application_id_idx" ON "application_field_values"("application_id");

-- CreateIndex
CREATE INDEX "application_field_values_field_definition_id_idx" ON "application_field_values"("field_definition_id");

-- CreateIndex
CREATE INDEX "application_field_values_value_idx" ON "application_field_values"("value");

-- AddForeignKey
ALTER TABLE "application_field_values" ADD CONSTRAINT "application_field_values_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_field_values" ADD CONSTRAINT "application_field_values_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "import_field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

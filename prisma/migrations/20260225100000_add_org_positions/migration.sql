-- CreateTable
CREATE TABLE "org_positions" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "title_en" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'kitchen',
    "level" INTEGER NOT NULL DEFAULT 3,
    "parent_id" BIGINT,
    "authority_score" INTEGER NOT NULL DEFAULT 0,
    "guest_interaction" INTEGER NOT NULL DEFAULT 0,
    "team_size" INTEGER NOT NULL DEFAULT 1,
    "skills" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_positions_category_idx" ON "org_positions"("category");
CREATE INDEX "org_positions_parent_id_idx" ON "org_positions"("parent_id");
CREATE INDEX "org_positions_level_idx" ON "org_positions"("level");

-- AddForeignKey
ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

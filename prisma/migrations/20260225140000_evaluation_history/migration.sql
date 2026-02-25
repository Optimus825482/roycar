-- Evaluation tablosunda applicationId üzerindeki UNIQUE constraint'i kaldır
-- Böylece bir başvurunun birden fazla değerlendirmesi olabilir (1:N ilişki)

-- 1. Unique constraint'i kaldır
ALTER TABLE "evaluations" DROP CONSTRAINT IF EXISTS "evaluations_application_id_key";

-- 2. Yeni alanlar ekle
ALTER TABLE "evaluations" ADD COLUMN IF NOT EXISTS "custom_criteria" JSONB;
ALTER TABLE "evaluations" ADD COLUMN IF NOT EXISTS "evaluation_label" TEXT;

-- 3. application_id üzerinde normal index ekle (performans için)
CREATE INDEX IF NOT EXISTS "evaluations_application_id_idx" ON "evaluations" ("application_id");

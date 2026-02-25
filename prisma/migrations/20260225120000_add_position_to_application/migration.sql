-- AlterTable: departmentId opsiyonel yap, positionId ve positionTitle ekle
ALTER TABLE "applications" ALTER COLUMN "department_id" DROP NOT NULL;
ALTER TABLE "applications" ADD COLUMN "position_id" BIGINT;
ALTER TABLE "applications" ADD COLUMN "position_title" TEXT;

-- Index
CREATE INDEX "applications_position_id_idx" ON "applications"("position_id");

-- AlterTable: Add manual_note and final_decision to evaluations
ALTER TABLE "evaluations" ADD COLUMN "manual_note" TEXT;
ALTER TABLE "evaluations" ADD COLUMN "final_decision" TEXT;

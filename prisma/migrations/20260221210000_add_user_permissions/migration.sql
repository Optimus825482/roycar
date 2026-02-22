-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '{"form_builder":true,"ai_chat":true,"evaluations":true,"screening":true,"data_import":true,"settings":false,"user_management":false}';

-- Update existing admin user to have full permissions
UPDATE "admin_users" SET "permissions" = '{"form_builder":true,"ai_chat":true,"evaluations":true,"screening":true,"data_import":true,"settings":true,"user_management":true}' WHERE "email" = 'admin@meritroyal.com';

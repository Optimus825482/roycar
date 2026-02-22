-- AlterTable: Add username column
ALTER TABLE "admin_users" ADD COLUMN "username" TEXT;

-- Set username from email prefix for existing users
UPDATE "admin_users" SET "username" = SPLIT_PART("email", '@', 1) WHERE "username" IS NULL;

-- Make username NOT NULL and UNIQUE
ALTER TABLE "admin_users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- Make email optional (drop unique constraint)
ALTER TABLE "admin_users" DROP CONSTRAINT IF EXISTS "admin_users_email_key";

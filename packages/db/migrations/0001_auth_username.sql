ALTER TABLE "users" RENAME COLUMN "email" TO "username";
ALTER TABLE "users" DROP COLUMN IF EXISTS "name";

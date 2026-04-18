ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "priority" varchar(20) DEFAULT 'none';
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "due_date" timestamptz;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "assigned_to" uuid REFERENCES "users"("id");
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0;
UPDATE "items" SET "status" = 'todo' WHERE "status" = 'active';

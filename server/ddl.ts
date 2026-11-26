// Idempotent DDL, kept identical to prisma/migrations/0001_init/migration.sql.
// Applied on first request so a fresh Prisma Postgres database works without a manual migration step.
export const DDL = [
  `CREATE SEQUENCE IF NOT EXISTS entity_rev_seq`,
  `CREATE TABLE IF NOT EXISTS "entity" (
    "collection" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "event_id" TEXT,
    "owner_id" TEXT,
    "data" JSONB NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "rev" BIGINT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entity_pkey" PRIMARY KEY ("collection","key")
  )`,
  `CREATE INDEX IF NOT EXISTS "entity_rev_idx" ON "entity"("rev")`,
  `CREATE INDEX IF NOT EXISTS "entity_collection_owner_id_idx" ON "entity"("collection","owner_id")`,
  `CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "trainer_id" TEXT,
    "password_hash" TEXT,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "account_login_key" ON "account"("login")`,
  `CREATE TABLE IF NOT EXISTS "setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    CONSTRAINT "setting_pkey" PRIMARY KEY ("key")
  )`,
];

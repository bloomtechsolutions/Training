import { PrismaClient, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { DDL } from './ddl.js';

export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
}

const g = globalThis as unknown as { __prisma?: PrismaClient; __schemaReady?: Promise<void> };

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function prisma(): PrismaClient {
  if (!g.__prisma) {
    const url = databaseUrl();
    if (!url) throw new HttpError(503, 'The database is not connected yet. In Vercel, open this project → Storage → connect a Prisma Postgres database, then redeploy.');
    g.__prisma = new PrismaClient({ datasourceUrl: url });
  }
  return g.__prisma;
}

export async function ensureSchema() {
  if (!g.__schemaReady) {
    g.__schemaReady = (async () => {
      const db = prisma();
      for (const stmt of DDL) await db.$executeRawUnsafe(stmt);
    })().catch((e) => { g.__schemaReady = undefined; throw e; });
  }
  return g.__schemaReady;
}

export async function getSetting<T>(key: string, tx: Prisma.TransactionClient = prisma()): Promise<T | null> {
  const row = await tx.setting.findUnique({ where: { key } });
  return (row?.value as T) ?? null;
}
export async function setSetting(key: string, value: unknown, tx: Prisma.TransactionClient = prisma()) {
  await tx.setting.upsert({ where: { key }, create: { key, value: value as Prisma.InputJsonValue }, update: { value: value as Prisma.InputJsonValue } });
}

const secretCache: Record<string, string> = {};
/** A secret generated once per database and stored in it (used when no env secret is set). */
export async function secret(name: 'session' | 'qr'): Promise<string> {
  const env = name === 'session' ? process.env.SESSION_SECRET : process.env.QR_SECRET;
  if (env) return env;
  if (secretCache[name]) return secretCache[name];
  const key = `secret:${name}`;
  const fresh = randomBytes(32).toString('hex');
  await prisma().$executeRaw`INSERT INTO "setting" ("key","value") VALUES (${key}, to_jsonb(${fresh}::text)) ON CONFLICT ("key") DO NOTHING`;
  const value = (await getSetting<string>(key))!;
  secretCache[name] = value;
  return value;
}

/** Write one entity inside a transaction; every write takes the next global revision. */
export async function writeEntity(tx: Prisma.TransactionClient, c: string, k: string, v: any | null, eventId: string | null, ownerId: string | null) {
  if (v === null) {
    await tx.$executeRaw`UPDATE "entity" SET "deleted" = true, "rev" = nextval('entity_rev_seq'), "updated_at" = now() WHERE "collection" = ${c} AND "key" = ${k}`;
    return;
  }
  const json = JSON.stringify(v);
  await tx.$executeRaw`INSERT INTO "entity" ("collection","key","event_id","owner_id","data","deleted","rev","updated_at")
    VALUES (${c}, ${k}, ${eventId}, ${ownerId}, ${json}::jsonb, false, nextval('entity_rev_seq'), now())
    ON CONFLICT ("collection","key") DO UPDATE SET "data" = EXCLUDED."data", "event_id" = EXCLUDED."event_id", "owner_id" = EXCLUDED."owner_id", "deleted" = false, "rev" = EXCLUDED."rev", "updated_at" = now()`;
}

export async function currentRev(tx: Prisma.TransactionClient = prisma()): Promise<number> {
  const r = await tx.$queryRaw<{ m: bigint | null }[]>`SELECT max("rev") AS m FROM "entity"`;
  return Number(r[0]?.m ?? 0);
}

/** Serialise all writes, so revisions reflect commit order and change polling never skips a row. */
export async function lockWrites(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(42001)::text AS l`;
}

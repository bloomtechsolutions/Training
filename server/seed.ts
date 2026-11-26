import type { Prisma } from '@prisma/client';
import { buildSeed } from '../src/lib/seed.js';
import { toEntities } from '../src/lib/collections.js';
import type { DB } from '../src/lib/types.js';
import { prisma, setSetting, getSetting } from './db.js';
import { ownerOf, eventOf, DEMO_MODE } from './rules.js';

export const withDemoData = () => process.env.SEED_DEMO_DATA !== 'false';

/** The seed event and content. Without demo data, participants and their activity are left empty for real use. */
export function seedDb(demo: boolean): DB {
  const db = buildSeed();
  db.demoClock = DEMO_MODE() ? db.demoClock : null;
  db.demoClockSetAt = Date.now();
  if (!demo) {
    db.users = [];
    db.attendance = [];
    db.feedback = [];
    db.scores = [];
    db.words = [];
    db.ideas = [];
    db.challenges = [];
    db.qa = [];
    db.photos = [];
    db.commitments = [];
    db.bookmarks = {};
    db.audit = [];
  }
  return db;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean).slice(-2).join('.');

async function bulkInsert(tx: Prisma.TransactionClient, rows: { c: string; k: string; e: string | null; o: string | null; d: string }[]) {
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    await tx.$executeRawUnsafe(
      `INSERT INTO "entity" ("collection","key","event_id","owner_id","data","deleted","rev","updated_at")
       SELECT t.c, t.k, t.e, t.o, t.d::jsonb, false, nextval('entity_rev_seq'), now()
       FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[]) WITH ORDINALITY AS t(c, k, e, o, d, n) ORDER BY t.n
       ON CONFLICT ("collection","key") DO UPDATE SET "data" = EXCLUDED."data", "deleted" = false, "rev" = EXCLUDED."rev"`,
      chunk.map((r) => r.c), chunk.map((r) => r.k), chunk.map((r) => r.e), chunk.map((r) => r.o), chunk.map((r) => r.d),
    );
  }
}

export async function writeSeed(tx: Prisma.TransactionClient, demo: boolean) {
  const db = seedDb(demo);
  const rows: { c: string; k: string; e: string | null; o: string | null; d: string }[] = [];
  toEntities(db).forEach((m, c) => m.forEach((v, k) => rows.push({ c, k, e: eventOf(v), o: ownerOf(c, k, v), d: JSON.stringify(v) })));
  await bulkInsert(tx, rows);

  const accounts: Prisma.AccountCreateManyInput[] = [
    { id: 'acc-admin', login: 'admin', name: 'Event Organiser', role: 'admin' },
    { id: 'acc-leadership', login: 'leadership', name: 'Leadership viewer', role: 'leadership' },
    ...db.trainers.filter((t) => t.kind === 'staff').map((t) => ({ id: `acc-${t.id}`, login: slug(t.name), name: t.name, role: 'trainer', trainerId: t.id })),
    ...db.users.map((u) => ({ id: u.id, login: u.staffId.toLowerCase(), name: u.name, role: 'participant' })),
  ];
  await tx.account.createMany({ data: accounts, skipDuplicates: true });
}

let seeding: Promise<void> | null = null;
export async function ensureSeeded() {
  if (await getSetting<boolean>('seeded')) return;
  seeding ??= prisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(42002)::text AS l`;
    if (await getSetting<boolean>('seeded', tx)) return;
    await writeSeed(tx, withDemoData());
    await setSetting('seeded', true, tx);
  }, { timeout: 60_000, maxWait: 20_000 }).finally(() => { seeding = null; });
  await seeding;
}

export async function resetAll(demo: boolean) {
  await prisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(42001)::text AS l`;
    // Tombstone everything (so open clients drop it), then rewrite the seed.
    await tx.$executeRaw`UPDATE "entity" SET "deleted" = true, "rev" = nextval('entity_rev_seq')`;
    await tx.account.deleteMany({});
    await writeSeed(tx, demo);
    await setSetting('seeded', true, tx);
  }, { timeout: 60_000, maxWait: 20_000 });
}

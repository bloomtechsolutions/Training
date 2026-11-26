import type { IncomingMessage, ServerResponse } from 'node:http';
import { put } from '@vercel/blob';
import { prisma, ensureSchema, HttpError, writeEntity, currentRev, lockWrites, getSetting, setSetting, databaseUrl } from './db.js';
import { readSession, signSession, sessionCookie, verifyPassword, hashPassword, newAccessCode, normaliseCode, safeEqual, qrToken, QR_WINDOW_MS, type Actor } from './auth.js';
import { authorise, redact, ownerOf, eventOf, DEMO_MODE, type Ctx, type ReadCtx } from './rules.js';
import { ensureSeeded, resetAll } from './seed.js';
import { COLLECTIONS, SINGLE_KEY, keys, type Entity } from '../src/lib/collections.js';
import { mvtEpoch } from '../src/lib/time.js';

type Req = IncomingMessage & { body?: any };
type Res = ServerResponse;

// ---------- small HTTP helpers ----------

function send(res: Res, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

async function readBody(req: Req): Promise<any> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const ch of req) { size += (ch as Buffer).length; if (size > 4_000_000) throw new HttpError(413, 'Upload too large.'); chunks.push(ch as Buffer); }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const isSecure = (req: Req) => (req.headers['x-forwarded-proto'] ?? '') === 'https';

function requireActor(a: Actor | null, ...roles: Actor['role'][]): Actor {
  if (!a) throw new HttpError(401, 'Please sign in.');
  if (roles.length && !roles.includes(a.role)) throw new HttpError(403, 'You do not have access to this.');
  return a;
}

// Simple per-instance brute-force throttle for sign-in.
const attempts = new Map<string, { n: number; until: number }>();
function throttle(key: string) {
  const a = attempts.get(key);
  if (a && a.until > Date.now() && a.n >= 8) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
}
function failed(key: string) {
  const a = attempts.get(key);
  attempts.set(key, { n: (a && a.until > Date.now() ? a.n : 0) + 1, until: Date.now() + 5 * 60_000 });
}

// ---------- entity loading ----------

interface DbRow { collection: string; key: string; data: any; deleted: boolean; rev: bigint }

async function rowsSince(since: number, limit: number) {
  return prisma().$queryRaw<DbRow[]>`SELECT "collection","key","data","deleted","rev" FROM "entity" WHERE "rev" > ${since} ORDER BY "rev" ASC LIMIT ${limit}`;
}
async function allRows() {
  return prisma().$queryRaw<DbRow[]>`SELECT "collection","key","data","deleted","rev" FROM "entity" WHERE "deleted" = false ORDER BY "rev" ASC`;
}
async function getOne(c: string, k: string) {
  const r = await prisma().$queryRaw<DbRow[]>`SELECT "collection","key","data","deleted","rev" FROM "entity" WHERE "collection" = ${c} AND "key" = ${k} AND "deleted" = false`;
  return r[0]?.data ?? null;
}

async function readCtx(actor: Actor): Promise<ReadCtx> {
  const live = (await getOne('live', SINGLE_KEY))?.value ?? null;
  const answered = new Set<string>();
  if (actor.role === 'participant' && actor.userId) {
    const r = await prisma().$queryRaw<{ data: any }[]>`SELECT "data" FROM "entity" WHERE "collection" = 'responses' AND "owner_id" = ${actor.userId} AND "deleted" = false`;
    r.forEach((x) => answered.add(`${x.data.activityId}:${x.data.questionId}`));
  }
  return { actor, live, answered };
}

function out(rc: ReadCtx, row: DbRow): Entity {
  return { c: row.collection, k: row.key, v: row.deleted ? null : redact(rc, row.collection, row.key, row.data), r: Number(row.rev) };
}

/** Demo clock aware "now" (only in demo mode), so server-side check-in windows match what people see. */
async function eventNow(): Promise<number> {
  if (!DEMO_MODE()) return Date.now();
  const clock = (await getOne('demoClock', SINGLE_KEY))?.value;
  const setAt = (await getOne('demoClockSetAt', SINGLE_KEY))?.value;
  if (!clock) return Date.now();
  return new Date(clock).getTime() + Math.min(Date.now() - (setAt ?? Date.now()), 3 * 3600_000);
}

async function offloadImages(c: string, k: string, v: any) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !v) return v;
  const upload = async (dataUrl: string, name: string) => {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
    if (!m) return dataUrl;
    const blob = await put(`${name}.${m[1].split('/')[1]}`, Buffer.from(m[2], 'base64'), { access: 'public', contentType: m[1], addRandomSuffix: true });
    return blob.url;
  };
  if (c === 'photos' && typeof v.dataUrl === 'string' && v.dataUrl.startsWith('data:')) return { ...v, dataUrl: await upload(v.dataUrl, `photos/${k}`) };
  if (c === 'decks' && Array.isArray(v.slides)) {
    const slides = await Promise.all(v.slides.map(async (s: any, i: number) => (typeof s.image === 'string' && s.image.startsWith('data:') ? { ...s, image: await upload(s.image, `slides/${k}-${i}`) } : s)));
    return { ...v, slides };
  }
  return v;
}

// ---------- routes ----------

async function handleMutate(actor: Actor, body: any) {
  const changes: Entity[] = Array.isArray(body?.changes) ? body.changes : [];
  if (!changes.length) return { rev: await currentRev(), entities: [] };
  if (changes.length > 400) throw new HttpError(413, 'Too many changes at once.');
  const skew = typeof body.clientNow === 'number' ? Date.now() - body.clientNow : 0;
  const now = Date.now();

  // Upload images before the transaction (network calls must not hold the write lock).
  for (const ch of changes) ch.v = await offloadImages(ch.c, ch.k, ch.v);

  const written: { c: string; k: string }[] = [];
  await prisma().$transaction(async (tx) => {
    await lockWrites(tx);
    const cache = new Map<string, any>();
    const queue: { c: string; k: string; v: any }[] = [];
    const ctx: Ctx = {
      actor, now,
      async get(c, k) {
        const id = `${c}\u0000${k}`;
        if (cache.has(id)) return cache.get(id);
        const r = await tx.$queryRaw<{ data: any }[]>`SELECT "data" FROM "entity" WHERE "collection" = ${c} AND "key" = ${k} AND "deleted" = false`;
        const v = r[0]?.data ?? null;
        cache.set(id, v);
        return v;
      },
      async list(c, where) {
        const r = where?.ownerId
          ? await tx.$queryRaw<{ key: string; data: any }[]>`SELECT "key","data" FROM "entity" WHERE "collection" = ${c} AND "owner_id" = ${where.ownerId} AND "deleted" = false`
          : await tx.$queryRaw<{ key: string; data: any }[]>`SELECT "key","data" FROM "entity" WHERE "collection" = ${c} AND "deleted" = false`;
        const pending = queue.filter((q) => q.c === c && q.v && (!where?.ownerId || ownerOf(c, q.k, q.v) === where.ownerId)).map((q) => ({ k: q.k, v: q.v }));
        return [...r.map((x) => ({ k: x.key, v: x.data })), ...pending];
      },
      write(c, k, v) { queue.push({ c, k, v }); cache.set(`${c}\u0000${k}`, v); },
    };
    for (const ch of changes) {
      if (!COLLECTIONS[ch.c]) throw new HttpError(400, `Unknown collection ${ch.c}`);
      let v = ch.v;
      // Normalise device clock skew for timers set by trainers/admins.
      if (ch.c === 'live' && v?.value && skew) {
        const L = { ...v.value };
        if (typeof L.deadline === 'number') L.deadline += skew;
        v = { value: L };
      }
      if (ch.c === 'roleplay' && v?.value?.prepDeadline && skew) v = { value: { ...v.value, prepDeadline: v.value.prepDeadline + skew } };
      const accepted = await authorise(ctx, ch.c, ch.k, v);
      ctx.write(ch.c, ch.k, accepted);
    }
    for (const q of queue) {
      if (q.c === '__account') {
        const u = q.v;
        await tx.account.upsert({ where: { id: u.id }, create: { id: u.id, login: String(u.staffId).toLowerCase(), name: u.name, role: 'participant' }, update: { name: u.name } });
        continue;
      }
      await writeEntity(tx, q.c, q.k, q.v, eventOf(q.v), ownerOf(q.c, q.k, q.v));
      written.push({ c: q.c, k: q.k });
    }
  }, { timeout: 20_000, maxWait: 15_000 });

  // Return the authoritative versions (redacted for this actor), plus activities whose answers are now visible.
  const rc = await readCtx(actor);
  const uniq = new Map<string, { c: string; k: string }>();
  written.forEach((w) => uniq.set(`${w.c}\u0000${w.k}`, w));
  if (actor.role === 'participant') written.filter((w) => w.c === 'responses').forEach((w) => { const a = w.k.split(':')[0]; uniq.set(`activities\u0000${a}`, { c: 'activities', k: a }); });
  const entities: Entity[] = [];
  for (const w of uniq.values()) {
    const r = await prisma().$queryRaw<DbRow[]>`SELECT "collection","key","data","deleted","rev" FROM "entity" WHERE "collection" = ${w.c} AND "key" = ${w.k}`;
    if (r[0]) entities.push(out(rc, r[0]));
  }
  return { rev: await currentRev(), entities };
}

async function handleCheckin(actor: Actor, body: any) {
  if (actor.role !== 'participant' || !actor.userId) throw new HttpError(403, 'Only participants check in.');
  let eventId: string; let sessionId: string; let token: string | null = null;
  if (typeof body.payload === 'string') {
    const parts = body.payload.trim().split(':');
    if (parts.length !== 4 || parts[0] !== 'BMLR2') throw new HttpError(400, 'This is not a BML Refresher attendance code.');
    [, eventId, sessionId, token] = parts;
  } else {
    eventId = String(body.eventId ?? ''); sessionId = String(body.sessionId ?? '');
    token = body.code ? normaliseCode(String(body.code)) : null;
    if (!token && !(body.demo && DEMO_MODE())) throw new HttpError(400, 'Enter the code shown on the venue screen.');
  }
  if (token) {
    const slice = Math.floor(Date.now() / QR_WINDOW_MS);
    const ok = [await qrToken(eventId, sessionId, slice), await qrToken(eventId, sessionId, slice - 1)].some((t) => safeEqual(t, token!));
    if (!ok) throw new HttpError(400, 'This code has expired or is not for this session. Scan the code currently on the venue screen.');
  }
  const ev = await getOne('events', eventId);
  const agenda: any[] = (await getOne('publishedAgenda', eventId)) ?? [];
  const s = agenda.find((x) => x.id === sessionId) ?? (await getOne('sessions', sessionId));
  if (!ev || !s) throw new HttpError(404, 'Session not found.');
  const user = await getOne('users', actor.userId);
  if (!user || !user.eventIds?.includes(eventId)) throw new HttpError(403, 'You are not registered for this event.');
  const now = await eventNow();
  const date = ev.days[s.day - 1]?.date ?? ev.days[0].date;
  const start = mvtEpoch(date, s.start); const end = mvtEpoch(date, s.end);
  if (now < start - 15 * 60_000 || now > end) throw new HttpError(400, 'Check-in for this session is not open right now.');
  const key = keys.attendance(sessionId, actor.userId);
  const late = now > start + 10 * 60_000;
  const rec = { id: key, eventId, sessionId, userId: actor.userId, checkIn: now, checkOut: null, late, method: token ? 'qr' : 'manual', status: late ? 'late' : 'present' };
  await prisma().$transaction(async (tx) => {
    await lockWrites(tx);
    const dup = await tx.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM "entity" WHERE "collection" = 'attendance' AND "key" = ${key} AND "deleted" = false`;
    if (dup.length) throw new HttpError(409, 'You are already checked in to this session.');
    await writeEntity(tx, 'attendance', key, rec, eventId, actor.userId);
  });
  return { ok: true, record: rec, late, title: s.title };
}

export async function handle(req: Req, res: Res) {
  try {
    const url = new URL(req.url ?? '/', 'http://local');
    const path = (url.searchParams.get('path') ?? url.pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '');
    const method = req.method ?? 'GET';

    if (path === 'health') {
      const configured = !!databaseUrl();
      let db = false;
      if (configured) { try { await ensureSchema(); db = true; } catch { db = false; } }
      return send(res, 200, { ok: true, configured, db, demoMode: DEMO_MODE(), blob: !!process.env.BLOB_READ_WRITE_TOKEN });
    }

    await ensureSchema();
    await ensureSeeded();
    const actor = await readSession(req.headers.cookie);

    if (path === 'session') {
      return send(res, 200, { actor, demoMode: DEMO_MODE(), adminPasswordSet: !!process.env.ADMIN_PASSWORD });
    }

    if (path === 'auth/login' && method === 'POST') {
      const b = await readBody(req);
      const login = String(b.login ?? '').trim().toLowerCase();
      const code = String(b.code ?? '');
      const ip = String(req.headers['x-forwarded-for'] ?? 'local').split(',')[0];
      throttle(`${ip}|${login}`);
      const acc = await prisma().account.findUnique({ where: { login } });
      let ok = false;
      if (acc && !acc.disabled) {
        if (acc.role === 'admin' && acc.login === 'admin' && process.env.ADMIN_PASSWORD) ok = safeEqual(code, process.env.ADMIN_PASSWORD);
        else ok = verifyPassword(normaliseCode(code), acc.passwordHash);
      }
      if (!ok || !acc) { failed(`${ip}|${login}`); throw new HttpError(401, 'That sign-in ID and access code do not match. Ask an organiser for a new code.'); }
      await prisma().account.update({ where: { id: acc.id }, data: { lastLoginAt: new Date() } });
      const a: Actor = { id: acc.id, role: acc.role as Actor['role'], name: acc.name, trainerId: acc.trainerId, userId: acc.role === 'participant' ? acc.id : null };
      return send(res, 200, { actor: a }, { 'Set-Cookie': sessionCookie(await signSession(a), isSecure(req)) });
    }

    if (path === 'auth/demo' && method === 'POST') {
      if (!DEMO_MODE()) throw new HttpError(403, 'Demo sign-in is turned off.');
      const b = await readBody(req);
      const role = String(b.role);
      let acc;
      if (role === 'participant') acc = await prisma().account.findUnique({ where: { id: String(b.id ?? 'u01') } });
      else if (role === 'trainer') acc = await prisma().account.findFirst({ where: { role: 'trainer', trainerId: String(b.id ?? 't-zima') } });
      else if (role === 'leadership') acc = await prisma().account.findFirst({ where: { role: 'leadership' } });
      else throw new HttpError(403, 'Demo sign-in is not available for this role.');
      if (!acc) throw new HttpError(404, 'Demo account not found. An organiser may need to reset demo data.');
      const a: Actor = { id: acc.id, role: acc.role as Actor['role'], name: acc.name, trainerId: acc.trainerId, userId: acc.role === 'participant' ? acc.id : null };
      return send(res, 200, { actor: a }, { 'Set-Cookie': sessionCookie(await signSession(a), isSecure(req)) });
    }

    if (path === 'auth/venue' && method === 'POST') {
      const b = await readBody(req);
      const stored = await getSetting<string>('venue:code');
      const ip = String(req.headers['x-forwarded-for'] ?? 'local').split(',')[0];
      throttle(`${ip}|venue`);
      if (!stored || !verifyPassword(normaliseCode(String(b.code ?? '')), stored)) { failed(`${ip}|venue`); throw new HttpError(401, 'That display code is not valid.'); }
      const a: Actor = { id: 'venue', role: 'venue', name: 'Venue display', trainerId: null, userId: null };
      return send(res, 200, { actor: a }, { 'Set-Cookie': sessionCookie(await signSession(a), isSecure(req)) });
    }

    if (path === 'auth/logout' && method === 'POST') {
      return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(null, isSecure(req)) });
    }

    if (path === 'bootstrap') {
      const a = requireActor(actor);
      const rc = await readCtx(a);
      const rows = await allRows();
      return send(res, 200, { actor: a, rev: await currentRev(), entities: rows.map((r) => out(rc, r)).filter((e) => e.v !== null), serverNow: Date.now(), demoMode: DEMO_MODE() });
    }

    if (path === 'changes') {
      const a = requireActor(actor);
      const since = Number(url.searchParams.get('since') ?? 0);
      const rows = await rowsSince(since, 1500);
      if (rows.length >= 1500) return send(res, 200, { reset: true, serverNow: Date.now() });
      if (!rows.length) return send(res, 200, { rev: since, entities: [], serverNow: Date.now() });
      const rc = await readCtx(a);
      const entities = rows.map((r) => out(rc, r));
      // When the live state changes (e.g. an answer is revealed), resend the live activity with what may now be shown.
      if (a.role !== 'admin' && rows.some((r) => r.collection === 'live') && rc.live?.activityId) {
        const act = await prisma().$queryRaw<DbRow[]>`SELECT "collection","key","data","deleted","rev" FROM "entity" WHERE "collection" = 'activities' AND "key" = ${rc.live.activityId}`;
        if (act[0]) entities.push(out(rc, act[0]));
      }
      return send(res, 200, { rev: Number(rows[rows.length - 1].rev), entities, serverNow: Date.now() });
    }

    if (path === 'mutate' && method === 'POST') {
      const a = requireActor(actor);
      return send(res, 200, await handleMutate(a, await readBody(req)));
    }

    if (path === 'checkin' && method === 'POST') {
      return send(res, 200, await handleCheckin(requireActor(actor), await readBody(req)));
    }

    if (path === 'qr') {
      requireActor(actor, 'venue', 'trainer', 'admin');
      const eventId = url.searchParams.get('eventId') ?? '';
      const sessionId = url.searchParams.get('sessionId') ?? '';
      const slice = Math.floor(Date.now() / QR_WINDOW_MS);
      const code = await qrToken(eventId, sessionId, slice);
      return send(res, 200, { payload: `BMLR2:${eventId}:${sessionId}:${code}`, code, expiresIn: QR_WINDOW_MS - (Date.now() % QR_WINDOW_MS) });
    }

    if (path === 'admin/accounts') {
      requireActor(actor, 'admin');
      if (method === 'GET') {
        const list = await prisma().account.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] });
        return send(res, 200, { accounts: list.map((x) => ({ id: x.id, login: x.login, name: x.name, role: x.role, trainerId: x.trainerId, hasCode: !!x.passwordHash || (x.login === 'admin' && !!process.env.ADMIN_PASSWORD), disabled: x.disabled, lastLoginAt: x.lastLoginAt })) });
      }
      const b = await readBody(req);
      if (b.action === 'code') {
        const acc = await prisma().account.findUnique({ where: { id: String(b.id) } });
        if (!acc) throw new HttpError(404, 'Account not found.');
        if (acc.login === 'admin' && process.env.ADMIN_PASSWORD) throw new HttpError(400, 'The main admin signs in with ADMIN_PASSWORD from the Vercel environment.');
        const code = newAccessCode();
        await prisma().account.update({ where: { id: acc.id }, data: { passwordHash: hashPassword(normaliseCode(code)), disabled: false } });
        return send(res, 200, { code, login: acc.login });
      }
      if (b.action === 'create') {
        const login = String(b.login ?? '').trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,40}$/.test(login)) throw new HttpError(400, 'Sign-in ID: 3–40 letters, numbers, dots or dashes.');
        if (!['admin', 'leadership', 'trainer'].includes(b.role)) throw new HttpError(400, 'Choose a role.');
        if (b.role === 'trainer' && !b.trainerId) throw new HttpError(400, 'Link the trainer profile.');
        const code = newAccessCode();
        await prisma().account.create({ data: { id: `acc-${Date.now().toString(36)}`, login, name: String(b.name ?? login).slice(0, 80), role: b.role, trainerId: b.role === 'trainer' ? String(b.trainerId) : null, passwordHash: hashPassword(normaliseCode(code)) } }).catch(() => { throw new HttpError(409, 'That sign-in ID is already used.'); });
        return send(res, 200, { code, login });
      }
      if (b.action === 'disable' || b.action === 'enable') {
        if (String(b.id) === actor!.id) throw new HttpError(400, 'You cannot disable your own account.');
        await prisma().account.update({ where: { id: String(b.id) }, data: { disabled: b.action === 'disable' } });
        return send(res, 200, { ok: true });
      }
      throw new HttpError(400, 'Unknown action.');
    }

    if (path === 'admin/venue-code' && method === 'POST') {
      requireActor(actor, 'admin', 'trainer');
      const code = newAccessCode();
      await setSetting('venue:code', hashPassword(normaliseCode(code)));
      return send(res, 200, { code });
    }

    if (path === 'admin/reset' && method === 'POST') {
      requireActor(actor, 'admin');
      const b = await readBody(req);
      if (!DEMO_MODE() && b.confirm !== 'RESET') throw new HttpError(400, 'Type RESET to confirm.');
      await resetAll(b.demo !== false);
      return send(res, 200, { ok: true });
    }

    throw new HttpError(404, 'Not found.');
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : e?.status ?? 500;
    if (status >= 500) console.error(e);
    return send(res, status, { error: status >= 500 && !(e instanceof HttpError) ? 'Something went wrong on the server. Please try again.' : e.message });
  }
}

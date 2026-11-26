// Shared by client and server: how the client-side DB object maps to stored entities.
// Each entity is one row (collection, key) in Postgres. Clients send diffs; the server
// authorises each changed entity, stores it, and streams changes back by revision.
import type { DB } from './types.js';

export type Kind = 'array' | 'record' | 'single';
export interface CollectionDef { kind: Kind; keyOf?: (item: any) => string; ordered?: boolean; sort?: (a: any, b: any) => number }

const byId = (x: any) => String(x.id);

export const COLLECTIONS: Record<string, CollectionDef> = {
  regions: { kind: 'array', keyOf: byId, ordered: true },
  serviceCentres: { kind: 'array', keyOf: byId, ordered: true },
  users: { kind: 'array', keyOf: byId, ordered: true },
  trainers: { kind: 'array', keyOf: byId, ordered: true },
  leaders: { kind: 'array', keyOf: byId, ordered: true },
  events: { kind: 'array', keyOf: byId, ordered: true },
  sessions: { kind: 'array', keyOf: byId },
  activities: { kind: 'array', keyOf: byId, ordered: true },
  responses: { kind: 'array', keyOf: byId },
  scores: { kind: 'array', keyOf: (x) => String(x.key) },
  teams: { kind: 'array', keyOf: byId, ordered: true },
  feedback: { kind: 'array', keyOf: byId },
  announcements: { kind: 'array', keyOf: byId },
  qa: { kind: 'array', keyOf: byId },
  ideas: { kind: 'array', keyOf: byId },
  challenges: { kind: 'array', keyOf: byId },
  words: { kind: 'array', keyOf: byId },
  attendance: { kind: 'array', keyOf: byId },
  audit: { kind: 'array', keyOf: byId, sort: (a, b) => b.ts - a.ts },
  commitments: { kind: 'array', keyOf: byId },
  resources: { kind: 'array', keyOf: byId },
  photos: { kind: 'array', keyOf: byId },
  blocks: { kind: 'array', keyOf: byId, ordered: true },
  sessionTypes: { kind: 'array', keyOf: byId, ordered: true },
  rubric: { kind: 'array', keyOf: byId },
  selfAssess: { kind: 'array', keyOf: (x) => String(x.userId) },
  scenarioProgress: { kind: 'array', keyOf: (x) => `${x.userId}:${x.scenarioId}` },
  certificates: { kind: 'array', keyOf: byId },
  notes: { kind: 'record' },
  bookmarks: { kind: 'record' },
  readAnnouncements: { kind: 'record' },
  prefs: { kind: 'record' },
  decks: { kind: 'record' },
  vendorScores: { kind: 'record' },
  publishedAgenda: { kind: 'record' },
  live: { kind: 'single' },
  certRules: { kind: 'single' },
  roleplay: { kind: 'single' },
  meta: { kind: 'single' },
  demoClock: { kind: 'single' },
  demoClockSetAt: { kind: 'single' },
  currentEventId: { kind: 'single' },
  pendingAgendaChanges: { kind: 'single' },
};

export const SINGLE_KEY = '_';

/** Deterministic keys give database-level uniqueness (one answer per question per person, etc.). */
export const keys = {
  response: (activityId: string, questionId: string, userId: string) => `${activityId}:${questionId}:${userId}`,
  attendance: (sessionId: string, userId: string) => `${sessionId}:${userId}`,
  feedback: (eventId: string, sessionId: string | null, trainerId: string | null, userId: string) => `${eventId}:${sessionId ?? 'event'}:${trainerId ?? '-'}:${userId}`,
};

export interface Entity { c: string; k: string; v: any | null; o?: number; r?: number }

/** Flatten a DB object into entities. */
export function toEntities(db: Partial<DB>): Map<string, Map<string, any>> {
  const out = new Map<string, Map<string, any>>();
  for (const [c, def] of Object.entries(COLLECTIONS)) {
    const m = new Map<string, any>();
    const val = (db as any)[c];
    if (def.kind === 'array' && Array.isArray(val)) val.forEach((item, i) => m.set(def.keyOf!(item), def.ordered ? { ...item, _o: i } : item));
    else if (def.kind === 'record' && val && typeof val === 'object') Object.entries(val).forEach(([k, v]) => m.set(k, v));
    else if (def.kind === 'single' && val !== undefined) m.set(SINGLE_KEY, { value: val });
    out.set(c, m);
  }
  return out;
}

/** Build a DB object from entities (each with an insertion revision for stable ordering). */
export function fromEntities(rows: Entity[], base: Partial<DB> = {}): DB {
  const db: any = { ...base };
  const grouped = new Map<string, Entity[]>();
  rows.forEach((r) => { if (r.v === null || r.v === undefined) return; (grouped.get(r.c) ?? grouped.set(r.c, []).get(r.c)!).push(r); });
  for (const [c, def] of Object.entries(COLLECTIONS)) {
    const list = grouped.get(c) ?? [];
    if (def.kind === 'array') {
      const items = list.map((r) => ({ item: r.v, r: r.r ?? 0 }));
      if (def.ordered) items.sort((a, b) => (a.item._o ?? 1e9) - (b.item._o ?? 1e9) || a.r - b.r);
      else items.sort((a, b) => a.r - b.r);
      let arr = items.map(({ item }) => { const { _o, ...rest } = item; return rest; });
      if (def.sort) arr = arr.sort(def.sort);
      db[c] = arr;
    } else if (def.kind === 'record') {
      db[c] = Object.fromEntries(list.map((r) => [r.k, r.v]));
    } else {
      const one = list.find((r) => r.k === SINGLE_KEY);
      if (one) db[c] = one.v.value;
      else if (!(c in db)) db[c] = c === 'demoClock' ? null : undefined;
    }
  }
  return db as DB;
}

/** Apply incremental entity changes to an existing DB object (immutably). */
export function applyEntities(db: DB, changes: Entity[]): DB {
  if (!changes.length) return db;
  const next: any = { ...db };
  const byC = new Map<string, Entity[]>();
  changes.forEach((e) => (byC.get(e.c) ?? byC.set(e.c, []).get(e.c)!).push(e));
  for (const [c, list] of byC) {
    const def = COLLECTIONS[c];
    if (!def) continue;
    if (def.kind === 'single') { const last = list[list.length - 1]; next[c] = last.v === null ? (c === 'demoClock' ? null : next[c]) : last.v.value; continue; }
    if (def.kind === 'record') { const rec = { ...(next[c] ?? {}) }; list.forEach((e) => { if (e.v === null) delete rec[e.k]; else rec[e.k] = e.v; }); next[c] = rec; continue; }
    let arr: any[] = [...(next[c] ?? [])];
    list.forEach((e) => {
      const i = arr.findIndex((x) => def.keyOf!(x) === e.k);
      if (e.v === null) { if (i >= 0) arr.splice(i, 1); return; }
      const { _o, ...item } = e.v;
      if (i >= 0) arr[i] = { ...item, __o: _o };
      else arr.push({ ...item, __o: _o });
    });
    if (def.ordered) {
      const withIdx = arr.map((x, i) => ({ x, o: x.__o ?? (typeof x._oi === 'number' ? x._oi : i) }));
      withIdx.sort((a, b) => a.o - b.o);
      arr = withIdx.map(({ x }) => x);
    }
    arr = arr.map(({ __o, ...rest }) => rest);
    if (def.sort) arr.sort(def.sort);
    next[c] = arr;
  }
  return next as DB;
}

/** Entities that differ between two DB objects. */
export function diffDb(prev: DB, next: DB): Entity[] {
  const a = toEntities(prev);
  const b = toEntities(next);
  const out: Entity[] = [];
  for (const c of Object.keys(COLLECTIONS)) {
    const pa = a.get(c)!; const nb = b.get(c)!;
    nb.forEach((v, k) => { const old = pa.get(k); if (old === undefined || JSON.stringify(old) !== JSON.stringify(v)) out.push({ c, k, v }); });
    pa.forEach((_, k) => { if (!nb.has(k)) out.push({ c, k, v: null }); });
  }
  return out;
}

export function emptyDb(): DB {
  return fromEntities([], {}) as DB;
}

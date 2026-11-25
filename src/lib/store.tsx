import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DB, LiveState, Role, Session, TrainingEvent, User } from './types';
import { buildSeed, DB_VERSION } from './seed';
import { sessionStatus } from './time';

/*
 * Local persistence + same-device tab sync.
 *
 * - State is saved to localStorage (when the browser allows it).
 * - Changes are broadcast to other tabs of the same origin on the same device via
 *   BroadcastChannel. This is LOCAL DEMO SYNCHRONISATION, not cross-device real-time.
 *   Production replaces this with an authenticated realtime service (see docs/ARCHITECTURE.md).
 */

const KEY = 'bml-refresher-db-v4';
const CHANNEL = 'bml-refresher-sync';
const TAB_ID = Math.random().toString(36).slice(2);

function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): boolean {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}

function load(): { db: DB; restored: boolean } {
  const raw = safeGet(KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DB;
      if (parsed?.meta?.version === DB_VERSION) return { db: parsed, restored: true };
    } catch { /* fall through to seed */ }
  }
  return { db: buildSeed(), restored: false };
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface Toast { id: string; text: string; tone: 'ok' | 'info' | 'warn' | 'err' }

interface Ctx {
  db: DB;
  update: (fn: (d: DB) => void) => void;
  reset: () => void;
  role: Role;
  setRole: (r: Role) => void;
  me: User;
  trainerId: string;
  setTrainerId: (id: string) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  persisted: boolean;
  syncAvailable: boolean;
  online: boolean;
  celebrate: () => void;
  confetti: number;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children, initialRole }: { children: React.ReactNode; initialRole?: Role }) {
  const [{ db: initial }] = useState(load);
  const [db, setDb] = useState<DB>(initial);
  const [persisted, setPersisted] = useState(true);
  const chan = useRef<BroadcastChannel | null>(null);
  const fromRemote = useRef(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [confetti, setConfetti] = useState(0);

  const ui = useMemo(() => { try { return JSON.parse(safeGet('bml-refresher-ui') || '{}'); } catch { return {}; } }, []);
  const [role, setRoleState] = useState<Role>(initialRole ?? ui.role ?? 'participant');
  const [trainerId, setTrainerIdState] = useState<string>(ui.trainerId ?? 't-zima');

  useEffect(() => { safeSet('bml-refresher-ui', JSON.stringify({ role: role === 'venue' ? 'participant' : role, trainerId })); }, [role, trainerId]);

  // Persist + broadcast.
  useEffect(() => {
    const ok = safeSet(KEY, JSON.stringify(db));
    setPersisted(ok);
    if (fromRemote.current) { fromRemote.current = false; return; }
    try { chan.current?.postMessage({ from: TAB_ID, db }); } catch { /* ignore */ }
  }, [db]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const c = new BroadcastChannel(CHANNEL);
    chan.current = c;
    c.onmessage = (e) => {
      if (!e.data || e.data.from === TAB_ID) return;
      if (e.data.type === 'hello') { try { c.postMessage({ from: TAB_ID, db: dbRef.current }); } catch { /* ignore */ } return; }
      if (e.data.db && e.data.db.meta?.rev >= dbRef.current.meta.rev - 1) { fromRemote.current = true; setDb(e.data.db); }
    };
    c.postMessage({ from: TAB_ID, type: 'hello' });
    return () => c.close();
  }, []);
  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const update = useCallback((fn: (d: DB) => void) => {
    setDb((prev) => {
      const next = structuredClone(prev);
      fn(next);
      next.meta.rev = prev.meta.rev + 1;
      return next;
    });
  }, []);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = uid('t');
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const reset = useCallback(() => {
    const fresh = buildSeed();
    fresh.meta.rev = dbRef.current.meta.rev + 1;
    setDb(fresh);
  }, []);

  const celebrate = useCallback(() => setConfetti((c) => c + 1), []);

  const me = db.users.find((u) => u.id === 'u01')!;

  const value: Ctx = {
    db, update, reset, role, setRole: setRoleState, me, trainerId, setTrainerId: setTrainerIdState,
    toast, toasts, dismissToast, persisted, syncAvailable: typeof BroadcastChannel !== 'undefined', online, celebrate, confetti,
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}

// ---------- Clock ----------

/** The demo clock advances in real time from the chosen start point. */
export function demoNow(db: DB, real = Date.now()): number {
  if (!db.demoClock) return real;
  const anchor = db.demoClockSetAt ?? db.meta.seededAt;
  const base = new Date(db.demoClock).getTime();
  // Keep the demo moving, but cap drift at 3 hours so a reopened tab stays in a sensible place.
  return base + Math.min(real - anchor, 3 * 3600_000);
}

export function useTick(ms = 1000) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setT(Date.now()), ms); return () => clearInterval(i); }, [ms]);
  return t;
}

export function useNow() {
  const { db } = useStore();
  const real = useTick(1000);
  return demoNow(db, real);
}

// ---------- Selectors ----------

export function useEvent(): TrainingEvent {
  const { db } = useStore();
  return db.events.find((e) => e.id === db.currentEventId) ?? db.events[0];
}

export function eventSessions(db: DB, eventId: string) {
  return db.sessions.filter((s) => s.eventId === eventId).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start) || a.order - b.order);
}

/** Published agenda (what participants, trainers and the venue see). Falls back to the draft if never published. */
export function publishedSessions(db: DB, eventId: string): Session[] {
  const snap = db.publishedAgenda?.[eventId];
  if (!snap) return eventSessions(db, eventId);
  return [...snap].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start) || a.order - b.order);
}

export function useSessions(): Session[] {
  const { db, role } = useStore();
  const ev = useEvent();
  return useMemo(() => (role === 'admin' ? eventSessions(db, ev.id) : publishedSessions(db, ev.id)), [db.sessions, db.publishedAgenda, ev.id, role]);
}

export type EventPhase = 'before' | 'during' | 'after';
export function eventPhase(ev: TrainingEvent, sessions: Session[], now: number): EventPhase {
  if (!sessions.length) return 'before';
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  if (sessionStatus(ev, first, now) === 'upcoming') return 'before';
  if (sessionStatus(ev, last, now) === 'done') return 'after';
  return 'during';
}

export function currentAndNext(ev: TrainingEvent, sessions: Session[], now: number) {
  const live = sessions.find((s) => sessionStatus(ev, s, now) === 'live') ?? null;
  const next = sessions.find((s) => sessionStatus(ev, s, now) === 'upcoming') ?? null;
  return { live, next };
}

// ---------- Mutating helpers (call inside update) ----------

export function awardPoints(d: DB, key: string, userId: string | null, teamId: string | null, points: number, reason: string): boolean {
  if (d.scores.some((s) => s.key === key)) return false; // duplicate protection
  d.scores.push({ key, userId, teamId, points, reason, ts: Date.now() });
  return true;
}

export function audit(d: DB, actor: string, action: string, detail: string, reason?: string) {
  d.audit.unshift({ id: uid('au'), ts: Date.now(), actor, action, detail, reason });
}

export function setLive(d: DB, patch: Partial<LiveState>) {
  d.live = { ...d.live, ...patch, rev: d.live.rev + 1, updatedAt: Date.now() };
}

export function teamPoints(db: DB) {
  const totals: Record<string, number> = Object.fromEntries(db.teams.map((t) => [t.id, 0]));
  db.scores.forEach((s) => { if (s.teamId && totals[s.teamId] !== undefined) totals[s.teamId] += s.points; });
  Object.entries(db.vendorScores).forEach(([t, p]) => { if (totals[t] !== undefined) totals[t] += p; });
  return db.teams.map((t) => ({ ...t, points: totals[t.id] })).sort((a, b) => b.points - a.points);
}

export function userPoints(db: DB, userId: string) {
  return db.scores.filter((s) => s.userId === userId).reduce((a, s) => a + s.points, 0);
}

// ---------- Attendance QR (demo) ----------

const QR_WINDOW_MS = 30_000;
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
}
export function qrToken(eventId: string, sessionId: string, real = Date.now()) {
  const slice = Math.floor(real / QR_WINDOW_MS);
  return { token: `${hash(`${eventId}|${sessionId}|${slice}|demo-only`)}`, expiresIn: QR_WINDOW_MS - (real % QR_WINDOW_MS) };
}
export function qrPayload(eventId: string, sessionId: string, real = Date.now()) {
  return `BMLR1:${eventId}:${sessionId}:${qrToken(eventId, sessionId, real).token}`;
}
export function validateQr(payload: string, real = Date.now()): { ok: boolean; eventId?: string; sessionId?: string; reason?: string } {
  const parts = payload.trim().split(':');
  if (parts.length !== 4 || parts[0] !== 'BMLR1') return { ok: false, reason: 'This is not a BML Refresher attendance code.' };
  const [, eventId, sessionId, token] = parts;
  const cur = qrToken(eventId, sessionId, real).token;
  const prev = qrToken(eventId, sessionId, real - QR_WINDOW_MS).token;
  if (token !== cur && token !== prev) return { ok: false, reason: 'This code has expired. Scan the code currently shown on the venue screen.' };
  return { ok: true, eventId, sessionId };
}

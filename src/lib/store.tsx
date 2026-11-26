import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DB, LiveState, Role, Session, TrainingEvent, User } from './types';
import { sessionStatus } from './time';
import { applyEntities, diffDb, fromEntities, type Entity } from './collections';

/*
 * Server-backed store.
 *
 * - On sign-in the client loads a role-filtered snapshot (/api/bootstrap).
 * - Every change made with update(fn) is applied optimistically, diffed into entities and
 *   sent to /api/mutate, where the server authorises it, scores it and stores it in Postgres.
 * - Changes from everyone else arrive by polling /api/changes?since=<revision> every ~2 seconds,
 *   so phones, trainer devices and the venue screen stay in sync across devices.
 */

export interface Actor { id: string; role: Exclude<Role, never> | 'venue'; name: string; trainerId: string | null; userId: string | null }

// ---------- server clock ----------
let clockOffset = 0;
export const serverNow = () => Date.now() + clockOffset;

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'You appear to be offline. Check your connection and try again.');
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

interface Toast { id: string; text: string; tone: 'ok' | 'info' | 'warn' | 'err' }
export type Status = 'loading' | 'signedOut' | 'ready' | 'nodb' | 'error';

interface Ctx {
  status: Status;
  statusMessage: string;
  actor: Actor | null;
  demoMode: boolean;
  db: DB;
  update: (fn: (d: DB) => void) => Promise<{ entities: Entity[] } | null>;
  applyRemote: (entities: Entity[]) => void;
  refresh: () => Promise<void>;
  reset: (demo?: boolean) => Promise<void>;
  signIn: (actor: Actor) => Promise<void>;
  signOut: () => Promise<void>;
  role: Role;
  setRole: (r: Role) => void;
  allowedRoles: Role[];
  me: User;
  trainerId: string;
  setTrainerId: (id: string) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  online: boolean;
  syncing: boolean;
  celebrate: () => void;
  confetti: number;
}

const StoreCtx = createContext<Ctx | null>(null);

function rolesFor(a: Actor | null): Role[] {
  if (!a) return [];
  if (a.role === 'admin') return ['admin', 'trainer', 'leadership', 'venue'];
  if (a.role === 'trainer') return ['trainer', 'venue'];
  if (a.role === 'venue') return ['venue'];
  return [a.role as Role];
}

const BLANK_USER: User = { id: '', name: '', staffId: '', email: '', regionId: '', scId: '', designation: '', teamId: null, status: 'confirmed', eventIds: [], demo: true };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [statusMessage, setStatusMessage] = useState('');
  const [actor, setActor] = useState<Actor | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [db, setDb] = useState<DB>(() => fromEntities([]));
  const dbRef = useRef(db);
  dbRef.current = db;
  const revRef = useRef(0);
  const pending = useRef(new Map<string, number>()); // entity id -> in-flight writes
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [confetti, setConfetti] = useState(0);

  const prefsKey = 'bml-refresher-ui';
  const ui = useMemo(() => { try { return JSON.parse(localStorage.getItem(prefsKey) || '{}'); } catch { return {}; } }, []);
  const [roleState, setRoleState] = useState<Role>(ui.role ?? 'participant');
  const [trainerSel, setTrainerSel] = useState<string>(ui.trainerId ?? 't-zima');
  useEffect(() => { try { localStorage.setItem(prefsKey, JSON.stringify({ role: roleState, trainerId: trainerSel })); } catch { /* storage blocked */ } }, [roleState, trainerSel]);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = uid('t');
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const setDbBoth = (next: DB) => { dbRef.current = next; setDb(next); };

  const bootstrap = useCallback(async () => {
    const data = await api<{ actor: Actor; rev: number; entities: Entity[]; serverNow: number; demoMode: boolean }>('bootstrap');
    clockOffset = data.serverNow - Date.now();
    revRef.current = data.rev;
    setDbBoth(fromEntities(data.entities));
    setActor(data.actor);
    setDemoMode(data.demoMode);
    setStatus('ready');
  }, []);

  // Initial session check.
  useEffect(() => {
    (async () => {
      try {
        const s = await api<{ actor: Actor | null; demoMode: boolean }>('session');
        setDemoMode(s.demoMode);
        if (!s.actor) { setStatus('signedOut'); return; }
        await bootstrap();
      } catch (e) {
        const err = e as ApiError;
        setStatusMessage(err.message);
        setStatus(err.status === 503 ? 'nodb' : err.status === 401 ? 'signedOut' : 'error');
      }
    })();
  }, [bootstrap]);

  // Keep the selected role valid for this account.
  const allowedRoles = rolesFor(actor);
  const role: Role = allowedRoles.includes(roleState) ? roleState : (allowedRoles[0] ?? 'participant');
  const trainerId = actor?.role === 'trainer' ? (actor.trainerId ?? '') : trainerSel;

  // Poll for changes.
  useEffect(() => {
    if (status !== 'ready') return;
    let stop = false;
    let timer: number;
    const tick = async () => {
      if (stop) return;
      const interval = role === 'venue' ? 1200 : document.hidden ? 8000 : 2000;
      try {
        const data = await api<{ rev?: number; entities?: Entity[]; serverNow: number; reset?: boolean }>(`changes?since=${revRef.current}`);
        clockOffset = data.serverNow - Date.now();
        setOnline(true);
        if (data.reset) await bootstrap();
        else if (data.entities?.length) {
          // Skip entities with a write in flight; the mutate response brings the authoritative copy.
          const incoming = data.entities.filter((e) => !pending.current.get(`${e.c}\u0000${e.k}`));
          revRef.current = data.rev ?? revRef.current;
          if (incoming.length) setDbBoth(applyEntities(dbRef.current, incoming));
        }
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 401) { setStatus('signedOut'); setActor(null); return; }
        setOnline(false);
      }
      timer = window.setTimeout(tick, interval);
    };
    timer = window.setTimeout(tick, 1500);
    const vis = () => { if (!document.hidden) { window.clearTimeout(timer); tick(); } };
    document.addEventListener('visibilitychange', vis);
    return () => { stop = true; window.clearTimeout(timer); document.removeEventListener('visibilitychange', vis); };
  }, [status, role, bootstrap]);

  const applyRemote = useCallback((entities: Entity[]) => setDbBoth(applyEntities(dbRef.current, entities)), []);

  const update = useCallback((fn: (d: DB) => void) => {
    const prev = dbRef.current;
    const next = structuredClone(prev);
    fn(next);
    const changes = diffDb(prev, next);
    if (!changes.length) return Promise.resolve(null);
    setDbBoth(next);
    const ids = changes.map((c) => `${c.c}\u0000${c.k}`);
    ids.forEach((id) => pending.current.set(id, (pending.current.get(id) ?? 0) + 1));
    const run = async () => {
      setSyncing(true);
      try {
        const res = await api<{ rev: number; entities: Entity[] }>('mutate', { changes, clientNow: Date.now() });
        setOnline(true);
        if (res.entities.length) setDbBoth(applyEntities(dbRef.current, res.entities));
        return res;
      } catch (e) {
        const err = e as ApiError;
        toast(err.message, err.status === 0 ? 'warn' : 'err');
        if (err.status === 0) setOnline(false);
        if (err.status === 401) { setStatus('signedOut'); setActor(null); return null; }
        // Undo the optimistic change by reloading the authoritative state.
        try { await bootstrap(); } catch { /* keep local */ }
        return null;
      } finally {
        ids.forEach((id) => { const n = (pending.current.get(id) ?? 1) - 1; if (n <= 0) pending.current.delete(id); else pending.current.set(id, n); });
        setSyncing(pending.current.size > 0);
      }
    };
    const p = queue.current.then(run, run);
    queue.current = p.catch(() => null);
    return p;
  }, [bootstrap, toast]);

  const signIn = useCallback(async (a: Actor) => {
    setActor(a);
    setRoleState(a.role === 'admin' ? 'admin' : (a.role as Role));
    setStatus('loading');
    try { await bootstrap(); } catch (e) { setStatusMessage((e as Error).message); setStatus('error'); }
  }, [bootstrap]);

  const signOut = useCallback(async () => {
    try { await api('auth/logout', {}); } catch { /* ignore */ }
    setActor(null);
    setDbBoth(fromEntities([]));
    setStatus('signedOut');
  }, []);

  const reset = useCallback(async (demo = true) => {
    await api('admin/reset', { demo, confirm: 'RESET' });
    await bootstrap();
  }, [bootstrap]);

  const celebrate = useCallback(() => setConfetti((c) => c + 1), []);

  const me = (actor?.userId && db.users?.find((u) => u.id === actor.userId)) || { ...BLANK_USER, id: actor?.id ?? '', name: actor?.name ?? '' };

  const value: Ctx = {
    status, statusMessage, actor, demoMode, db, update, applyRemote, refresh: bootstrap, reset, signIn, signOut,
    role, setRole: setRoleState, allowedRoles, me, trainerId, setTrainerId: setTrainerSel,
    toast, toasts, dismissToast, online, syncing, celebrate, confetti,
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}

// ---------- Clock ----------

/** In demo mode an organiser can set a demo clock, which then runs in real time. */
export function demoNow(db: DB, real = serverNow()): number {
  if (!db.demoClock) return real;
  const anchor = db.demoClockSetAt ?? db.meta?.seededAt ?? real;
  const base = new Date(db.demoClock).getTime();
  return base + Math.min(real - anchor, 3 * 3600_000);
}

/** Ticks with the server-corrected clock. */
export function useTick(ms = 1000) {
  const [t, setT] = useState(serverNow());
  useEffect(() => { const i = setInterval(() => setT(serverNow()), ms); return () => clearInterval(i); }, [ms]);
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
  return useMemo(() => (!ev ? [] : role === 'admin' ? eventSessions(db, ev.id) : publishedSessions(db, ev.id)), [db.sessions, db.publishedAgenda, ev, role]);
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

/** Organiser/trainer awards only. Participant points are awarded by the server. */
export function awardPoints(d: DB, key: string, userId: string | null, teamId: string | null, points: number, reason: string): boolean {
  if (d.scores.some((s) => s.key === key)) return false; // duplicate protection (also enforced by the database key)
  d.scores.push({ key, userId, teamId, points, reason, ts: Date.now() });
  return true;
}

export function audit(d: DB, actor: string, action: string, detail: string, reason?: string) {
  d.audit.unshift({ id: uid('au'), ts: Date.now(), actor, action, detail, reason });
}

export function setLive(d: DB, patch: Partial<LiveState>) {
  d.live = { ...d.live, ...patch, rev: (d.live?.rev ?? 0) + 1, updatedAt: Date.now() };
}

export function teamPoints(db: DB) {
  const totals: Record<string, number> = Object.fromEntries(db.teams.map((t) => [t.id, 0]));
  db.scores.forEach((s) => { if (s.teamId && totals[s.teamId] !== undefined) totals[s.teamId] += s.points; });
  Object.entries(db.vendorScores ?? {}).forEach(([t, p]) => { if (totals[t] !== undefined) totals[t] += p; });
  return db.teams.map((t) => ({ ...t, points: totals[t.id] })).sort((a, b) => b.points - a.points);
}

export function userPoints(db: DB, userId: string) {
  return db.scores.filter((s) => s.userId === userId).reduce((a, s) => a + s.points, 0);
}

// ---------- Attendance QR ----------

/** Rotating, server-signed attendance code for a session (venue, trainers and organisers only). */
export function useQr(eventId: string | undefined, sessionId: string | undefined) {
  const [qr, setQr] = useState<{ payload: string; code: string; expiresAt: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!eventId || !sessionId) { setQr(null); return; }
    let stop = false;
    let t: number;
    const load = async () => {
      try {
        const r = await api<{ payload: string; code: string; expiresIn: number }>(`qr?eventId=${encodeURIComponent(eventId)}&sessionId=${encodeURIComponent(sessionId)}`);
        if (stop) return;
        setQr({ payload: r.payload, code: r.code, expiresAt: Date.now() + r.expiresIn });
        setError('');
        t = window.setTimeout(load, Math.max(1000, r.expiresIn + 200));
      } catch (e) {
        if (stop) return;
        setError((e as Error).message);
        t = window.setTimeout(load, 5000);
      }
    };
    load();
    return () => { stop = true; window.clearTimeout(t); };
  }, [eventId, sessionId]);
  return { qr, error, url: qr ? `${window.location.origin}/?checkin=${encodeURIComponent(qr.payload)}` : '' };
}

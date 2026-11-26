import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { secret } from './db.js';

export type Role = 'participant' | 'trainer' | 'admin' | 'leadership' | 'venue';
export interface Actor { id: string; role: Role; name: string; trainerId: string | null; userId: string | null }

const COOKIE = 'bmlr_session';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
export function verifyPassword(pw: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const got = scryptSync(pw, salt, 32);
  const want = Buffer.from(hash, 'hex');
  return got.length === want.length && timingSafeEqual(got, want);
}
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Human-friendly access code, e.g. 7KQ-4MZ (no ambiguous characters). */
export function newAccessCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = randomBytes(6);
  const s = Array.from(b, (x) => chars[x % chars.length]).join('');
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}
export const normaliseCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function signSession(actor: Actor) {
  const payload = Buffer.from(JSON.stringify({ ...actor, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString('base64url');
  const sig = createHmac('sha256', await secret('session')).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export async function readSession(cookieHeader: string | undefined): Promise<Actor | null> {
  const raw = parseCookies(cookieHeader)[COOKIE];
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const want = createHmac('sha256', await secret('session')).update(payload).digest('base64url');
  if (!safeEqual(sig, want)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Date.now() / 1000) return null;
    return { id: data.id, role: data.role, name: data.name, trainerId: data.trainerId ?? null, userId: data.userId ?? null };
  } catch { return null; }
}

export function sessionCookie(token: string | null, secure: boolean) {
  const attrs = [`${COOKIE}=${token ?? ''}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${token ? MAX_AGE : 0}`];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function parseCookies(h: string | undefined) {
  const out: Record<string, string> = {};
  (h ?? '').split(';').forEach((p) => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}

export const QR_WINDOW_MS = 30_000;
/** Rotating attendance token, signed with a server secret and bound to event, session and time window. */
export async function qrToken(eventId: string, sessionId: string, slice: number) {
  return createHmac('sha256', await secret('qr')).update(`${eventId}|${sessionId}|${slice}`).digest('hex').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').padEnd(7, 'X').slice(0, 7);
}

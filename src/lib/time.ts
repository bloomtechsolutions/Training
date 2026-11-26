// All agenda times are Maldives local time (MVT, UTC+5, no DST).
import type { Session, TrainingEvent } from './types.js';

export const MVT_OFFSET_MIN = 5 * 60;

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}
export function fromMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Epoch ms for a Maldives-local date (YYYY-MM-DD) and time (HH:MM). */
export function mvtEpoch(date: string, hhmm: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  return Date.UTC(y, mo - 1, d, 0, 0) + (toMin(hhmm) - MVT_OFFSET_MIN) * 60000;
}

/** Break an epoch into Maldives-local date string and minutes-of-day. */
export function mvtParts(epoch: number): { date: string; min: number; sec: number } {
  const d = new Date(epoch + MVT_OFFSET_MIN * 60000);
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  return { date, min: d.getUTCHours() * 60 + d.getUTCMinutes(), sec: d.getUTCSeconds() };
}

export function sessionStart(ev: TrainingEvent, s: Session) {
  return mvtEpoch(ev.days[s.day - 1]?.date ?? ev.days[0].date, s.start);
}
export function sessionEnd(ev: TrainingEvent, s: Session) {
  return mvtEpoch(ev.days[s.day - 1]?.date ?? ev.days[0].date, s.end);
}

export type SessionStatus = 'upcoming' | 'live' | 'done';
export function sessionStatus(ev: TrainingEvent, s: Session, now: number): SessionStatus {
  if (now >= sessionEnd(ev, s)) return 'done';
  if (now >= sessionStart(ev, s)) return 'live';
  return 'upcoming';
}

export function durationLabel(start: string, end: string): string {
  const d = toMin(end) - toMin(start);
  if (d <= 0) return '—';
  const h = Math.floor(d / 60);
  const m = d % 60;
  if (h && m) return `${h} hr${h > 1 ? 's' : ''} ${m} mins`;
  if (h) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${m} mins`;
}

export function formatDay(date: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
}

export function formatClock(epoch: number) {
  const p = mvtParts(epoch);
  return fromMin(p.min);
}

export function formatDateTime(epoch: number) {
  const p = mvtParts(epoch);
  return `${formatDay(p.date)} · ${fromMin(p.min)}`;
}

export function countdownParts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function relTime(ts: number, now = Date.now()) {
  const diff = Math.round((now - ts) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  const h = Math.round(diff / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  return formatDateTime(ts);
}

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n, 12));
  return t.toISOString().slice(0, 10);
}

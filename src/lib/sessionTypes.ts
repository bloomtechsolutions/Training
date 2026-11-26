import type { DB, Session, SessionType } from './types.js';
import { DEFAULT_SESSION_TYPES } from './seed.js';

/** Organiser-defined types, falling back to the built-in three for older data. */
export function sessionTypes(db: Pick<DB, 'sessionTypes'>): SessionType[] {
  return db.sessionTypes?.length ? db.sessionTypes : DEFAULT_SESSION_TYPES;
}

export function typeOf(db: Pick<DB, 'sessionTypes'>, s: Pick<Session, 'kind' | 'typeId'>): SessionType {
  const list = sessionTypes(db);
  return list.find((t) => t.id === s.typeId) ?? list.find((t) => t.behavior === s.kind) ?? DEFAULT_SESSION_TYPES.find((t) => t.behavior === s.kind)!;
}

/** True when the item should show a type badge (anything other than a plain numbered session). */
export function showTypeBadge(db: Pick<DB, 'sessionTypes'>, s: Pick<Session, 'kind' | 'typeId'>) {
  const t = typeOf(db, s);
  return t.behavior !== 'session' || t.id !== 'type-session';
}

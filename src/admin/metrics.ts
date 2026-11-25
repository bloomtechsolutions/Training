import type { DB } from '../lib/types';
import { eventSessions } from '../lib/store';

export function computeMetrics(db: DB, eventId: string, regionId: string | 'all') {
  const users = db.users.filter((u) => u.eventIds.includes(eventId) && (regionId === 'all' || u.regionId === regionId));
  const ids = new Set(users.map((u) => u.id));
  const sessions = eventSessions(db, eventId).filter((s) => s.kind !== 'break');
  const att = db.attendance.filter((a) => a.eventId === eventId && ids.has(a.userId));
  const confirmed = users.filter((u) => u.status === 'confirmed').length;
  // Sessions that have had any check-in so far count as "held".
  const held = sessions.filter((s) => db.attendance.some((a) => a.sessionId === s.id));
  const possible = held.length * confirmed;
  const attendanceRate = possible ? Math.round((att.filter((a) => held.some((h) => h.id === a.sessionId)).length / possible) * 100) : 0;
  const punctuality = att.length ? Math.round((att.filter((a) => !a.late).length / att.length) * 100) : 0;
  const fb = db.feedback.filter((f) => f.eventId === eventId && f.sessionId && ids.has(f.userId));
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const fbAvg = avg(fb.flatMap((f) => Object.values(f.ratings) as number[]));
  const responders = new Set([...db.responses.filter((r) => ids.has(r.userId)).map((r) => r.userId), ...db.words.filter((w) => ids.has(w.userId)).map((w) => w.userId), ...db.ideas.filter((i) => ids.has(i.userId)).map((i) => i.userId)]);
  const participation = confirmed ? Math.round((responders.size / confirmed) * 100) : 0;
  const ideas = db.ideas.filter((i) => i.eventId === eventId && ids.has(i.userId));
  const commitments = db.commitments.filter((c) => c.eventId === eventId && ids.has(c.userId));
  const quizResponses = db.responses.filter((r) => ids.has(r.userId) && r.correct !== undefined);
  const knowledge = quizResponses.length ? Math.round((quizResponses.filter((r) => r.correct).length / quizResponses.length) * 100) : null;
  const byRegion = db.regions.map((r) => {
    const ru = db.users.filter((u) => u.eventIds.includes(eventId) && u.regionId === r.id);
    const rids = new Set(ru.map((u) => u.id));
    const ra = db.attendance.filter((a) => a.eventId === eventId && rids.has(a.userId)).length;
    const rp = held.length * ru.filter((u) => u.status === 'confirmed').length;
    return { id: r.id, name: r.name, participants: ru.length, rate: rp ? Math.round((ra / rp) * 100) : 0 };
  });
  const bySession = sessions.map((s) => ({ s, count: db.attendance.filter((a) => a.sessionId === s.id && ids.has(a.userId)).length, late: db.attendance.filter((a) => a.sessionId === s.id && a.late && ids.has(a.userId)).length }));
  return { users, confirmed, sessions, held, attendanceRate, punctuality, fb, fbAvg, participation, ideas, commitments, knowledge, byRegion, bySession, responders: responders.size };
}

/** Clearly-labelled demonstration values for multi-event trend charts (no real data). */
export const DEMO_HISTORY = [
  { region: 'North', events: 2, participants: 58, attendance: 93, pre: 61, post: 79 },
  { region: 'North Central', events: 2, participants: 64, attendance: 91, pre: 58, post: 77 },
  { region: 'Central', events: 1, participants: 31, attendance: 95, pre: 63, post: 81 },
  { region: 'South Central', events: 1, participants: 29, attendance: 89, pre: 57, post: 74 },
  { region: 'South', events: 2, participants: 61, attendance: 94, pre: 60, post: 80 },
  { region: 'Malé', events: 1, participants: 42, attendance: 90, pre: 66, post: 82 },
];

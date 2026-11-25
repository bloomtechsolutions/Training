import type { DB } from './types';
import { eventSessions } from './store';

/** Evaluates the configurable certificate rules for one participant. Approval is still an organiser action. */
export function certEligibility(db: DB, userId: string, eventId: string) {
  const sessions = eventSessions(db, eventId).filter((s) => s.kind !== 'break');
  const attended = db.attendance.filter((a) => a.userId === userId && a.eventId === eventId && a.status !== 'absent').length;
  const pct = sessions.length ? Math.round((attended / sessions.length) * 100) : 0;
  const feedback = db.feedback.some((f) => f.userId === userId && f.eventId === eventId && f.sessionId === null);
  const commitment = db.commitments.some((c) => c.userId === userId && c.eventId === eventId);
  const r = db.certRules;
  const checks = [
    { label: `Attendance at least ${r.minAttendancePct}% (currently ${pct}%)`, ok: pct >= r.minAttendancePct, required: true },
    { label: 'Overall event feedback submitted', ok: feedback, required: r.requireFeedback },
    { label: 'At least one 30/60/90-day commitment', ok: commitment, required: r.requireCommitment },
  ];
  return { pct, checks, eligible: checks.every((c) => !c.required || c.ok) };
}

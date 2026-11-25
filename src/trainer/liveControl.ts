import type { Activity, DB, VenueMode } from '../lib/types';
import { setLive, audit } from '../lib/store';

export function modeFor(a: Activity): VenueMode {
  return a.type === 'quiz' ? 'quiz' : a.type === 'poll' ? 'poll' : a.type === 'wordcloud' ? 'wordcloud' : 'qa';
}

export function launchActivity(d: DB, a: Activity, actor: string) {
  const q = a.questions[0];
  setLive(d, { sessionId: a.sessionId, activityId: a.id, questionIndex: 0, phase: 'open', deadline: q ? Date.now() + q.seconds * 1000 : null, pausedRemaining: null, venueMode: modeFor(a) });
  audit(d, actor, 'activity.launch', `Launched “${a.title}”`);
}

export function openQuestion(d: DB, a: Activity, index: number) {
  const q = a.questions[index];
  if (!q) return;
  setLive(d, { activityId: a.id, questionIndex: index, phase: 'open', deadline: Date.now() + q.seconds * 1000, pausedRemaining: null, venueMode: modeFor(a) });
}

export function pause(d: DB) {
  if (d.live.phase !== 'open') return;
  setLive(d, { phase: 'paused', pausedRemaining: Math.max(0, (d.live.deadline ?? Date.now()) - Date.now()), deadline: null });
}
export function resume(d: DB) {
  if (d.live.phase !== 'paused') return;
  setLive(d, { phase: 'open', deadline: Date.now() + (d.live.pausedRemaining ?? 15000), pausedRemaining: null });
}
export function closeVoting(d: DB) { setLive(d, { phase: 'closed', deadline: null, pausedRemaining: null }); }
export function reveal(d: DB) { setLive(d, { phase: 'revealed', deadline: null, pausedRemaining: null }); }
export function endActivity(d: DB) { setLive(d, { activityId: null, phase: 'idle', deadline: null, pausedRemaining: null, questionIndex: 0, venueMode: d.live.sessionId ? 'presentation' : 'welcome' }); }

import { useSyncExternalStore } from 'react';
import { useStore, useSessions } from '../lib/store';

// Per-tab selection of the session a trainer is working on.
let selected: string | null = null;
const listeners = new Set<() => void>();
export function setTrainerSession(id: string) { selected = id; listeners.forEach((l) => l()); }
function sub(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useTrainerContext() {
  const { db, trainerId } = useStore();
  const sessions = useSessions();
  const sel = useSyncExternalStore(sub, () => selected);
  const trainer = db.trainers.find((t) => t.id === trainerId)!;
  const assigned = sessions.filter((s) => s.kind === 'session' && s.trainerIds.includes(trainerId));
  const current = assigned.find((s) => s.id === sel) ?? assigned.find((s) => s.id === db.live.sessionId) ?? assigned[0] ?? null;
  return { trainer, assigned, session: current, setSession: setTrainerSession, allSessions: sessions };
}

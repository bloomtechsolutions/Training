import React from 'react';
import { Lock } from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar, cx } from '../components/ui';
import { useTrainerContext } from './useTrainer';

export function TrainerBar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const { db, trainerId, setTrainerId, actor } = useStore();
  const locked = actor?.role === 'trainer';
  const { trainer, assigned, session, setSession, allSessions } = useTrainerContext();
  const staff = db.trainers.filter((t) => t.kind === 'staff');
  const others = allSessions.filter((s) => s.kind === 'session' && !s.trainerIds.includes(trainerId));
  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={trainer.name} color={trainer.color} size={48} />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.14em] text-bml">Trainer Studio</div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-ink-3">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!locked && <>
            <label htmlFor="persona" className="text-xs font-semibold text-ink-3">Acting for trainer</label>
            <select id="persona" value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="h-10 rounded-xl border-0 bg-white px-3 text-sm font-semibold shadow-sm ring-1 ring-inset ring-ink/10">
              {staff.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </>}
          {actions}
        </div>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="flex gap-2" role="tablist" aria-label="Assigned sessions">
          {assigned.map((s) => (
            <button key={s.id} role="tab" aria-selected={session?.id === s.id} onClick={() => setSession(s.id)} className={cx('flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition', session?.id === s.id ? 'bg-bml text-white shadow-md shadow-bml/25' : 'bg-white text-ink-2 shadow-card ring-1 ring-ink/5 hover:text-ink')}>
              <span className="font-mono text-xs opacity-75">{s.code}</span>{s.title.length > 34 ? `${s.title.slice(0, 32)}…` : s.title}
            </button>
          ))}
          {others.slice(0, 3).map((s) => (
            <span key={s.id} title="Not assigned to you. Ask an organiser to add you to this session." className="flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-2xl bg-ink/[.04] px-3 py-2.5 text-sm font-semibold text-ink-4">
              <Lock size={13} /><span className="font-mono text-xs">{s.code}</span> Not assigned
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

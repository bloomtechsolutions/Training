import React, { useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ArrowRight, CircleDot, CheckCircle2, Clock3 } from 'lucide-react';
import { useStore, useNow, useEvent, useSessions } from '../lib/store';
import { useNav } from '../lib/nav';
import { Badge, Button, Card, PageHeader, Tabs, cx, EmptyState } from '../components/ui';
import { KindIcon, SessionMeta, TrainerStack } from '../components/shared';
import { formatDay, sessionStatus, toMin, fromMin, durationLabel, mvtParts } from '../lib/time';
import type { Session } from '../lib/types';

export default function Agenda() {
  const { db, me, update } = useStore();
  const ev = useEvent();
  const sessions = useSessions();
  const now = useNow();
  const { go } = useNav();
  const todayIdx = ev.days.findIndex((d) => d.date === mvtParts(now).date);
  const [day, setDay] = useState(String(todayIdx >= 0 ? todayIdx + 1 : 1));
  const [filter, setFilter] = useState<'all' | 'saved'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const saved = db.bookmarks[me.id] ?? [];
  const daySessions = sessions.filter((s) => String(s.day) === day && (filter === 'all' || saved.includes(s.id)));

  const toggleSave = (id: string) => update((d) => {
    const cur = d.bookmarks[me.id] ?? [];
    d.bookmarks[me.id] = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  });

  const rows: ({ type: 'session'; s: Session } | { type: 'gap'; from: string; to: string })[] = [];
  daySessions.forEach((s, i) => {
    const prev = daySessions[i - 1];
    if (prev && filter === 'all' && toMin(s.start) > toMin(prev.end)) rows.push({ type: 'gap', from: prev.end, to: s.start });
    rows.push({ type: 'session', s });
  });

  return (
    <div>
      <PageHeader eyebrow="Two-day programme" title="Agenda" subtitle={<>All times are Maldives time (UTC+5). Schedule is tentative and may change; you’ll be notified of updates.</>} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
          {ev.days.map((d, i) => (
            <button key={d.date} onClick={() => setDay(String(i + 1))} aria-pressed={day === String(i + 1)} className={cx('rounded-2xl px-4 py-3 text-left transition sm:min-w-[200px]', day === String(i + 1) ? 'mesh text-white shadow-pop' : 'bg-white text-ink shadow-card ring-1 ring-ink/5 hover:ring-ink/10')}>
              <div className={cx('text-[11px] font-bold uppercase tracking-wider', day === String(i + 1) ? 'text-white/75' : 'text-ink-3')}>Day {i + 1} · {formatDay(d.date)}</div>
              <div className="font-display text-base font-extrabold">{d.theme}</div>
            </button>
          ))}
        </div>
        <Tabs size="sm" value={filter} onChange={setFilter} tabs={[{ id: 'all', label: 'All sessions' }, { id: 'saved', label: <span className="flex items-center gap-1"><Bookmark size={13} /> Saved ({saved.length})</span> }]} />
      </div>

      {rows.length === 0 ? <EmptyState icon={<Bookmark />} title="No saved sessions on this day" body="Tap the bookmark on any session to save it here." action={<Button variant="secondary" onClick={() => setFilter('all')}>Show all sessions</Button>} /> : (
        <ol className="relative space-y-2.5 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-0.5 before:bg-ink/[.07] sm:before:left-[83px]">
          {rows.map((row, idx) => {
            if (row.type === 'gap') return (
              <li key={`gap-${idx}`} className="relative flex items-center gap-3 pl-[56px] sm:pl-[112px]">
                <span className="rounded-full border border-dashed border-ink/15 bg-canvas px-3 py-1 text-[11px] font-semibold tabular-nums text-ink-3">{row.from}–{row.to} · No scheduled session ({durationLabel(row.from, row.to)})</span>
              </li>
            );
            const s = row.s;
            const st = sessionStatus(ev, s, now);
            const isOpen = open === s.id;
            const isSaved = saved.includes(s.id);
            const isBreak = s.kind === 'break';
            return (
              <li key={s.id} className="relative flex gap-3 sm:gap-4">
                <div className="hidden w-[64px] shrink-0 pt-4 text-right sm:block">
                  <div className="font-mono text-sm font-bold tabular-nums text-ink">{s.start}</div>
                  <div className="font-mono text-[11px] tabular-nums text-ink-3">{s.end}</div>
                </div>
                <div className={cx('relative z-10 mt-3 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ring-4 ring-canvas sm:ml-0 ml-[10px]', st === 'live' ? 'bg-bml text-white live-dot' : st === 'done' ? 'bg-teal-500 text-white' : isBreak ? 'bg-white text-ink-3 ring-canvas' : s.kind === 'vendor' ? 'bg-amber-100 text-amber-700' : 'bg-white text-bml shadow-sm')}>
                  {st === 'done' ? <CheckCircle2 size={17} /> : st === 'live' ? <CircleDot size={17} /> : <KindIcon s={s} className="text-[11px]" />}
                </div>
                <Card className={cx('min-w-0 flex-1 transition', isBreak && 'bg-ink/[.025] shadow-none', s.kind === 'vendor' && 'bg-amber-50/70', st === 'live' && 'ring-2 ring-bml/40')}>
                  <div className="flex items-start gap-2 p-4">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} disabled={isBreak}>
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        {s.code && <Badge tone="red">Session {s.code}</Badge>}
                        {s.kind === 'vendor' && <Badge tone="amber">Vendor activity</Badge>}
                        {isBreak && <Badge tone="ink">Break</Badge>}
                        {st === 'live' && <Badge tone="red" icon={<span className="h-1.5 w-1.5 rounded-full bg-bml" />}>Live</Badge>}
                        {st === 'done' && !isBreak && <Badge tone="teal">Done</Badge>}
                        <span className="text-xs font-semibold text-ink-3 sm:hidden"><SessionMeta s={s} /></span>
                        <span className="hidden text-xs font-semibold text-ink-3 sm:inline"><Clock3 size={11} className="mr-0.5 inline" />{durationLabel(s.start, s.end)}</span>
                      </div>
                      <h3 className={cx('font-display font-bold leading-snug', isBreak ? 'text-base text-ink-2' : 'text-[1.05rem] text-ink')}>{s.title}</h3>
                      {!isBreak && <div className="mt-1.5 flex items-center gap-2 text-xs font-medium text-ink-3"><TrainerStack db={db} session={s} size={22} /><span className="truncate">{s.trainerLabel}</span></div>}
                    </button>
                    {!isBreak && (
                      <div className="flex shrink-0 items-center">
                        <button aria-label={isSaved ? 'Remove bookmark' : 'Bookmark session'} aria-pressed={isSaved} onClick={() => toggleSave(s.id)} className={cx('flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-ink/5', isSaved ? 'text-bml' : 'text-ink-4')}>{isSaved ? <BookmarkCheck size={20} className="fill-bml-100" /> : <Bookmark size={20} />}</button>
                        <button aria-label={isOpen ? 'Collapse details' : 'Expand details'} onClick={() => setOpen(isOpen ? null : s.id)} className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-3 hover:bg-ink/5"><ChevronDown size={20} className={cx('transition', isOpen && 'rotate-180')} /></button>
                      </div>
                    )}
                  </div>
                  {isOpen && (
                    <div className="anim-in border-t border-ink/5 px-4 pb-4 pt-3">
                      <p className="text-sm text-ink-2">{s.description}</p>
                      {s.objectives.length > 0 && (
                        <div className="mt-3"><div className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-3">Objectives <span className="font-medium normal-case tracking-normal">(draft, to be confirmed by trainer)</span></div>
                          <ul className="space-y-1 text-sm text-ink-2">{s.objectives.map((o) => <li key={o} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bml" />{o}</li>)}</ul>
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => go('session', s.id)} icon={<ArrowRight size={15} />}>Open session</Button>
                        {s.trainerIds.filter((t) => db.trainers.find((x) => x.id === t)?.kind === 'staff').slice(0, 1).map((t) => <Button key={t} size="sm" variant="secondary" onClick={() => go('trainer', t)}>Trainer profile</Button>)}
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-6 text-xs text-ink-3">Agenda revision {ev.publishedRevision} · published {ev.publishedAt ? formatDay(new Date(ev.publishedAt).toISOString().slice(0, 10)) : '—'} · Day 1 ends {fromMin(Math.max(...sessions.filter((s) => s.day === 1).map((s) => toMin(s.end))))}.</p>
    </div>
  );
}

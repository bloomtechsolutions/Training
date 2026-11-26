import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Coffee, MapPin, Radio, Sparkles, Waves } from 'lucide-react';
import { api } from '../lib/store';
import { cx } from '../components/ui';
import type { Session, SessionType, TrainingEvent } from '../lib/types';
import { durationLabel, formatDay, mvtEpoch, mvtParts, toMin } from '../lib/time';
import { typeOf, showTypeBadge } from '../lib/sessionTypes';

interface PublicData {
  event: (Pick<TrainingEvent, 'id' | 'name' | 'days' | 'venue'> & { region: string | null }) | null;
  sessions?: Session[];
  sessionTypes?: SessionType[];
  serverNow: number;
  now: number;
}

/*
 * "Tide line" timeline: each day is a vertical current. Items are sized by their length,
 * long stretches of free time fold into a wave marker, and a live marker shows where the
 * programme is right now.
 */
const PX_PER_MIN = 1.5;
const MIN_BLOCK = 76;
const FOLD_AFTER = 45; // gaps longer than this fold into a wave

export default function PublicAgenda({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0); // event clock minus local clock
  const [tick, setTick] = useState(Date.now());
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    let stop = false;
    const load = () => api<PublicData>('public/agenda').then((d) => { if (stop) return; setData(d); setOffset(d.now - Date.now()); setError(''); }).catch((e) => !stop && setError(e.message));
    load();
    const i = setInterval(load, 60_000);
    const t = setInterval(() => setTick(Date.now()), 15_000);
    return () => { stop = true; clearInterval(i); clearInterval(t); };
  }, []);

  const now = tick + offset;
  const ev = data?.event ?? null;
  const today = ev ? ev.days.findIndex((d) => d.date === mvtParts(now).date) : -1;
  const shownDay = day ?? (today >= 0 ? today + 1 : 1);
  const db = { sessionTypes: data?.sessionTypes ?? [] };

  const items = useMemo(() => (data?.sessions ?? []).filter((s) => s.day === shownDay).sort((a, b) => toMin(a.start) - toMin(b.start) || a.order - b.order), [data, shownDay]);

  const status = (s: Session) => {
    if (!ev) return 'upcoming';
    const date = ev.days[s.day - 1]?.date ?? ev.days[0].date;
    const a = mvtEpoch(date, s.start); const b = mvtEpoch(date, s.end);
    return now >= b ? 'done' : now >= a ? 'live' : 'upcoming';
  };
  const liveItem = (data?.sessions ?? []).find((s) => status(s) === 'live');
  const nextItem = (data?.sessions ?? []).filter((s) => status(s) === 'upcoming').sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start))[0];

  return (
    <div className={cx('min-h-screen bg-canvas', embedded && 'min-h-0 bg-transparent')}>
      {!embedded && (
        <header className="relative overflow-hidden mesh grain text-white">
          <div className="relative mx-auto max-w-4xl px-4 pb-10 pt-6 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 font-display text-lg font-extrabold">R</div>
                <div className="leading-tight"><div className="font-display font-extrabold">BML Refresher</div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/70">Learn. Connect. Transform.</div></div>
              </div>
              <a href="/" className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm font-semibold hover:bg-white/25"><ArrowLeft size={15} /> Sign in</a>
            </div>
            <div className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-white/70">The programme</div>
            <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-5xl">{ev?.name ?? 'Agenda'}</h1>
            {ev && <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80"><span className="flex items-center gap-1"><CalendarDays size={14} />{formatDay(ev.days[0].date, { day: 'numeric', month: 'long' })}{ev.days.length > 1 ? ` – ${formatDay(ev.days[ev.days.length - 1].date, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</span><span className="flex items-center gap-1"><MapPin size={14} />{[ev.venue, ev.region].filter(Boolean).join(' · ') || 'Venue to be confirmed'}</span></p>}
          </div>
        </header>
      )}

      <main className={cx('mx-auto max-w-4xl px-4 sm:px-6', embedded ? 'py-0' : '-mt-6 pb-16')}>
        {error ? <div className="rounded-3xl bg-white p-8 text-center text-sm text-ink-3 shadow-card">The agenda can’t be loaded right now. {error}</div>
          : !data ? <div className="h-64 animate-pulse rounded-3xl bg-white/70 shadow-card" aria-busy="true" />
          : !ev ? <div className="rounded-3xl bg-white p-10 text-center shadow-card"><CalendarDays className="mx-auto mb-3 text-ink-4" /><div className="font-display text-lg font-bold">The agenda will appear here once it’s published.</div></div>
          : (
            <>
              {/* Now / next strip */}
              {(liveItem || nextItem) && (
                <div className="relative z-10 mb-4 grid gap-2 sm:grid-cols-2">
                  {liveItem && <NowCard label="Happening now" s={liveItem} live />}
                  {nextItem && <NowCard label={`Up next · ${formatDay(ev.days[nextItem.day - 1]?.date ?? ev.days[0].date)}`} s={nextItem} />}
                </div>
              )}

              {/* Day switcher */}
              <div className="relative z-10 mb-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${ev.days.length}, minmax(0, 1fr))` }} role="tablist" aria-label="Day">
                {ev.days.map((d, i) => (
                  <button key={d.date} role="tab" aria-selected={shownDay === i + 1} onClick={() => setDay(i + 1)} className={cx('rounded-2xl px-4 py-3 text-left shadow-card transition', shownDay === i + 1 ? 'bg-ink text-white' : 'bg-white text-ink hover:-translate-y-0.5')}>
                    <div className={cx('text-[11px] font-bold uppercase tracking-wider', shownDay === i + 1 ? 'text-white/60' : 'text-ink-3')}>Day {i + 1} · {formatDay(d.date)}{today === i ? ' · Today' : ''}</div>
                    <div className="truncate font-display text-base font-extrabold">{d.theme || '—'}</div>
                  </button>
                ))}
              </div>

              {items.length === 0 ? <div className="rounded-3xl bg-white p-8 text-center text-sm text-ink-3 shadow-card">Nothing scheduled on this day yet.</div> : (
                <ol className="relative" aria-label={`Day ${shownDay} agenda`}>
                  {/* the current */}
                  <span aria-hidden className="absolute bottom-0 left-[58px] top-0 w-[3px] rounded-full bg-gradient-to-b from-bml via-lav-500 to-teal-500 opacity-30 sm:left-[78px]" />
                  {items.map((s, i) => {
                    const prev = items[i - 1];
                    const gap = prev ? toMin(s.start) - toMin(prev.end) : 0;
                    const t = typeOf(db, s);
                    const st = status(s);
                    const dur = toMin(s.end) - toMin(s.start);
                    const h = Math.max(MIN_BLOCK, dur * PX_PER_MIN);
                    const date = ev.days[s.day - 1]?.date ?? ev.days[0].date;
                    const pct = st === 'live' ? Math.min(100, ((now - mvtEpoch(date, s.start)) / (dur * 60000)) * 100) : st === 'done' ? 100 : 0;
                    const isBreak = t.behavior === 'break';
                    return (
                      <React.Fragment key={s.id}>
                        {gap > 0 && (gap > FOLD_AFTER ? (
                          <li className="relative flex items-center py-3" aria-label={`Free time ${prev!.end} to ${s.start}`}>
                            <span className="w-[50px] shrink-0 text-right font-mono text-[11px] text-ink-4 sm:w-[70px]">{prev!.end}</span>
                            <span className="relative z-10 mx-[3px] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-4 ring-2 ring-ink/10 sm:mx-[3px]"><Waves size={15} /></span>
                            <span className="ml-3 rounded-full border border-dashed border-ink/15 px-3 py-1 text-xs font-semibold text-ink-3">Free time · {durationLabel(prev!.end, s.start)}</span>
                          </li>
                        ) : <li aria-hidden style={{ height: gap * PX_PER_MIN }} />)}
                        <li className="relative flex" style={{ minHeight: h }}>
                          <div className="flex w-[50px] shrink-0 flex-col justify-between py-1 text-right sm:w-[70px]">
                            <span className={cx('font-mono text-sm font-bold tabular-nums', st === 'done' ? 'text-ink-4' : 'text-ink')}>{s.start}</span>
                            {h >= 110 && items[i + 1]?.start !== s.end && i < items.length - 1 && <span className="font-mono text-[11px] tabular-nums text-ink-4">{s.end}</span>}
                          </div>
                          {/* node on the current */}
                          <div className="relative mx-[3px] flex w-8 shrink-0 justify-center pt-1">
                            <span className={cx('relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md', st === 'live' && 'live-dot')} style={{ background: st === 'done' ? '#B4B0C4' : t.color }}>
                              {st === 'done' ? <CheckCircle2 size={15} /> : isBreak ? <Coffee size={14} /> : st === 'live' ? <Radio size={14} /> : s.code ? <span className="font-mono text-[11px] font-bold">{s.code}</span> : <Sparkles size={14} />}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pb-2 pl-3">
                            <div className={cx('relative h-full overflow-hidden rounded-2xl p-4 transition', isBreak ? 'border border-dashed border-ink/15 bg-white/50' : 'bg-white shadow-card', st === 'live' && 'ring-2', st === 'done' && 'opacity-60')} style={st === 'live' ? { boxShadow: `0 0 0 2px ${t.color}, 0 18px 40px -18px ${t.color}` } : undefined}>
                              {/* duration fill */}
                              {!isBreak && <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.color }} />}
                              {st === 'live' && <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${t.color} ${pct}%, transparent ${pct}%)` }} />}
                              <div className="flex flex-wrap items-center gap-1.5 pl-1">
                                {s.code && <span className="font-mono text-[11px] font-bold" style={{ color: t.color }}>Session {s.code}</span>}
                                {showTypeBadge(db, s) && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${t.color}18`, color: t.color }}>{t.label}</span>}
                                {st === 'live' && <span className="rounded-full bg-bml px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Live now</span>}
                                <span className="ml-auto text-[11px] font-semibold text-ink-3">{durationLabel(s.start, s.end)}</span>
                              </div>
                              <h3 className={cx('mt-1 pl-1 font-display font-extrabold leading-snug', isBreak ? 'text-base text-ink-2' : 'text-lg text-ink')}>{s.title}</h3>
                              {!isBreak && s.trainerLabel && s.trainerLabel !== '—' && <div className="mt-0.5 pl-1 text-sm text-ink-3">{s.trainerLabel}</div>}
                              {!isBreak && s.description && h >= 120 && <p className="mt-2 line-clamp-2 pl-1 text-sm text-ink-2">{s.description}</p>}
                            </div>
                          </div>
                        </li>
                      </React.Fragment>
                    );
                  })}
                  <li className="relative flex items-center pt-1">
                    <span className="w-[50px] shrink-0 text-right font-mono text-[11px] font-bold text-ink-3 sm:w-[70px]">{items[items.length - 1].end}</span>
                    <span className="relative z-10 mx-[3px] flex h-8 w-8 items-center justify-center"><span className="h-3 w-3 rounded-full bg-ink/30" /></span>
                    <span className="ml-3 text-xs font-semibold text-ink-3">End of day {shownDay}</span>
                  </li>
                </ol>
              )}
              <p className="mt-6 text-center text-xs text-ink-3">All times are Maldives time (UTC+5). The schedule may change; sign in for live updates, check-in and activities.</p>
            </>
          )}
      </main>
    </div>
  );
}

function NowCard({ label, s, live }: { label: string; s: Session; live?: boolean }) {
  return (
    <div className={cx('rounded-2xl p-4 shadow-card', live ? 'bg-bml text-white' : 'bg-white')}>
      <div className={cx('flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider', live ? 'text-white/80' : 'text-ink-3')}>{live && <span className="h-2 w-2 rounded-full bg-white live-dot" />}{label}</div>
      <div className="mt-1 truncate font-display text-base font-extrabold">{s.title}</div>
      <div className={cx('text-xs', live ? 'text-white/80' : 'text-ink-3')}>{s.start}–{s.end}{s.trainerLabel && s.trainerLabel !== '—' ? ` · ${s.trainerLabel}` : ''}</div>
    </div>
  );
}


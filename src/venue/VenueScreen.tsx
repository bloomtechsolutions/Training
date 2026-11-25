import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Maximize2, WifiOff, Coffee, Trophy, Award, Sparkles, Lightbulb, CheckCircle2, Clock } from 'lucide-react';
import { useStore, useNow, useTick, qrPayload, qrToken, teamPoints, publishedSessions, currentAndNext } from '../lib/store';
import { QR, SlideView, WordCloud, Leaderboard, QuestionVisual } from '../components/shared';
import { PollResults } from '../engage/Quiz';
import { Avatar, cx } from '../components/ui';
import { formatClock, formatDay, mmss, sessionStart, sessionStatus, mvtParts } from '../lib/time';

const W = 1920;
const H = 1080;

/** Scales a fixed 1920×1080 stage to fit its container (keeps 16:9 typography consistent). */
export function Scaled({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.3);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setS(Math.min(el.clientWidth / W, (el.clientHeight || el.clientWidth * (H / W)) / H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx('relative w-full overflow-hidden', className)} style={{ aspectRatio: '16 / 9', maxWidth: '100%' }}>
      <div className="absolute left-1/2 top-1/2" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${s})` }}>{children}</div>
    </div>
  );
}

function Frame({ children, dark = true, className }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return <div className={cx('relative h-full w-full overflow-hidden', dark ? 'bg-[#12091F] text-white' : 'bg-white text-ink', className)}>{children}</div>;
}

function Brand({ ev }: { ev: { name: string } }) {
  return (
    <div className="absolute left-16 top-12 flex items-center gap-5">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl mesh font-display text-4xl font-extrabold text-white">R</div>
      <div><div className="font-display text-4xl font-extrabold">BML Refresher</div><div className="text-xl font-semibold uppercase tracking-[.25em] text-white/60">Learn. Connect. Transform.</div></div>
    </div>
  );
}

export function VenueStage() {
  const { db, syncAvailable } = useStore();
  const now = useNow();
  const real = useTick(500);
  const ev = db.events.find((e) => e.id === db.live.eventId) ?? db.events[0];
  const sessions = publishedSessions(db, ev.id);
  const live = db.live;
  const session = db.sessions.find((s) => s.id === live.sessionId) ?? null;
  const { live: liveSession, next } = currentAndNext(ev, sessions, now);
  const act = db.activities.find((a) => a.id === live.activityId);
  const q = act?.questions[live.questionIndex];
  const mode = live.venueMode;
  const dayIdx = Math.max(0, ev.days.findIndex((d) => d.date === mvtParts(now).date));
  const remaining = live.phase === 'paused' ? live.pausedRemaining ?? 0 : live.deadline ? Math.max(0, live.deadline - real) : 0;

  if (mode === 'blackout') return <div className="h-full w-full bg-black" aria-label="Screen blacked out" />;

  if (mode === 'offline' || !syncAvailable) return (
    <Frame className="flex flex-col items-center justify-center">
      <WifiOff size={140} className="text-amber-500" />
      <div className="mt-10 font-display text-8xl font-extrabold">Reconnecting…</div>
      <p className="mt-6 max-w-[1100px] text-center text-4xl text-white/70">The screen lost its connection to the session controls. Content will resume automatically. Organisers: check the controller device.</p>
    </Frame>
  );

  if (mode === 'welcome') return (
    <Frame className="mesh grain">
      <Brand ev={ev} />
      <div className="absolute right-16 top-14 text-right font-mono text-5xl font-bold tabular-nums text-white/85">{formatClock(now)}</div>
      <div className="absolute bottom-28 left-16 right-16">
        <div className="mb-6 inline-flex rounded-full bg-white/15 px-7 py-3 text-3xl font-bold">Day {dayIdx + 1} · {ev.days[dayIdx]?.theme} · {formatDay(ev.days[dayIdx]?.date ?? ev.days[0].date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h1 className="font-display text-[150px] font-extrabold leading-[0.95]">Welcome</h1>
        <p className="mt-6 max-w-[1400px] text-5xl font-medium text-white/85">Building a Digital-First, Sales-Driven and Customer-Centric Team</p>
        <p className="mt-8 text-3xl text-white/60">{ev.venue || 'Venue to be confirmed'} · Open BML Refresher on your phone to join in</p>
      </div>
    </Frame>
  );

  if (mode === 'qr') {
    const target = session ?? liveSession ?? next;
    const tok = target ? qrToken(ev.id, target.id, real) : null;
    return (
      <Frame>
        <div className="absolute inset-0 mesh opacity-40" />
        <div className="relative flex h-full items-center gap-24 px-32">
          <div className="flex-1">
            <div className="text-4xl font-bold uppercase tracking-[.2em] text-amber-500">Check in</div>
            <h1 className="mt-4 font-display text-[110px] font-extrabold leading-none">{target ? (target.code ? `Session ${target.code}` : 'Engagement') : 'No session'}</h1>
            <p className="mt-6 text-5xl font-semibold text-white/85">{target?.title}</p>
            <p className="mt-12 text-4xl text-white/70">Open BML Refresher → Check in → Scan</p>
            {tok && <p className="mt-5 text-3xl text-white/60">Or enter code <span className="rounded-xl bg-white/10 px-4 py-1 font-mono font-bold tracking-widest text-white">{tok.token}</span> · refreshes in {Math.ceil(tok.expiresIn / 1000)}s</p>}
          </div>
          {target && <div className="rounded-[48px] bg-white p-10 shadow-2xl"><QR value={qrPayload(ev.id, target.id, real)} size={640} /></div>}
        </div>
        <div className="absolute bottom-8 left-0 right-0 text-center text-2xl text-white/40">Demo code · validated locally in this prototype</div>
      </Frame>
    );
  }

  if (mode === 'agenda') {
    const day = sessions.filter((s) => s.day === dayIdx + 1);
    return (
      <Frame>
        <div className="flex h-full flex-col px-24 py-16">
          <div className="flex items-end justify-between"><div><div className="text-3xl font-bold uppercase tracking-[.2em] text-white/50">Day {dayIdx + 1} · {formatDay(ev.days[dayIdx]?.date ?? ev.days[0].date)}</div><h1 className="font-display text-8xl font-extrabold">{ev.days[dayIdx]?.theme}</h1></div><div className="font-mono text-6xl font-bold text-white/80">{formatClock(now)}</div></div>
          <div className="mt-12 grid flex-1 content-start gap-4">
            {day.map((s) => {
              const st = sessionStatus(ev, s, now);
              return (
                <div key={s.id} className={cx('flex items-center gap-10 rounded-3xl px-10 py-5', st === 'live' ? 'bg-bml' : s.kind === 'break' ? 'bg-white/[.04]' : 'bg-white/[.08]', st === 'done' && 'opacity-40')}>
                  <div className="w-64 font-mono text-4xl font-bold tabular-nums">{s.start}–{s.end}</div>
                  <div className="w-24 font-mono text-4xl font-bold text-amber-500">{s.code ?? ''}</div>
                  <div className="flex-1 truncate text-[42px] font-bold">{s.title}</div>
                  <div className="max-w-[560px] truncate text-3xl text-white/70">{s.trainerLabel !== '—' ? s.trainerLabel : ''}</div>
                  {st === 'live' && <div className="rounded-full bg-white px-5 py-1 text-2xl font-extrabold text-bml">NOW</div>}
                </div>
              );
            })}
          </div>
        </div>
      </Frame>
    );
  }

  if (mode === 'trainer') {
    const s = session ?? liveSession ?? next;
    const ts = s ? s.trainerIds.map((id) => db.trainers.find((t) => t.id === id)!).filter(Boolean) : [];
    return (
      <Frame className="mesh grain">
        <div className="flex h-full flex-col justify-center px-32">
          <div className="text-4xl font-bold uppercase tracking-[.2em] text-white/70">{s?.code ? `Session ${s.code}` : 'Up next'}</div>
          <h1 className="mt-3 max-w-[1600px] font-display text-[96px] font-extrabold leading-[1.02]">{s?.title}</h1>
          <div className="mt-16 flex flex-wrap gap-14">
            {ts.map((t) => (
              <div key={t.id} className="flex items-center gap-8">
                <Avatar name={t.name} color={t.color} size={180} className="ring-8 ring-white/20" />
                <div><div className="font-display text-6xl font-extrabold">{t.name}</div><div className="mt-2 text-3xl text-white/75">{t.kind === 'staff' ? t.designation || '' : t.kind === 'vendor' ? 'External engagement partner' : t.kind === 'participants' ? 'Participant-led' : ''}</div></div>
              </div>
            ))}
          </div>
        </div>
      </Frame>
    );
  }

  if (mode === 'presentation') {
    const deck = session ? db.decks[session.id] : undefined;
    const slide = deck?.slides[live.slideIndex];
    return (
      <div className="relative h-full w-full bg-black">
        {slide ? <div className="absolute inset-0"><SlideView slide={slide} className="h-full rounded-none" /></div> : <Frame className="flex items-center justify-center"><div className="text-5xl text-white/60">No slides selected</div></Frame>}
        {live.pointer && <span className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bml shadow-[0_0_0_14px_rgba(181,9,40,.35)]" style={{ left: `${live.pointer.x}%`, top: `${live.pointer.y}%` }} />}
      </div>
    );
  }

  if ((mode === 'poll' || mode === 'quiz') && act && q) {
    const responses = db.responses.filter((r) => r.activityId === act.id && r.questionId === q.id).length;
    const showResults = live.phase === 'revealed' || (mode === 'poll' && live.phase !== 'open');
    return (
      <Frame>
        <div className="flex h-full flex-col px-24 py-16">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold uppercase tracking-[.2em] text-white/50">{act.title} · Question {live.questionIndex + 1}/{act.questions.length}</div>
            <div className={cx('flex items-center gap-4 rounded-full px-8 py-3 font-mono text-5xl font-bold tabular-nums', live.phase === 'open' && remaining < 6000 ? 'bg-bml' : 'bg-white/10')}><Clock size={44} />{live.phase === 'open' ? mmss(remaining) : live.phase === 'paused' ? 'Paused' : live.phase === 'revealed' ? 'Answer' : 'Closed'}</div>
          </div>
          <div className="mt-12 flex items-start gap-10">
            {q.visual && <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-[36px] bg-white/10"><QuestionVisual name={q.visual} size={80} /></div>}
            <h1 className="font-display text-[76px] font-extrabold leading-[1.08]">{q.text}</h1>
          </div>
          <div className="mt-auto">
            {showResults ? (
              <div className="max-w-[1600px]"><PollResults db={db} activityId={act.id} q={live.phase === 'revealed' ? q : { ...q, correct: undefined }} dark /></div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {q.options.map((o, i) => <div key={o.id} className="flex items-center gap-6 rounded-3xl bg-white/[.08] px-8 py-7 text-[40px] font-bold"><span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl font-mono" style={{ background: ['#B50928', '#7C5CFA', '#14B8A6', '#F5A524', '#3B82F6', '#FF6B4A'][i] }}>{'ABCDEF'[i]}</span>{o.text}</div>)}
              </div>
            )}
            {live.phase === 'revealed' && q.explanation && <p className="mt-8 max-w-[1650px] rounded-3xl bg-teal-500/20 px-8 py-5 text-[34px] text-teal-100"><CheckCircle2 className="mr-3 inline" size={36} />{q.explanation}</p>}
            <div className="mt-6 text-3xl text-white/50">{responses} response{responses === 1 ? '' : 's'} · answer on your phone</div>
          </div>
        </div>
      </Frame>
    );
  }

  if (mode === 'wordcloud') {
    const a = act?.type === 'wordcloud' ? act : db.activities.find((x) => x.type === 'wordcloud' && x.sessionId === (session?.id ?? 's-07')) ?? db.activities.find((x) => x.type === 'wordcloud');
    const words = db.words.filter((w) => w.activityId === a?.id).map((w) => w.word);
    return (
      <Frame>
        <div className="flex h-full flex-col px-24 py-16">
          <h1 className="text-center font-display text-7xl font-extrabold">{a?.prompt}</h1>
          <div className="flex flex-1 items-center justify-center px-10"><WordCloud words={words} big /></div>
          <div className="text-center text-3xl text-white/50">{words.length} words · add yours in Live on your phone</div>
        </div>
      </Frame>
    );
  }

  if (mode === 'qa') {
    const onScreen = db.qa.find((x) => x.onScreen && x.status !== 'rejected');
    const top = db.qa.filter((x) => (x.status === 'approved' || x.status === 'answered') && x.channel === (onScreen?.channel ?? 'leadership')).sort((a, b) => b.votes.length - a.votes.length).slice(0, 4);
    const label = (x: typeof top[number]) => (x.anonymous ? 'Anonymous' : db.users.find((u) => u.id === x.userId)?.name.split(' ')[0] ?? '');
    return (
      <Frame>
        <div className="flex h-full flex-col px-24 py-16">
          <div className="text-3xl font-bold uppercase tracking-[.2em] text-amber-500">{onScreen?.channel === 'session' ? 'Session Q&A' : 'Ask Leadership'}</div>
          {onScreen ? (
            <div className="mt-auto mb-auto">
              <h1 className="font-display text-[88px] font-extrabold leading-[1.05]">“{onScreen.text}”</h1>
              <div className="mt-10 text-4xl text-white/60">{label(onScreen)} · {onScreen.votes.length} upvotes</div>
              {onScreen.answer && <p className="mt-10 max-w-[1600px] text-4xl text-teal-100">{onScreen.answer}</p>}
            </div>
          ) : (
            <div className="mt-12 space-y-6">{top.map((x) => <div key={x.id} className="flex items-center gap-8 rounded-3xl bg-white/[.08] px-10 py-7"><div className="w-28 text-center font-display text-5xl font-extrabold text-amber-500">▲ {x.votes.length}</div><div className="flex-1 text-[40px] font-bold leading-snug">{x.text}</div></div>)}</div>
          )}
        </div>
      </Frame>
    );
  }

  if (mode === 'timer') return (
    <Frame className="mesh grain flex flex-col items-center justify-center">
      <div className="text-5xl font-bold uppercase tracking-[.2em] text-white/75">{live.timerLabel || 'Activity'}</div>
      <div className="mt-6 font-mono text-[340px] font-bold leading-none tabular-nums">{mmss(remaining)}</div>
      <div className="mt-6 text-4xl text-white/70">{remaining <= 0 ? 'Time’s up!' : 'Follow the instructions from your host'}</div>
    </Frame>
  );

  if (mode === 'leaderboard') return (
    <Frame>
      <div className="flex h-full flex-col px-32 py-20">
        <div className="flex items-center gap-6"><Trophy size={90} className="text-amber-500" /><h1 className="font-display text-8xl font-extrabold">Team leaderboard</h1></div>
        <div className="mt-14"><Leaderboard rows={teamPoints(db)} big /></div>
      </div>
    </Frame>
  );

  if (mode === 'break') {
    const target = next ?? null;
    const ms = target ? sessionStart(ev, target) - now : 0;
    return (
      <Frame className="flex flex-col items-center justify-center bg-gradient-to-br from-[#0B7468] via-[#12091F] to-[#4A2FC0]">
        <Coffee size={120} className="text-amber-500" />
        <div className="mt-8 font-display text-9xl font-extrabold">{liveSession?.kind === 'break' ? liveSession.title : 'Break'}</div>
        {target && <><div className="mt-10 font-mono text-[200px] font-bold leading-none tabular-nums">{ms > 0 ? mmss(ms) : '0:00'}</div><div className="mt-8 text-5xl text-white/75">Next: {target.code ? `Session ${target.code} · ` : ''}{target.title} at {target.start}</div></>}
      </Frame>
    );
  }

  if (mode === 'awards') {
    const top = teamPoints(db)[0];
    const shortlisted = db.ideas.filter((i) => i.status !== 'submitted').slice(0, 3);
    return (
      <Frame className="mesh grain">
        <div className="flex h-full flex-col items-center justify-center px-24 text-center">
          <Award size={130} className="text-amber-500" />
          <div className="mt-6 text-4xl font-bold uppercase tracking-[.25em] text-white/75">Champion team</div>
          <div className="font-display text-[180px] font-extrabold leading-none" style={{ textShadow: '0 10px 60px rgba(0,0,0,.3)' }}>{top.name}</div>
          <div className="mt-4 text-5xl font-bold tabular-nums">{top.points.toLocaleString()} points</div>
          {shortlisted.length > 0 && <div className="mt-14 flex gap-6">{shortlisted.map((i) => <div key={i.id} className="flex items-center gap-4 rounded-3xl bg-white/15 px-8 py-5 text-3xl font-bold"><Lightbulb className="text-amber-500" size={40} />{i.title}</div>)}</div>}
        </div>
      </Frame>
    );
  }

  if (mode === 'closing') return (
    <Frame className="mesh grain">
      <Brand ev={ev} />
      <div className="absolute bottom-28 left-16 right-16">
        <Sparkles size={90} className="mb-6 text-amber-500" />
        <h1 className="font-display text-[150px] font-extrabold leading-[0.95]">Thank you</h1>
        <p className="mt-6 text-5xl text-white/85">Please share your event feedback in the app. Your learning continues in Beyond Refresher.</p>
      </div>
    </Frame>
  );

  // Fallback (e.g. activity mode without an activity)
  return <Frame className="flex items-center justify-center"><div className="text-5xl text-white/60">Waiting for the next activity…</div></Frame>;
}

export default function VenueScreen({ standalone }: { standalone?: boolean }) {
  const [hint, setHint] = useState(true);
  useEffect(() => { const t = setTimeout(() => setHint(false), 6000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black" onMouseMove={() => setHint(true)}>
      <Scaled className="h-full max-h-screen"><VenueStage /></Scaled>
      {standalone && hint && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 backdrop-blur">Venue screen · local demo sync with tabs in this browser</span>
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/25"><Maximize2 size={14} /> Full screen</button>
        </div>
      )}
    </div>
  );
}

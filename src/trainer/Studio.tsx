import React from 'react';
import { Presentation, Layers, Sparkles, Users, Timer, MessageSquareText, CheckCircle2, CircleDashed, BarChart3, Radio } from 'lucide-react';
import { useStore, useNow, useEvent } from '../lib/store';
import { useNav } from '../lib/nav';
import { Badge, Button, Card, EmptyState, Progress, Ring, SectionTitle, cx } from '../components/ui';
import { TrainerBar } from './Header';
import { useTrainerContext } from './useTrainer';
import { sessionEnd, sessionStart, sessionStatus, mmss, durationLabel, formatDay } from '../lib/time';
import { PollResults } from '../engage/Quiz';

export default function TrainerStudio() {
  const { db, trainerId } = useStore();
  const { go } = useNav();
  const ev = useEvent();
  const now = useNow();
  const { assigned, session } = useTrainerContext();
  if (!session) return <><TrainerBar title="Studio" /><EmptyState title="No sessions assigned" body="Ask an organiser to assign you to a session." /></>;
  const st = sessionStatus(ev, session, now);
  const blocks = db.blocks.filter((b) => b.sessionId === session.id);
  const ready = blocks.filter((b) => b.ready).length;
  const participants = db.users.filter((u) => u.eventIds.includes(ev.id) && u.status === 'confirmed').length;
  const checkedIn = db.attendance.filter((a) => a.sessionId === session.id).length;
  const acts = db.activities.filter((a) => a.sessionId === session.id);
  const pendingQ = db.qa.filter((q) => q.sessionId === session.id && q.status === 'pending').length;
  const pre = db.trainers.find((t) => t.id === trainerId)!.questions;
  const liveAct = db.activities.find((a) => a.id === db.live.activityId);
  const timerMs = st === 'live' ? sessionEnd(ev, session) - now : st === 'upcoming' ? sessionStart(ev, session) - now : 0;
  const deck = db.decks[session.id];
  const coTrainers = session.trainerIds.filter((t) => t !== trainerId).map((t) => db.trainers.find((x) => x.id === t)?.name).filter(Boolean);

  return (
    <div>
      <TrainerBar title="Studio" subtitle={`${assigned.length} assigned session${assigned.length === 1 ? '' : 's'}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-5 lg:col-span-2">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-bml-50" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2"><Badge tone="red">Session {session.code}</Badge><Badge tone={st === 'live' ? 'red' : st === 'done' ? 'teal' : 'lav'}>{st === 'live' ? 'Live now' : st === 'done' ? 'Delivered' : 'Upcoming'}</Badge></div>
            <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight">{session.title}</h2>
            <div className="text-sm text-ink-3">Day {session.day} · {formatDay(ev.days[session.day - 1].date)} · {session.start}–{session.end} · {durationLabel(session.start, session.end)}</div>
            {coTrainers.length > 0 && <div className="mt-1 text-xs text-ink-3">With {coTrainers.join(', ')}</div>}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => go('present')} icon={<Presentation size={17} />}>Open presenter</Button>
              <Button variant="secondary" onClick={() => go('activities')} icon={<Sparkles size={17} />}>Activities</Button>
              <Button variant="secondary" onClick={() => go('builder')} icon={<Layers size={17} />}>Session builder</Button>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col items-center justify-center p-5 text-center">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-3"><Timer size={14} /> {st === 'live' ? 'Time remaining' : st === 'upcoming' ? 'Starts in' : 'Session ended'}</div>
          <div className={cx('font-mono text-5xl font-bold tabular-nums', st === 'live' && timerMs < 5 * 60000 ? 'text-bml' : 'text-ink')}>{st === 'done' ? '—' : timerMs > 3600000 * 3 ? `${Math.floor(timerMs / 3600000)}h` : mmss(timerMs)}</div>
          {st === 'live' && <Progress className="mt-3" value={100 - (timerMs / (sessionEnd(ev, session) - sessionStart(ev, session))) * 100} label="Session progress" />}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="flex items-center gap-3 p-4"><Ring value={(ready / Math.max(1, blocks.length)) * 100} size={54} color="#0E9384"><span className="text-xs font-bold">{ready}/{blocks.length}</span></Ring><div><div className="text-xs text-ink-3">Content ready</div><div className="font-bold">{ready === blocks.length ? 'All set' : 'In preparation'}</div></div></Card>
        <Card className="flex items-center gap-3 p-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lav-50 text-lav-600"><Users /></span><div><div className="text-xs text-ink-3">Checked in / registered</div><div className="font-display text-xl font-extrabold tabular-nums">{checkedIn}/{participants}</div></div></Card>
        <Card className="flex items-center gap-3 p-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><MessageSquareText /></span><div><div className="text-xs text-ink-3">Questions to review</div><div className="font-display text-xl font-extrabold tabular-nums">{pendingQ + pre.length}</div></div></Card>
        <Card className="flex items-center gap-3 p-4"><span className={cx('flex h-12 w-12 items-center justify-center rounded-2xl', liveAct ? 'bg-bml text-white' : 'bg-ink/5 text-ink-3')}><Radio /></span><div className="min-w-0"><div className="text-xs text-ink-3">Live activity</div><div className="truncate font-bold">{liveAct && db.live.phase !== 'idle' ? `${liveAct.title} · ${db.live.phase}` : 'None running'}</div></div></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Preparation checklist" action={<Button size="sm" variant="ghost" onClick={() => go('builder')}>Edit</Button>} />
          <ul className="space-y-2">
            {blocks.map((b) => <li key={b.id} className="flex items-center gap-2 text-sm">{b.ready ? <CheckCircle2 size={17} className="text-teal-600" /> : <CircleDashed size={17} className="text-amber-500" />}<span className="flex-1">{b.title}</span><span className="text-xs tabular-nums text-ink-3">{b.minutes} min</span></li>)}
            <li className="flex items-center gap-2 text-sm">{deck?.source === 'images' ? <CheckCircle2 size={17} className="text-teal-600" /> : <CircleDashed size={17} className="text-amber-500" />}<span className="flex-1">Slides {deck?.source === 'images' ? 'uploaded' : 'using sample deck'}</span></li>
          </ul>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Latest results" action={<Button size="sm" variant="ghost" icon={<BarChart3 size={15} />} onClick={() => go('activities')}>All results</Button>} />
          {acts.filter((a) => a.questions.length).length === 0 ? <p className="text-sm text-ink-3">No quiz or poll for this session yet.</p> : (() => {
            const a = acts.find((x) => x.questions.length)!;
            const q = a.questions[Math.min(db.live.activityId === a.id ? db.live.questionIndex : 0, a.questions.length - 1)];
            return <><div className="mb-2 text-sm font-semibold">{a.title}: {q.text}</div><PollResults db={db} activityId={a.id} q={q} /></>;
          })()}
        </Card>
        {pre.length > 0 && (
          <Card className="p-5 lg:col-span-2">
            <SectionTitle title="Pre-submitted questions" eyebrow="Private to you and organisers" />
            <ul className="space-y-2">{pre.map((q) => <li key={q.id} className="rounded-xl bg-canvas p-3 text-sm">{q.text}<div className="mt-1 text-xs text-ink-3">{db.users.find((u) => u.id === q.userId)?.name}</div></li>)}</ul>
          </Card>
        )}
      </div>
    </div>
  );
}

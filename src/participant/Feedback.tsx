import React, { useState } from 'react';
import { CheckCircle2, Star, ShieldCheck, ChevronRight } from 'lucide-react';
import { useStore, useNow, useEvent, useSessions } from '../lib/store';
import { keys } from '../lib/collections';
import { useNav } from '../lib/nav';
import { Avatar, Badge, Button, Card, PageHeader, Stars, Tabs, cx, EmptyState, inputCls, Field } from '../components/ui';
import { SESSION_CRITERIA, EVENT_CRITERIA, MOODS } from '../lib/content';
import { sessionStatus } from '../lib/time';
import type { Session } from '../lib/types';

export function ratedTrainers(db: ReturnType<typeof useStore>['db'], s: Session) {
  const staff = s.trainerIds.filter((id) => db.trainers.find((t) => t.id === id)?.kind === 'staff');
  return staff.length ? staff : s.trainerIds.slice(0, 1);
}

function SessionForm({ s, onDone }: { s: Session; onDone: () => void }) {
  const { db, me, update, toast } = useStore();
  const ev = useEvent();
  const trainers = ratedTrainers(db, s);
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({});
  const [mood, setMood] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const complete = trainers.every((t) => SESSION_CRITERIA.every((c) => ratings[t]?.[c.key]));
  return (
    <div className="space-y-5">
      {trainers.map((tid) => {
        const t = db.trainers.find((x) => x.id === tid)!;
        return (
          <Card key={tid} className="p-5">
            <div className="mb-4 flex items-center gap-3"><Avatar name={t.name} color={t.color} size={44} /><div><div className="text-xs text-ink-3">{trainers.length > 1 ? 'Rate each trainer separately' : 'Trainer'}</div><div className="font-display font-bold">{t.name}</div></div></div>
            <div className="space-y-3">
              {SESSION_CRITERIA.map((c) => (
                <div key={c.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-ink-2">{c.label}</span>
                  <Stars label={`${c.label} for ${t.name}`} value={ratings[tid]?.[c.key] ?? 0} onChange={(v) => setRatings({ ...ratings, [tid]: { ...(ratings[tid] ?? {}), [c.key]: v } })} />
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      <Card className="p-5">
        <div className="mb-2 text-sm font-semibold text-ink-2">How do you feel after this session? <span className="font-normal text-ink-3">(optional)</span></div>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Mood">
          {MOODS.map((m) => <button key={m.key} role="radio" aria-checked={mood === m.key} onClick={() => setMood(mood === m.key ? null : m.key)} className={cx('flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-semibold transition', mood === m.key ? 'bg-lav-600 text-white' : 'bg-canvas text-ink-2 hover:bg-lav-50')}><span className="text-2xl" aria-hidden>{m.emoji}</span>{m.label}</button>)}
        </div>
        <Field label="Comments (optional)" htmlFor="fb-comment"><textarea id="fb-comment" className={cx(inputCls, 'mt-1')} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What worked well? What could be better?" /></Field>
      </Card>
      <Button size="lg" className="w-full" disabled={!complete} disabledReason="Rate every criterion" onClick={() => {
        update((d) => { trainers.forEach((tid) => d.feedback.push({ id: keys.feedback(ev.id, s.id, tid, me.id), eventId: ev.id, sessionId: s.id, trainerId: tid, userId: me.id, ratings: ratings[tid], mood, comment, ts: Date.now() })); });
        toast('Thank you! Feedback submitted'); onDone();
      }}>Submit feedback</Button>
    </div>
  );
}

function EventForm({ onDone }: { onDone: () => void }) {
  const { me, update, toast } = useStore();
  const ev = useEvent();
  const [r, setR] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [sugg, setSugg] = useState('');
  const complete = EVENT_CRITERIA.every((c) => r[c.key]);
  return (
    <div className="space-y-5">
      <Card className="p-5"><div className="space-y-3">{EVENT_CRITERIA.map((c) => <div key={c.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-semibold text-ink-2">{c.label}</span><Stars label={c.label} value={r[c.key] ?? 0} onChange={(v) => setR({ ...r, [c.key]: v })} /></div>)}</div></Card>
      <Card className="space-y-3 p-5">
        <Field label="Overall comments (optional)" htmlFor="ev-c"><textarea id="ev-c" className={inputCls} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        <Field label="Suggestions for future refreshers (optional)" htmlFor="ev-s"><textarea id="ev-s" className={inputCls} rows={3} value={sugg} onChange={(e) => setSugg(e.target.value)} /></Field>
      </Card>
      <Button size="lg" className="w-full" disabled={!complete} disabledReason="Rate every item" onClick={() => { update((d) => { d.feedback.push({ id: keys.feedback(ev.id, null, null, me.id), eventId: ev.id, sessionId: null, trainerId: null, userId: me.id, ratings: r, mood: null, comment, suggestions: sugg, ts: Date.now() }); }); toast('Thank you for your event feedback'); onDone(); }}>Submit event feedback</Button>
    </div>
  );
}

export default function FeedbackView() {
  const { db, me } = useStore();
  const { param } = useNav();
  const ev = useEvent();
  const now = useNow();
  const sessions = useSessions().filter((s) => s.kind === 'session');
  const [tab, setTab] = useState<'sessions' | 'event'>('sessions');
  const [sel, setSel] = useState<string | null>(param ?? null);
  const [done, setDone] = useState<string | null>(null);
  const given = (s: Session) => db.feedback.some((f) => f.userId === me.id && f.sessionId === s.id);
  const eventGiven = db.feedback.some((f) => f.userId === me.id && f.sessionId === null && f.eventId === ev.id);
  const s = sessions.find((x) => x.id === sel);

  if (done) return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <div className="anim-pop mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal-500 text-white"><CheckCircle2 size={44} /></div>
      <h1 className="font-display text-2xl font-extrabold">Feedback received</h1>
      <p className="mt-1 text-sm text-ink-3">{done}. Organisers review feedback in aggregate to improve future programmes. Ratings are never shown on public screens or leaderboards.</p>
      <Button className="mt-5" onClick={() => { setDone(null); setSel(null); }}>Back to feedback</Button>
    </Card>
  );

  return (
    <div>
      <PageHeader eyebrow="Your voice" title="Feedback" subtitle="Quick five-star ratings for each session and trainer, plus the overall event." />
      <Card className="mb-5 flex items-start gap-3 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-teal-600" size={18} /><p className="text-sm text-ink-2">Your feedback is private and reported to organisers only as aggregated results. In this prototype responses are stored with your demo user ID so duplicates can be prevented; production should keep identities separate from ratings where approved.</p></Card>
      <Tabs value={tab} onChange={(t) => { setTab(t); setSel(null); }} tabs={[{ id: 'sessions', label: 'Sessions & trainers' }, { id: 'event', label: <span className="flex items-center gap-1.5">Overall event {eventGiven && <CheckCircle2 size={14} className="text-teal-600" />}</span> }]} className="mb-5" />
      {tab === 'sessions' && (s ? (
        given(s) ? <EmptyState icon={<CheckCircle2 />} title="Already submitted" body="You’ve rated this session. Thank you!" action={<Button variant="secondary" onClick={() => setSel(null)}>Other sessions</Button>} /> :
          <div className="mx-auto max-w-2xl"><button onClick={() => setSel(null)} className="mb-3 text-sm font-semibold text-ink-3 hover:text-ink">← All sessions</button><h2 className="mb-4 font-display text-xl font-bold">{s.title}</h2><SessionForm s={s} onDone={() => setDone(`Thanks for rating “${s.title}”`)} /></div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {sessions.map((x) => {
            const st = sessionStatus(ev, x, now);
            const ok = given(x);
            const open = st !== 'upcoming';
            return (
              <button key={x.id} disabled={!open} onClick={() => setSel(x.id)} className="text-left disabled:cursor-not-allowed">
                <Card className={cx('flex items-center gap-3 p-4 transition', open && !ok && 'hover:shadow-pop', !open && 'opacity-55')}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bml-50 font-mono text-sm font-bold text-bml">{x.code}</span>
                  <div className="min-w-0 flex-1"><div className="truncate font-semibold">{x.title}</div><div className="truncate text-xs text-ink-3">{x.trainerLabel}</div></div>
                  {ok ? <Badge tone="teal">Submitted</Badge> : open ? <span className="flex items-center gap-1 text-sm font-bold text-bml"><Star size={15} /> Rate <ChevronRight size={15} /></span> : <Badge tone="ink">Opens at {x.start}</Badge>}
                </Card>
              </button>
            );
          })}
        </div>
      ))}
      {tab === 'event' && (eventGiven ? <EmptyState icon={<CheckCircle2 />} title="Event feedback submitted" body="Thank you for helping us improve future refreshers." /> : <div className="mx-auto max-w-2xl"><EventForm onDone={() => setDone('Thanks for rating the overall event')} /></div>)}
    </div>
  );
}

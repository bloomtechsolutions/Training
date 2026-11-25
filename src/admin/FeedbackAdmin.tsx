import React, { useState } from 'react';
import { Lock, MessageSquareQuote } from 'lucide-react';
import { useStore, eventSessions } from '../lib/store';
import { Avatar, Badge, Card, PageHeader, SectionTitle, Tabs, HBar, Stars, DemoTag, toCsv, EmptyState } from '../components/ui';
import { ExportButtons } from '../components/shared';
import { SESSION_CRITERIA, EVENT_CRITERIA, MOODS } from '../lib/content';
import { ReadOnlyNote } from './common';
import type { Feedback } from '../lib/types';

const MIN_N = 3;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export default function FeedbackAdmin() {
  const { db } = useStore();
  const ev = db.events.find((e) => e.id === db.currentEventId)!;
  const [tab, setTab] = useState<'sessions' | 'event'>('sessions');
  const sessions = eventSessions(db, ev.id).filter((s) => s.kind === 'session');
  const fb = db.feedback.filter((f) => f.eventId === ev.id);
  const confirmed = db.users.filter((u) => u.eventIds.includes(ev.id) && u.status === 'confirmed').length;
  const groups = sessions.flatMap((s) => [...new Set(fb.filter((f) => f.sessionId === s.id).map((f) => f.trainerId))].map((tid) => ({ s, tid, items: fb.filter((f) => f.sessionId === s.id && f.trainerId === tid) })));
  const eventFb = fb.filter((f) => f.sessionId === null);
  const rowsCsv = () => toCsv([['session', 'trainer', 'responses', ...SESSION_CRITERIA.map((c) => c.label)], ...groups.filter((g) => g.items.length >= MIN_N).map((g) => [g.s.title, db.trainers.find((t) => t.id === g.tid)?.name, g.items.length, ...SESSION_CRITERIA.map((c) => avg(g.items.map((f) => f.ratings[c.key] ?? 0)).toFixed(2))])]);

  return (
    <div>
      <PageHeader eyebrow="Measure" title="Feedback" subtitle="Confidential, aggregated results for organisers. Individual trainer ratings are never shown publicly or on leaderboards."
        actions={<ExportButtons filename="feedback-aggregated.csv" getText={rowsCsv} label="Export aggregated CSV" />} />
      <ReadOnlyNote />
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4"><Lock size={16} className="text-ink-3" /><span className="text-sm text-ink-2">Results with fewer than {MIN_N} responses are hidden. Comments are shown without names.</span><span className="ml-auto flex items-center gap-1.5 text-xs text-ink-3"><DemoTag /> Day 1 responses are seeded demo data</span></Card>
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'sessions', label: 'Sessions & trainers' }, { id: 'event', label: `Overall event (${eventFb.length})` }]} />
      {tab === 'sessions' && (groups.length === 0 ? <EmptyState title="No session feedback yet" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map(({ s, tid, items }) => {
            const t = db.trainers.find((x) => x.id === tid);
            const respondents = new Set(items.map((i) => i.userId)).size;
            const hidden = items.length < MIN_N;
            const overall = avg(items.flatMap((f) => Object.values(f.ratings) as number[]));
            const comments = items.filter((f) => f.comment).map((f) => f.comment);
            return (
              <Card key={`${s.id}-${tid}`} className="p-5">
                <div className="flex items-start gap-3">
                  {t && <Avatar name={t.name} color={t.color} size={40} />}
                  <div className="min-w-0 flex-1"><div className="text-xs text-ink-3">Session {s.code} · {s.title}</div><div className="font-display font-bold">{t?.name}</div></div>
                  <Badge tone="lav">{respondents}/{confirmed} · {Math.round((respondents / Math.max(1, confirmed)) * 100)}%</Badge>
                </div>
                {hidden ? <p className="mt-4 rounded-xl bg-canvas p-3 text-sm text-ink-3">Hidden until at least {MIN_N} responses.</p> : (
                  <>
                    <div className="mt-3 flex items-center gap-3"><span className="font-display text-3xl font-extrabold tabular-nums">{overall.toFixed(2)}</span><Stars label="Overall" value={overall} size={18} /></div>
                    <div className="mt-3 space-y-2">{SESSION_CRITERIA.map((c) => { const v = avg(items.map((f) => f.ratings[c.key] ?? 0)); return <HBar key={c.key} label={c.label} value={v} max={5} color="#F5A524" right={v.toFixed(2)} />; })}</div>
                    <MoodRow items={items} />
                    {comments.length > 0 && <div className="mt-3 space-y-1.5">{comments.slice(0, 3).map((c, i) => <p key={i} className="flex gap-2 rounded-xl bg-canvas p-2.5 text-sm text-ink-2"><MessageSquareQuote size={15} className="mt-0.5 shrink-0 text-ink-3" />{c}</p>)}</div>}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      ))}
      {tab === 'event' && (
        <Card className="p-5">
          <SectionTitle title="Overall event evaluation" eyebrow={`${eventFb.length} responses · ${Math.round((eventFb.length / Math.max(1, confirmed)) * 100)}% response rate`} />
          {eventFb.length < MIN_N ? <p className="text-sm text-ink-3">Results appear once at least {MIN_N} participants respond. {eventFb.length ? `${eventFb.length} so far.` : 'Submit one from the Participant view to see the flow.'}</p> : (
            <div className="grid gap-3 sm:grid-cols-2">{EVENT_CRITERIA.map((c) => { const v = avg(eventFb.map((f) => f.ratings[c.key] ?? 0)); return <HBar key={c.key} label={c.label} value={v} max={5} color="#7C5CFA" right={v.toFixed(2)} />; })}</div>
          )}
          {eventFb.filter((f) => f.suggestions).length > 0 && eventFb.length >= MIN_N && <div className="mt-4"><div className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-3">Suggestions</div>{eventFb.filter((f) => f.suggestions).map((f) => <p key={f.id} className="mb-1 rounded-xl bg-canvas p-2.5 text-sm">{f.suggestions}</p>)}</div>}
        </Card>
      )}
    </div>
  );
}

function MoodRow({ items }: { items: Feedback[] }) {
  const total = items.filter((i) => i.mood).length;
  if (!total) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">{MOODS.map((m) => { const n = items.filter((i) => i.mood === m.key).length; return n ? <span key={m.key} className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold"><span aria-hidden>{m.emoji}</span> {m.label} {Math.round((n / total) * 100)}%</span> : null; })}</div>
  );
}

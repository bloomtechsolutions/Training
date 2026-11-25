import React, { useState } from 'react';
import { Radio, MessageCircleQuestion, ThumbsUp } from 'lucide-react';
import { useStore, useNow, useEvent, useSessions, currentAndNext } from '../lib/store';
import { useNav } from '../lib/nav';
import { Badge, Card, PageHeader, cx, EmptyState, Button } from '../components/ui';
import { LiveQuestionCard } from '../engage/Quiz';
import { EXPERIENCES } from '../engage/Experiences';
import { sessionStatus } from '../lib/time';

export default function LiveHub() {
  const { db, me, update } = useStore();
  const { param, go } = useNav();
  const ev = useEvent();
  const now = useNow();
  const sessions = useSessions().filter((s) => s.engage);
  const { live } = currentAndNext(ev, useSessions(), now);
  const defaultId = param && sessions.some((s) => s.id === param) ? param : live?.engage ? live.id : (sessions.find((s) => sessionStatus(ev, s, now) !== 'done') ?? sessions[0])?.id;
  const [sel, setSel] = useState<string | undefined>(defaultId);
  const s = sessions.find((x) => x.id === sel);
  const exp = s?.engage ? EXPERIENCES[s.engage] : null;
  const El = exp?.el;
  const liveActive = db.live.activityId && db.live.phase !== 'idle';
  const sessionQs = db.qa.filter((q) => q.channel === 'session' && q.sessionId === sel && (q.status === 'approved' || q.status === 'answered')).sort((a, b) => b.votes.length - a.votes.length);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Engage Live" title="Live activities" subtitle="Quizzes, polls, word clouds, role plays, scenarios and ideas for every session." />
      {liveActive ? <LiveQuestionCard /> : (
        <Card className="flex items-center gap-3 bg-gradient-to-r from-lav-50 to-white p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lav-600 shadow-sm"><Radio size={20} /></span>
          <p className="text-sm text-ink-2">When a trainer launches a live question, it appears here instantly. Until then, explore this session’s activities at your own pace.</p>
        </Card>
      )}

      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1" role="tablist" aria-label="Session">
          {sessions.map((x) => {
            const st = sessionStatus(ev, x, now);
            return (
              <button key={x.id} role="tab" aria-selected={sel === x.id} onClick={() => setSel(x.id)} className={cx('flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition', sel === x.id ? 'bg-ink text-white' : 'bg-white text-ink-2 shadow-card ring-1 ring-ink/5 hover:text-ink')}>
                {st === 'live' && <span className="h-2 w-2 rounded-full bg-bml live-dot" />}
                <span className="font-mono text-xs opacity-70">{x.code ?? 'EA'}</span>{EXPERIENCES[x.engage!].title}
              </button>
            );
          })}
        </div>
      </div>

      {s && El ? (
        <div key={s.id} className="anim-in space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-extrabold">{s.title}</h2>
            {sessionStatus(ev, s, now) === 'live' && <Badge tone="red">Live now</Badge>}
            {sessionStatus(ev, s, now) === 'upcoming' && <Badge tone="lav">Preview · opens at {s.start}</Badge>}
          </div>
          <El />
          {s.kind === 'session' && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-display text-lg font-bold"><MessageCircleQuestion size={18} /> Session Q&A</h3><Button size="sm" variant="ghost" onClick={() => go('session', s.id)}>Ask a question</Button></div>
              {sessionQs.length === 0 ? <p className="text-sm text-ink-3">No approved questions yet.</p> : (
                <ul className="space-y-2">{sessionQs.map((q) => {
                  const voted = q.votes.includes(me.id);
                  return <li key={q.id} className="flex items-start gap-3 rounded-xl bg-canvas p-3"><button aria-pressed={voted} aria-label="Upvote" onClick={() => update((d) => { const x = d.qa.find((y) => y.id === q.id)!; x.votes = voted ? x.votes.filter((v) => v !== me.id) : [...x.votes, me.id]; })} className={cx('flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold', voted ? 'bg-bml text-white' : 'bg-white text-ink')}><ThumbsUp size={14} />{q.votes.length}</button><div className="text-sm"><div className="text-ink">{q.text}</div>{q.answer && <div className="mt-1 text-ink-2"><b>Answer:</b> {q.answer}</div>}</div></li>;
                })}</ul>
              )}
            </Card>
          )}
        </div>
      ) : <EmptyState title="Choose a session" body="Pick a session above to see its activities." />}
    </div>
  );
}

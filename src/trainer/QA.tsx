import React, { useState } from 'react';
import { Check, X, MonitorUp, MonitorOff, MessageSquareReply, ThumbsUp } from 'lucide-react';
import { useStore, setLive, audit } from '../lib/store';
import { Badge, Button, Card, EmptyState, Tabs, inputCls, cx } from '../components/ui';
import { TrainerBar } from './Header';
import { useTrainerContext } from './useTrainer';
import type { QAItem } from '../lib/types';
import { relTime } from '../lib/time';

export function QAModeration({ filter, actor }: { filter: (q: QAItem) => boolean; actor: string }) {
  const { db, update, toast } = useStore();
  const [tab, setTab] = useState<'pending' | 'approved' | 'answered' | 'rejected'>('pending');
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const all = db.qa.filter(filter);
  const list = all.filter((q) => q.status === tab).sort((a, b) => b.votes.length - a.votes.length || b.ts - a.ts);
  const count = (s: QAItem['status']) => all.filter((q) => q.status === s).length;
  const set = (id: string, patch: Partial<QAItem>, msg: string) => { update((d) => { Object.assign(d.qa.find((q) => q.id === id)!, patch); audit(d, actor, 'qa.moderate', msg); }); toast(msg); };
  return (
    <div>
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { id: 'pending', label: `Pending (${count('pending')})` }, { id: 'approved', label: `Approved (${count('approved')})` }, { id: 'answered', label: `Answered (${count('answered')})` }, { id: 'rejected', label: `Hidden (${count('rejected')})` },
      ]} />
      {list.length === 0 ? <EmptyState title={`No ${tab} questions`} /> : (
        <ul className="space-y-2">
          {list.map((q) => {
            const author = db.users.find((u) => u.id === q.userId);
            return (
              <li key={q.id}>
                <Card className={cx('p-4', q.onScreen && 'ring-2 ring-bml')}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-canvas text-xs font-bold"><ThumbsUp size={13} />{q.votes.length}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{q.text}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                        <span>{author?.name ?? 'Unknown'}{q.anonymous ? ' · shown as anonymous' : ''}</span>·<span>{relTime(q.ts)}</span>
                        <Badge tone={q.channel === 'leadership' ? 'amber' : 'lav'}>{q.channel === 'leadership' ? 'Ask Leadership' : db.sessions.find((s) => s.id === q.sessionId)?.code ? `Session ${db.sessions.find((s) => s.id === q.sessionId)?.code}` : 'Session'}</Badge>
                        {q.onScreen && <Badge tone="red">On screen</Badge>}
                      </div>
                      {q.answer && <p className="mt-2 rounded-xl bg-teal-50 p-2 text-sm"><b>Answer:</b> {q.answer}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {q.status === 'pending' && <><Button size="sm" onClick={() => set(q.id, { status: 'approved' }, 'Question approved')} icon={<Check size={15} />}>Approve</Button><Button size="sm" variant="danger" onClick={() => set(q.id, { status: 'rejected', onScreen: false }, 'Question hidden')} icon={<X size={15} />}>Hide</Button></>}
                    {(q.status === 'approved' || q.status === 'answered') && (q.onScreen
                      ? <Button size="sm" variant="secondary" onClick={() => { update((d) => { d.qa.find((x) => x.id === q.id)!.onScreen = false; }); }} icon={<MonitorOff size={15} />}>Remove from screen</Button>
                      : <Button size="sm" variant="secondary" onClick={() => { update((d) => { d.qa.forEach((x) => (x.onScreen = x.id === q.id)); setLive(d, { venueMode: 'qa' }); }); toast('Showing on venue screen'); }} icon={<MonitorUp size={15} />}>Show on screen</Button>)}
                    {q.status === 'rejected' && <Button size="sm" variant="secondary" onClick={() => set(q.id, { status: 'approved' }, 'Question restored')}>Restore</Button>}
                  </div>
                  {q.status !== 'rejected' && q.status !== 'pending' && (
                    <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const a = (answer[q.id] ?? '').trim(); if (!a) return; set(q.id, { answer: a, status: 'answered' }, 'Answer published'); setAnswer({ ...answer, [q.id]: '' }); }}>
                      <label htmlFor={`ans-${q.id}`} className="sr-only">Answer</label>
                      <input id={`ans-${q.id}`} className={inputCls} placeholder={q.answer ? 'Update the answer…' : 'Write a follow-up answer…'} value={answer[q.id] ?? ''} onChange={(e) => setAnswer({ ...answer, [q.id]: e.target.value })} />
                      <Button size="sm" type="submit" variant="soft" icon={<MessageSquareReply size={15} />}>Answer</Button>
                    </form>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function TrainerQA() {
  const { trainer, assigned } = useTrainerContext();
  const ids = assigned.map((s) => s.id);
  return (
    <div>
      <TrainerBar title="Q&A" subtitle="Moderate questions for your sessions before they appear on screen." />
      <QAModeration actor={trainer.name} filter={(q) => q.channel === 'session' && !!q.sessionId && ids.includes(q.sessionId)} />
    </div>
  );
}

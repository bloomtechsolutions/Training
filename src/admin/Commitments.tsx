import React, { useState } from 'react';
import { UserCheck, Target } from 'lucide-react';
import { useStore, audit, useNow } from '../lib/store';
import { Badge, Button, Card, PageHeader, Modal, Field, inputCls, Progress, EmptyState, Tabs, toCsv } from '../components/ui';
import { ExportButtons } from '../components/shared';
import { ADMIN_ACTOR, ReadOnlyNote, useReadOnly } from './common';
import { formatDay, mvtParts } from '../lib/time';
import type { Commitment } from '../lib/types';

export default function CommitmentsAdmin() {
  const { db, update, toast } = useStore();
  const ro = useReadOnly();
  const now = useNow();
  const [h, setH] = useState<'all' | '30' | '60' | '90'>('all');
  const [review, setReview] = useState<Commitment | null>(null);
  const [note, setNote] = useState('');
  const list = db.commitments.filter((c) => c.eventId === db.currentEventId && (h === 'all' || String(c.horizon) === h));
  const today = mvtParts(now).date;
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? id;
  return (
    <div>
      <PageHeader eyebrow="Apply" title="Commitments" subtitle="30/60/90-day actions with manager follow-up. Managers can see and review only the commitments assigned to them in production."
        actions={<ExportButtons filename="commitments.csv" getText={() => toCsv([['participant', 'horizon', 'action', 'measure', 'due', 'progress', 'status', 'review'], ...list.map((c) => [name(c.userId), c.horizon, c.action, c.measure, c.due, c.progress, c.status, c.review?.status ?? 'none'])])} />} />
      <ReadOnlyNote />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-ink-3">Total</div><div className="font-display text-2xl font-extrabold">{list.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-3">Completed</div><div className="font-display text-2xl font-extrabold">{list.filter((c) => c.status === 'done').length}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-3">Overdue</div><div className="font-display text-2xl font-extrabold text-bml">{list.filter((c) => c.status !== 'done' && c.due < today).length}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-3">Awaiting review</div><div className="font-display text-2xl font-extrabold">{list.filter((c) => c.review?.status === 'pending').length}</div></Card>
      </div>
      <Tabs className="mb-4" value={h} onChange={setH} tabs={[{ id: 'all', label: 'All' }, { id: '30', label: '30 days' }, { id: '60', label: '60 days' }, { id: '90', label: '90 days' }]} />
      {list.length === 0 ? <EmptyState icon={<Target />} title="No commitments yet" body="Participants add them in Beyond Refresher." /> : (
        <div className="space-y-2">
          {list.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <Badge tone="lav">{c.horizon}d</Badge>
              <div className="min-w-0 flex-1"><div className="font-semibold">{c.action}</div><div className="text-xs text-ink-3">{name(c.userId)} · measure: {c.measure || '—'} · due {formatDay(c.due)}{c.status !== 'done' && c.due < today ? ' · overdue' : ''}</div></div>
              <div className="flex w-40 items-center gap-2"><Progress value={c.progress} color="bg-teal-500" label="Progress" /><span className="text-xs font-bold tabular-nums">{c.progress}%</span></div>
              {c.review?.status === 'reviewed' ? <Badge tone="green" icon={<UserCheck size={12} />}>Reviewed</Badge> : !ro && <Button size="sm" variant="secondary" icon={<UserCheck size={14} />} onClick={() => { setReview(c); setNote(c.review?.note ?? ''); }}>Manager review</Button>}
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!review} onClose={() => setReview(null)} title="Manager review" footer={<><Button variant="secondary" onClick={() => setReview(null)}>Cancel</Button><Button disabled={!note.trim()} disabledReason="Add a short note" onClick={() => { if (!review) return; update((d) => { d.commitments.find((x) => x.id === review.id)!.review = { status: 'reviewed', note: note.trim(), reviewer: 'Line manager (demo)' }; audit(d, ADMIN_ACTOR, 'commitment.review', review.action); }); setReview(null); toast('Review saved; the participant can see your note'); }}>Save review</Button></>}>
        {review && <div className="space-y-3"><p className="text-sm"><b>{name(review.userId)}</b>: {review.action}</p><Field label="Note to participant" htmlFor="rv-n"><textarea id="rv-n" rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field><p className="text-xs text-ink-3">In production, only the participant’s assigned manager can do this.</p></div>}
      </Modal>
    </div>
  );
}

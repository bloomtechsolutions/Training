import React, { useState } from 'react';
import { Star, ThumbsUp, Lightbulb } from 'lucide-react';
import { useStore, audit, awardPoints } from '../lib/store';
import { Badge, Button, Card, PageHeader, Modal, Field, inputCls, Progress, EmptyState, Tabs, toCsv } from '../components/ui';
import { TeamChip, ExportButtons } from '../components/shared';
import { ADMIN_ACTOR, ReadOnlyNote, useReadOnly } from './common';
import type { Idea } from '../lib/types';
import { formatDay } from '../lib/time';

const STATUSES: Idea['status'][] = ['submitted', 'shortlisted', 'assigned', 'in-progress', 'implemented', 'closed'];

export default function InnovationAdmin() {
  const { db, update, toast } = useStore();
  const ro = useReadOnly();
  const [edit, setEdit] = useState<Idea | null>(null);
  const [filter, setFilter] = useState<'all' | 'shortlist'>('all');
  const ideas = db.ideas.filter((i) => i.eventId === db.currentEventId).filter((i) => filter === 'all' || i.status !== 'submitted').sort((a, b) => b.votes.length - a.votes.length);
  return (
    <div>
      <PageHeader eyebrow="Measure" title="Innovation pipeline" subtitle="Submissions, votes, shortlist and follow-up ownership."
        actions={<ExportButtons filename="ideas.csv" getText={() => toCsv([['title', 'team', 'votes', 'status', 'owner', 'due', 'progress'], ...ideas.map((i) => [i.title, db.teams.find((t) => t.id === i.teamId)?.name, i.votes.length, i.status, i.owner, i.due, i.progress])])} />} />
      <ReadOnlyNote />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['submitted', 'shortlisted', 'in-progress', 'implemented'] as const).map((s) => <Card key={s} className="p-4"><div className="text-xs font-semibold capitalize text-ink-3">{s.replace('-', ' ')}</div><div className="font-display text-2xl font-extrabold tabular-nums">{db.ideas.filter((i) => i.status === s).length}</div></Card>)}
      </div>
      <Tabs className="mb-4" value={filter} onChange={setFilter} tabs={[{ id: 'all', label: 'All ideas' }, { id: 'shortlist', label: 'Shortlist & follow-up' }]} />
      {ideas.length === 0 ? <EmptyState icon={<Lightbulb />} title="No ideas yet" /> : (
        <div className="space-y-3">
          {ideas.map((i) => (
            <Card key={i.id} className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-canvas text-xs font-bold"><ThumbsUp size={14} />{i.votes.length}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><b className="font-display">{i.title}</b><TeamChip team={db.teams.find((t) => t.id === i.teamId)} /><Badge tone={i.status === 'implemented' ? 'teal' : i.status === 'submitted' ? 'ink' : 'amber'}>{i.status}</Badge></div>
                  <p className="mt-1 text-sm text-ink-2">{i.solution}</p>
                  <div className="mt-1 text-xs text-ink-3">Customer: {i.customerBenefit} · Bank: {i.bankBenefit || '—'} · Needs: {i.requirements || '—'}</div>
                  {i.status !== 'submitted' && <div className="mt-2 flex items-center gap-3 text-xs text-ink-3"><span>Owner: <b className="text-ink">{i.owner || 'unassigned'}</b></span><span>Due: <b className="text-ink">{i.due ? formatDay(i.due) : '—'}</b></span><div className="w-32"><Progress value={i.progress} color="bg-teal-500" label="Progress" /></div><span className="tabular-nums">{i.progress}%</span></div>}
                </div>
                {!ro && (
                  <div className="flex gap-2">
                    {i.status === 'submitted' && <Button size="sm" icon={<Star size={14} />} onClick={() => { update((d) => { const x = d.ideas.find((y) => y.id === i.id)!; x.status = 'shortlisted'; const u = d.users.find((y) => y.id === i.userId); awardPoints(d, `shortlist:${i.id}`, i.userId, i.teamId, 200, `Shortlisted idea · ${i.title}`); audit(d, ADMIN_ACTOR, 'idea.shortlist', i.title); void u; }); toast('Shortlisted · +200 points to the team'); }}>Shortlist</Button>}
                    <Button size="sm" variant="secondary" onClick={() => setEdit(structuredClone(i))}>Follow-up</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Idea follow-up" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => { if (!edit) return; update((d) => { const x = d.ideas.find((y) => y.id === edit.id)!; Object.assign(x, { status: edit.status, owner: edit.owner, due: edit.due, progress: edit.progress }); if (edit.status !== 'submitted') awardPoints(d, `shortlist:${edit.id}`, edit.userId, edit.teamId, 200, `Shortlisted idea · ${edit.title}`); audit(d, ADMIN_ACTOR, 'idea.update', `${edit.title} → ${edit.status}`); }); setEdit(null); toast('Idea updated'); }}>Save</Button></>}>
        {edit && (
          <div className="space-y-3">
            <div className="font-display font-bold">{edit.title}</div>
            <Field label="Status" htmlFor="id-st"><select id="id-st" className={inputCls} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Idea['status'] })}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            <Field label="Owner" htmlFor="id-ow"><input id="id-ow" className={inputCls} value={edit.owner} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} placeholder="Name or team" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due date" htmlFor="id-due"><input id="id-due" type="date" className={inputCls} value={edit.due} onChange={(e) => setEdit({ ...edit, due: e.target.value })} /></Field>
              <Field label={`Progress ${edit.progress}%`} htmlFor="id-pr"><input id="id-pr" type="range" min={0} max={100} step={10} value={edit.progress} onChange={(e) => setEdit({ ...edit, progress: Number(e.target.value) })} className="mt-3 w-full accent-[#0E9384]" /></Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

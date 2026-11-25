import React, { useState } from 'react';
import { Plus, Copy, Archive, Send, Pencil, CheckCircle2, CalendarDays, MapPin, RotateCcw, Eye } from 'lucide-react';
import { useStore, uid, audit, eventSessions } from '../lib/store';
import { Badge, Button, Card, PageHeader, Modal, Field, inputCls, Tabs, EmptyState } from '../components/ui';
import { formatDay, addDays } from '../lib/time';
import { ADMIN_ACTOR } from './common';
import type { DB, TrainingEvent } from '../lib/types';

type Draft = { id?: string; name: string; regionId: string; venue: string; start: string; theme1: string; theme2: string; sourceId?: string };

export function duplicateEvent(d: DB, sourceId: string, draft: Draft) {
  const src = d.events.find((e) => e.id === sourceId)!;
  const id = uid('ev');
  const offset = 0;
  const ev: TrainingEvent = { id, name: draft.name, regionId: draft.regionId || null, venue: draft.venue, days: src.days.map((dd, i) => ({ date: addDays(draft.start, i + offset), theme: i === 0 ? draft.theme1 : i === 1 ? draft.theme2 : dd.theme })), status: 'draft', revision: 1, publishedRevision: 0, publishedAt: null, createdAt: Date.now() };
  d.events.push(ev);
  // Copy agenda and content only. Personal data, attendance, responses, feedback, notes and scores are NOT copied.
  const map: Record<string, string> = {};
  eventSessions(d, sourceId).forEach((s) => { const nid = uid('s'); map[s.id] = nid; d.sessions.push({ ...structuredClone(s), id: nid, eventId: id }); });
  d.activities.filter((a) => map[a.sessionId]).forEach((a) => d.activities.push({ ...structuredClone(a), id: uid('act'), sessionId: map[a.sessionId] }));
  d.blocks.filter((b) => map[b.sessionId]).forEach((b) => d.blocks.push({ ...b, id: uid('b'), sessionId: map[b.sessionId] }));
  Object.entries(map).forEach(([old, nid]) => { if (d.decks[old]) d.decks[nid] = { ...structuredClone(d.decks[old]), sessionId: nid }; });
  d.resources.filter((r) => r.eventId === sourceId).forEach((r) => d.resources.push({ ...r, id: uid('res'), eventId: id, sessionId: r.sessionId ? map[r.sessionId] ?? null : null }));
  audit(d, ADMIN_ACTOR, 'event.duplicate', `Duplicated “${src.name}” → “${ev.name}” (agenda and content only)`);
  return id;
}

export default function EventsAdmin() {
  const { db, update, toast } = useStore();
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [draft, setDraft] = useState<Draft | null>(null);
  const list = db.events.filter((e) => (tab === 'archived' ? e.status === 'archived' : e.status !== 'archived'));
  const blank = (): Draft => ({ name: '', regionId: '', venue: '', start: '2027-02-12', theme1: 'Align & Connect', theme2: 'Learn & Transform' });

  const save = () => {
    if (!draft) return;
    update((d) => {
      if (draft.sourceId) { duplicateEvent(d, draft.sourceId, draft); return; }
      if (draft.id) {
        const e = d.events.find((x) => x.id === draft.id)!;
        e.name = draft.name; e.regionId = draft.regionId || null; e.venue = draft.venue;
        e.days = [{ date: draft.start, theme: draft.theme1 }, { date: addDays(draft.start, 1), theme: draft.theme2 }];
        e.revision += 1;
        audit(d, ADMIN_ACTOR, 'event.edit', `Edited “${e.name}”`);
        return;
      }
      const id = uid('ev');
      d.events.push({ id, name: draft.name, regionId: draft.regionId || null, venue: draft.venue, days: [{ date: draft.start, theme: draft.theme1 }, { date: addDays(draft.start, 1), theme: draft.theme2 }], status: 'draft', revision: 1, publishedRevision: 0, publishedAt: null, createdAt: Date.now() });
      audit(d, ADMIN_ACTOR, 'event.create', `Created “${draft.name}”`);
    });
    toast(draft.sourceId ? 'Event duplicated as a draft (agenda and content only)' : draft.id ? 'Event updated' : 'Event created as a draft');
    setDraft(null);
  };
  const valid = draft && draft.name.trim().length >= 4 && /^\d{4}-\d{2}-\d{2}$/.test(draft.start);

  return (
    <div>
      <PageHeader eyebrow="Prepare" title="Events" subtitle="Create, duplicate and publish refresher events for any region. Duplicating copies the agenda and content, never participants, attendance or responses."
        actions={<Button icon={<Plus size={16} />} onClick={() => setDraft(blank())}>New event</Button>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'active', label: 'Active & drafts' }, { id: 'archived', label: 'Archived' }]} />
      {list.length === 0 ? <EmptyState icon={<Archive />} title="No archived events" /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((e) => {
            const n = db.sessions.filter((s) => s.eventId === e.id).length;
            const p = db.users.filter((u) => u.eventIds.includes(e.id)).length;
            const current = db.currentEventId === e.id;
            return (
              <Card key={e.id} className="flex flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={e.status === 'published' ? 'teal' : e.status === 'draft' ? 'amber' : 'ink'}>{e.status}</Badge>
                  {e.isTemplate && <Badge tone="lav">Template</Badge>}
                  {current && <Badge tone="red" icon={<Eye size={11} />}>Shown in apps</Badge>}
                  {e.status === 'published' && e.revision > e.publishedRevision && <Badge tone="amber">Unpublished changes</Badge>}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold">{e.name}</h3>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3">
                  <span className="flex items-center gap-1"><CalendarDays size={14} />{formatDay(e.days[0].date)} – {formatDay(e.days[e.days.length - 1].date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="flex items-center gap-1"><MapPin size={14} />{e.regionId ? db.regions.find((r) => r.id === e.regionId)?.name : 'Region TBC'} · {e.venue || 'Venue TBC'}</span>
                </div>
                <div className="mt-1 text-xs text-ink-3">{n} agenda items · {p} participants · rev {e.revision}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {e.status !== 'archived' && <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => setDraft({ id: e.id, name: e.name, regionId: e.regionId ?? '', venue: e.venue, start: e.days[0].date, theme1: e.days[0].theme, theme2: e.days[1]?.theme ?? '' })}>Edit</Button>}
                  <Button size="sm" variant="secondary" icon={<Copy size={14} />} onClick={() => setDraft({ name: `${e.name.replace(/ – .*$/, '')} – Copy`, regionId: '', venue: '', start: addDays(e.days[0].date, 56), theme1: e.days[0].theme, theme2: e.days[1]?.theme ?? '', sourceId: e.id })}>Duplicate</Button>
                  {e.status === 'draft' && <Button size="sm" icon={<Send size={14} />} disabled={n === 0} disabledReason="Add agenda items before publishing" onClick={() => { update((d) => { const x = d.events.find((y) => y.id === e.id)!; x.status = 'published'; x.publishedRevision = x.revision; x.publishedAt = Date.now(); d.publishedAgenda[x.id] = structuredClone(eventSessions(d, x.id)); audit(d, ADMIN_ACTOR, 'event.publish', `Published “${x.name}”`); }); toast('Event published'); }}>Publish</Button>}
                  {e.status !== 'archived' && !current && <Button size="sm" variant="ghost" icon={<CheckCircle2 size={14} />} onClick={() => { update((d) => { d.currentEventId = e.id; d.live.eventId = e.id; }); toast('Participant, trainer and venue views now show this event'); }}>Show in apps</Button>}
                  {e.status !== 'archived' && <Button size="sm" variant="ghost" icon={<Archive size={14} />} disabled={current} disabledReason="Switch the apps to another event first" onClick={() => { update((d) => { d.events.find((y) => y.id === e.id)!.status = 'archived'; audit(d, ADMIN_ACTOR, 'event.archive', `Archived “${e.name}”`); }); toast('Event archived'); }}>Archive</Button>}
                  {e.status === 'archived' && <Button size="sm" variant="secondary" icon={<RotateCcw size={14} />} onClick={() => { update((d) => { d.events.find((y) => y.id === e.id)!.status = 'draft'; }); toast('Restored as draft'); }}>Restore</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.sourceId ? 'Duplicate event' : draft?.id ? 'Edit event' : 'New event'} footer={<><Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button disabled={!valid} disabledReason="Enter a name and start date" onClick={save}>{draft?.sourceId ? 'Duplicate' : draft?.id ? 'Save changes' : 'Create draft'}</Button></>}>
        {draft && (
          <div className="space-y-3">
            {draft.sourceId && <p className="rounded-xl bg-lav-50 p-3 text-sm text-lav-700">Copies the agenda, activities, session plans and resources. Participants, attendance, responses, feedback and notes are not copied.</p>}
            <Field label="Event name" htmlFor="ev-name"><input id="ev-name" className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Region" htmlFor="ev-reg"><select id="ev-reg" className={inputCls} value={draft.regionId} onChange={(e) => setDraft({ ...draft, regionId: e.target.value })}><option value="">To be confirmed</option>{db.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
              <Field label="Venue" htmlFor="ev-venue"><input id="ev-venue" className={inputCls} value={draft.venue} placeholder="To be confirmed" onChange={(e) => setDraft({ ...draft, venue: e.target.value })} /></Field>
            </div>
            <Field label="Day 1 date" htmlFor="ev-start" hint="Day 2 follows automatically."><input id="ev-start" type="date" className={inputCls} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Day 1 theme" htmlFor="ev-t1"><input id="ev-t1" className={inputCls} value={draft.theme1} onChange={(e) => setDraft({ ...draft, theme1: e.target.value })} /></Field>
              <Field label="Day 2 theme" htmlFor="ev-t2"><input id="ev-t2" className={inputCls} value={draft.theme2} onChange={(e) => setDraft({ ...draft, theme2: e.target.value })} /></Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

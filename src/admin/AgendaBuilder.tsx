import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, AlertTriangle, Send, CheckCircle2, Undo2 } from 'lucide-react';
import { useStore, uid, audit, eventSessions } from '../lib/store';
import { Badge, Button, Card, PageHeader, Modal, Field, inputCls, Tabs, Toggle, cx, EmptyState } from '../components/ui';
import { durationLabel, toMin, fromMin, formatDay } from '../lib/time';
import { ADMIN_ACTOR } from './common';
import type { Session, SessionKind } from '../lib/types';

export function agendaIssues(list: Session[]) {
  const issues: Record<string, string[]> = {};
  const add = (id: string, m: string) => { (issues[id] ??= []).push(m); };
  list.forEach((s) => {
    if (!/^\d{2}:\d{2}$/.test(s.start) || !/^\d{2}:\d{2}$/.test(s.end)) add(s.id, 'Time must be HH:MM');
    else if (toMin(s.end) <= toMin(s.start)) add(s.id, 'Ends before it starts');
    if (!s.title.trim()) add(s.id, 'Missing title');
  });
  [1, 2].forEach((day) => {
    const d = list.filter((s) => s.day === day).sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 1; i < d.length; i++) if (toMin(d[i].start) < toMin(d[i - 1].end)) { add(d[i].id, `Overlaps “${d[i - 1].title}”`); add(d[i - 1].id, `Overlaps “${d[i].title}”`); }
  });
  const codes = list.filter((s) => s.code).map((s) => s.code);
  list.forEach((s) => { if (s.code && codes.filter((c) => c === s.code).length > 1) add(s.id, `Duplicate session number ${s.code}`); });
  return issues;
}

function diff(published: Session[], draft: Session[]) {
  const changes: string[] = [];
  draft.forEach((s) => {
    const p = published.find((x) => x.id === s.id);
    if (!p) changes.push(`Added: ${s.title} (Day ${s.day}, ${s.start})`);
    else if (p.start !== s.start || p.end !== s.end || p.day !== s.day) changes.push(`${s.title}: ${p.start}–${p.end} → ${s.start}–${s.end}${p.day !== s.day ? ` (Day ${s.day})` : ''}`);
    else if (p.title !== s.title || p.trainerLabel !== s.trainerLabel) changes.push(`Updated: ${s.title}`);
  });
  published.forEach((p) => { if (!draft.some((s) => s.id === p.id)) changes.push(`Removed: ${p.title}`); });
  return changes;
}

export default function AgendaBuilder() {
  const { db, update, toast } = useStore();
  const [eventId, setEventId] = useState(db.currentEventId);
  const ev = db.events.find((e) => e.id === eventId)!;
  const [day, setDay] = useState<'1' | '2'>('1');
  const [edit, setEdit] = useState<Session | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [notify, setNotify] = useState(true);
  const [msg, setMsg] = useState('');
  const draft = eventSessions(db, eventId);
  const published = db.publishedAgenda[eventId] ?? [];
  const issues = useMemo(() => agendaIssues(draft), [draft]);
  const changes = useMemo(() => diff(published, draft), [published, draft]);
  const list = draft.filter((s) => String(s.day) === day);
  const issueCount = Object.keys(issues).length;

  const touch = (d: typeof db) => { const e = d.events.find((x) => x.id === eventId)!; e.revision += 1; };
  const swap = (a: Session, b: Session) => update((d) => {
    const A = d.sessions.find((x) => x.id === a.id)!; const B = d.sessions.find((x) => x.id === b.id)!;
    const da = toMin(A.end) - toMin(A.start); const dbb = toMin(B.end) - toMin(B.start);
    const first = Math.min(toMin(A.start), toMin(B.start));
    const [x, y, dx, dy] = toMin(A.start) < toMin(B.start) ? [B, A, dbb, da] : [A, B, da, dbb];
    const gap = Math.max(0, Math.max(toMin(A.start), toMin(B.start)) - Math.min(toMin(A.end), toMin(B.end)));
    x.start = fromMin(first); x.end = fromMin(first + dx);
    y.start = fromMin(first + dx + gap); y.end = fromMin(first + dx + gap + dy);
    touch(d);
  });

  const saveEdit = () => {
    if (!edit) return;
    update((d) => {
      const i = d.sessions.findIndex((x) => x.id === edit.id);
      const label = edit.trainerIds.map((t) => d.trainers.find((x) => x.id === t)?.name).filter(Boolean).join(' / ') || '—';
      const v = { ...edit, trainerLabel: edit.trainerLabel.trim() || label };
      if (i >= 0) d.sessions[i] = v; else d.sessions.push(v);
      touch(d);
      audit(d, ADMIN_ACTOR, 'agenda.edit', `${i >= 0 ? 'Edited' : 'Added'} “${edit.title}” (${edit.start}–${edit.end})`);
    });
    setEdit(null);
    toast('Agenda draft updated. Publish to notify participants.');
  };
  const editIssues = edit ? agendaIssues([...draft.filter((s) => s.id !== edit.id), edit])[edit.id] ?? [] : [];

  return (
    <div>
      <PageHeader eyebrow="Prepare" title="Agenda builder" subtitle="Edit times, sessions and trainers in a draft, then publish. Participants see only the published agenda."
        actions={<>
          <label htmlFor="ab-ev" className="sr-only">Event</label>
          <select id="ab-ev" value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-10 max-w-[240px] rounded-xl border-0 bg-white px-3 text-sm font-semibold shadow-sm ring-1 ring-inset ring-ink/10">{db.events.filter((e) => e.status !== 'archived').map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setEdit({ id: uid('s'), eventId, day: Number(day), start: '09:00', end: '09:30', code: null, title: '', description: '', kind: 'session', trainerIds: [], trainerLabel: '', objectives: [], engage: null, order: draft.length })}>Add item</Button>
        </>} />

      <Card className={cx('mb-4 flex flex-wrap items-center gap-3 p-4', changes.length ? 'bg-amber-50/70 ring-amber-100' : '')}>
        {changes.length ? <><AlertTriangle className="text-amber-600" size={18} /><div className="min-w-0 flex-1"><div className="font-semibold">{changes.length} unpublished change{changes.length > 1 ? 's' : ''}</div><div className="truncate text-xs text-ink-3">{changes.slice(0, 2).join(' · ')}{changes.length > 2 ? ' …' : ''}</div></div>
          <Button size="sm" variant="ghost" icon={<Undo2 size={15} />} onClick={() => { update((d) => { d.sessions = d.sessions.filter((s) => s.eventId !== eventId).concat(structuredClone(published)); }); toast('Draft reverted to the published agenda'); }}>Discard</Button>
          <Button size="sm" icon={<Send size={15} />} disabled={issueCount > 0} disabledReason="Fix the highlighted issues first" onClick={() => { setMsg(changes.slice(0, 4).join('\n')); setPublishing(true); }}>Publish changes</Button></>
          : <><CheckCircle2 className="text-teal-600" size={18} /><span className="text-sm font-semibold">Draft matches the published agenda (rev {ev.publishedRevision})</span></>}
        {issueCount > 0 && <Badge tone="red" icon={<AlertTriangle size={12} />}>{issueCount} item{issueCount > 1 ? 's' : ''} need attention</Badge>}
      </Card>

      <Tabs className="mb-4" value={day} onChange={setDay} tabs={ev.days.map((d, i) => ({ id: String(i + 1) as '1' | '2', label: `Day ${i + 1} · ${formatDay(d.date)} · ${d.theme}` }))} />
      {list.length === 0 ? <EmptyState title="No items on this day" action={<Button onClick={() => setEdit({ id: uid('s'), eventId, day: Number(day), start: '09:00', end: '09:30', code: null, title: '', description: '', kind: 'session', trainerIds: [], trainerLabel: '', objectives: [], engage: null, order: draft.length })}>Add item</Button>} /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-ink/5 text-left text-xs text-ink-3"><th className="px-4 py-3 font-semibold">Time</th><th className="font-semibold">#</th><th className="font-semibold">Session</th><th className="font-semibold">Trainer</th><th className="font-semibold">Duration</th><th className="px-4 text-right font-semibold">Actions</th></tr></thead>
            <tbody>
              {list.map((s, i) => (
                <tr key={s.id} className={cx('border-b border-ink/5 last:border-0', issues[s.id] && 'bg-bml-50/50', s.kind === 'break' && 'text-ink-3')}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold tabular-nums">{s.start}–{s.end}</td>
                  <td className="font-mono text-xs font-bold text-bml">{s.code ?? (s.kind === 'vendor' ? 'EA' : '—')}</td>
                  <td className="py-3 pr-3"><div className="font-semibold text-ink">{s.title || <i className="text-ink-3">Untitled</i>}</div>{s.kind !== 'session' && <Badge tone={s.kind === 'vendor' ? 'amber' : 'ink'} className="mt-1">{s.kind === 'vendor' ? 'Vendor' : 'Break'}</Badge>}{issues[s.id]?.map((m) => <div key={m} className="mt-1 flex items-center gap-1 text-xs font-semibold text-bml"><AlertTriangle size={12} />{m}</div>)}</td>
                  <td className="max-w-[220px] truncate pr-3 text-ink-2">{s.trainerLabel}</td>
                  <td className="whitespace-nowrap tabular-nums text-ink-3">{durationLabel(s.start, s.end)}</td>
                  <td className="whitespace-nowrap px-4 text-right">
                    <Button size="sm" variant="ghost" aria-label="Move earlier" disabled={i === 0} onClick={() => swap(list[i - 1], s)} icon={<ArrowUp size={15} />} />
                    <Button size="sm" variant="ghost" aria-label="Move later" disabled={i === list.length - 1} onClick={() => swap(s, list[i + 1])} icon={<ArrowDown size={15} />} />
                    <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(structuredClone(s))} icon={<Pencil size={15} />} />
                    <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => { update((d) => { d.sessions = d.sessions.filter((x) => x.id !== s.id); touch(d); audit(d, ADMIN_ACTOR, 'agenda.delete', `Removed “${s.title}”`); }); toast('Removed from draft'); }} icon={<Trash2 size={15} />} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-3 text-xs text-ink-3">Moving an item swaps it with its neighbour and keeps each item’s duration. Gaps in the schedule are preserved.</p>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && draft.some((s) => s.id === edit.id) ? 'Edit agenda item' : 'Add agenda item'} footer={<><span className="mr-auto text-xs font-semibold text-bml">{editIssues[0] ?? ''}</span><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={!edit?.title.trim() || editIssues.some((m) => !m.startsWith('Overlaps'))} disabledReason={editIssues[0] ?? 'Add a title'} onClick={saveEdit}>Save to draft</Button></>}>
        {edit && (
          <div className="space-y-3">
            <Field label="Title" htmlFor="ag-title"><input id="ag-title" className={inputCls} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Day" htmlFor="ag-day"><select id="ag-day" className={inputCls} value={edit.day} onChange={(e) => setEdit({ ...edit, day: Number(e.target.value) })}>{ev.days.map((_, i) => <option key={i} value={i + 1}>Day {i + 1}</option>)}</select></Field>
              <Field label="Start" htmlFor="ag-start"><input id="ag-start" type="time" className={inputCls} value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} /></Field>
              <Field label="End" htmlFor="ag-end"><input id="ag-end" type="time" className={inputCls} value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })} /></Field>
              <Field label="Session no." htmlFor="ag-code"><input id="ag-code" className={inputCls} value={edit.code ?? ''} placeholder="—" maxLength={2} onChange={(e) => setEdit({ ...edit, code: e.target.value.replace(/\D/g, '') || null })} /></Field>
            </div>
            <Field label="Type" htmlFor="ag-kind"><select id="ag-kind" className={inputCls} value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as SessionKind })}><option value="session">Numbered session</option><option value="vendor">Vendor engagement activity</option><option value="break">Break</option></select></Field>
            <Field label="Description" htmlFor="ag-desc"><textarea id="ag-desc" rows={2} className={inputCls} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            {edit.kind !== 'break' && (
              <fieldset>
                <legend className="mb-1 text-xs font-semibold text-ink-2">Trainers / hosts</legend>
                <div className="flex flex-wrap gap-1.5">{db.trainers.map((t) => { const on = edit.trainerIds.includes(t.id); return <button type="button" key={t.id} aria-pressed={on} onClick={() => setEdit({ ...edit, trainerIds: on ? edit.trainerIds.filter((x) => x !== t.id) : [...edit.trainerIds, t.id] })} className={cx('rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset', on ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-2 ring-ink/10')}>{t.name}</button>; })}</div>
              </fieldset>
            )}
            <Field label="Trainer label shown on agenda" htmlFor="ag-label" hint="Leave blank to use the selected names."><input id="ag-label" className={inputCls} value={edit.trainerLabel} onChange={(e) => setEdit({ ...edit, trainerLabel: e.target.value })} /></Field>
            {editIssues.length > 0 && <div className="rounded-xl bg-bml-50 p-3 text-xs font-semibold text-bml-700">{editIssues.join(' · ')}{editIssues.every((m) => m.startsWith('Overlaps')) && ' (you can save, but must resolve before publishing)'}</div>}
          </div>
        )}
      </Modal>

      <Modal open={publishing} onClose={() => setPublishing(false)} title="Publish agenda changes" footer={<><Button variant="secondary" onClick={() => setPublishing(false)}>Cancel</Button><Button icon={<Send size={16} />} onClick={() => {
        update((d) => {
          const e = d.events.find((x) => x.id === eventId)!;
          d.publishedAgenda[eventId] = structuredClone(eventSessions(d, eventId));
          e.publishedRevision = e.revision; e.publishedAt = Date.now();
          if (notify) d.announcements.push({ id: uid('an'), eventId, title: 'Schedule updated', body: msg.trim() || 'The agenda has been updated. Please check the latest times.', audience: 'all', kind: 'schedule', ts: Date.now(), author: 'Event organisers' });
          audit(d, ADMIN_ACTOR, 'agenda.publish', `Published agenda rev ${e.revision} (${changes.length} changes)${notify ? ' with schedule-change alert' : ''}`);
        });
        setPublishing(false); toast(notify ? 'Published · participants alerted' : 'Agenda published');
      }}>Publish</Button></>}>
        <div className="space-y-3">
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-canvas p-3 text-sm">{changes.map((c) => <li key={c}>• {c}</li>)}</ul>
          <Toggle checked={notify} onChange={setNotify} label="Send a schedule-change alert" description="Appears as an announcement on participants’ home screens." />
          {notify && <Field label="Alert message" htmlFor="pub-msg"><textarea id="pub-msg" rows={4} className={inputCls} value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>}
        </div>
      </Modal>
    </div>
  );
}

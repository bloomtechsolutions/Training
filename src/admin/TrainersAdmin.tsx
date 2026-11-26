import React, { useState } from 'react';
import { Pencil, CheckCircle2, CircleDashed, Crown } from 'lucide-react';
import { useStore, audit, eventSessions, uid } from '../lib/store';
import { Plus } from 'lucide-react';
import { Avatar, Badge, Button, Card, PageHeader, Modal, Field, inputCls, SectionTitle } from '../components/ui';
import { ADMIN_ACTOR } from './common';
import type { Trainer } from '../lib/types';

export default function TrainersAdmin() {
  const { db, update, toast } = useStore();
  const [edit, setEdit] = useState<(Trainer & { exp: string }) | null>(null);
  const [adding, setAdding] = useState<{ name: string; kind: Trainer['kind'] } | null>(null);
  const COLORS = ['#B50928', '#7C5CFA', '#0E9384', '#E8502F', '#2563EB', '#D98A0B', '#9333EA', '#0F766E'];
  const sessions = eventSessions(db, db.currentEventId);
  return (
    <div>
      <PageHeader eyebrow="Prepare" title="Trainers" subtitle="Profiles, session assignments and content readiness. Add official designations, departments and biographies when supplied; nothing is invented."
        actions={<Button icon={<Plus size={16} />} onClick={() => setAdding({ name: '', kind: 'staff' })}>Add trainer</Button>} />
      {db.trainers.length === 0 && <Card className="mb-4 p-5 text-sm text-ink-2">No trainers yet. Add each trainer, then give them a sign-in in <b>Sign-in &amp; codes</b> (role: Trainer) and assign them to sessions in the <b>Agenda builder</b>.</Card>}
      <div className="grid gap-3 lg:grid-cols-2">
        {db.trainers.filter((t) => t.kind === 'staff').map((t) => {
          const mine = sessions.filter((s) => s.trainerIds.includes(t.id));
          const blocks = db.blocks.filter((b) => mine.some((s) => s.id === b.sessionId));
          const ready = blocks.filter((b) => b.ready).length;
          const pending = db.resources.filter((r) => mine.some((s) => s.id === r.sessionId) && r.status === 'pending').length;
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={t.name} color={t.color} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold">{t.name}</div>
                  <div className="text-xs text-ink-3">{t.designation || <i>Designation to be confirmed</i>} · {t.department || <i>Department to be confirmed</i>}</div>
                  <div className="mt-2 flex flex-wrap gap-1">{mine.map((s) => <Badge key={s.id} tone="red">S{s.code}</Badge>)}</div>
                </div>
                <Button size="sm" variant="ghost" icon={<Pencil size={15} />} onClick={() => setEdit({ ...structuredClone(t), exp: t.expertise.join(', ') })}>Edit</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge tone={ready === blocks.length ? 'teal' : 'amber'} icon={ready === blocks.length ? <CheckCircle2 size={11} /> : <CircleDashed size={11} />}>Content {ready}/{blocks.length} ready</Badge>
                {pending > 0 && <Badge tone="amber">{pending} file{pending > 1 ? 's' : ''} awaiting approval</Badge>}
                <Badge tone={t.bio ? 'teal' : 'ink'}>{t.bio ? 'Bio added' : 'Bio pending'}</Badge>
                <Badge tone="ink">Photo pending</Badge>
              </div>
            </Card>
          );
        })}
      </div>
      <SectionTitle className="mt-8" title="Leadership" />
      <div className="grid gap-3 sm:grid-cols-2">
        {db.leaders.map((l) => (
          <Card key={l.id} className="flex items-center gap-3 p-4">
            <Crown className="text-amber-500" />
            <div className="min-w-0 flex-1"><div className="text-xs text-ink-3">{l.role}</div>
              <label htmlFor={`ld-${l.id}`} className="sr-only">Name</label>
              <input id={`ld-${l.id}`} className={inputCls} placeholder="Name to be confirmed" value={l.name} onChange={(e) => update((d) => { d.leaders.find((x) => x.id === l.id)!.name = e.target.value; })} />
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!adding} onClose={() => setAdding(null)} title="Add trainer or host" footer={<><Button variant="secondary" onClick={() => setAdding(null)}>Cancel</Button><Button disabled={!adding || adding.name.trim().length < 2} disabledReason="Enter a name" onClick={() => {
        if (!adding) return;
        const name = adding.name.trim();
        update((d) => { d.trainers.push({ id: uid('t'), name, kind: adding.kind, designation: '', department: '', expertise: [], bio: '', color: COLORS[d.trainers.length % COLORS.length], questions: [] }); audit(d, ADMIN_ACTOR, 'trainer.create', `Added ${name}`); });
        setAdding(null); toast(`${name} added`);
      }}>Add</Button></>}>
        {adding && <div className="space-y-3">
          <Field label="Name" htmlFor="nt-name"><input id="nt-name" className={inputCls} value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} /></Field>
          <Field label="Type" htmlFor="nt-kind"><select id="nt-kind" className={inputCls} value={adding.kind} onChange={(e) => setAdding({ ...adding, kind: e.target.value as Trainer['kind'] })}><option value="staff">BML trainer</option><option value="vendor">External vendor</option><option value="group">Department / group host (e.g. PD / Retail)</option><option value="participants">Participant-led</option></select></Field>
        </div>}
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit trainer profile" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => { if (!edit) return; update((d) => { const t = d.trainers.find((x) => x.id === edit.id)!; t.designation = edit.designation.trim(); t.department = edit.department.trim(); t.bio = edit.bio.trim(); t.expertise = edit.exp.split(',').map((x) => x.trim()).filter(Boolean); audit(d, ADMIN_ACTOR, 'trainer.edit', `Updated profile of ${t.name}`); }); setEdit(null); toast('Profile saved'); }}>Save</Button></>}>
        {edit && (
          <div className="space-y-3">
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Enter only details confirmed by the trainer or HR. Leave blank if unknown.</p>
            <Field label="Official designation" htmlFor="tr-des"><input id="tr-des" className={inputCls} value={edit.designation} onChange={(e) => setEdit({ ...edit, designation: e.target.value })} /></Field>
            <Field label="Department" htmlFor="tr-dep"><select id="tr-dep" className={inputCls} value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })}><option value="">To be confirmed</option><option>Retail</option><option>Islamic Banking</option><option>Customer Experience</option><option>People Development</option></select></Field>
            <Field label="Expertise (comma-separated)" htmlFor="tr-exp"><input id="tr-exp" className={inputCls} value={edit.exp} onChange={(e) => setEdit({ ...edit, exp: e.target.value })} /></Field>
            <Field label="Biography" htmlFor="tr-bio"><textarea id="tr-bio" rows={4} className={inputCls} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

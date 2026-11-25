import React, { useState } from 'react';
import { Target, Plus, Trash2, Award, Bot, Library, Images, CheckCircle2, Circle, Layers, UserCheck, Clock } from 'lucide-react';
import { useStore, useEvent, uid, awardPoints } from '../lib/store';
import { useNav } from '../lib/nav';
import { Badge, Button, Card, PageHeader, Tabs, cx, EmptyState, inputCls, Field, Modal, Progress } from '../components/ui';
import { Flashcards } from '../engage/Cards';
import { certEligibility } from '../lib/cert';
import { addDays, formatDay } from '../lib/time';
import type { Commitment } from '../lib/types';

export function CertificateCard({ userId, eventId }: { userId: string; eventId: string }) {
  const { db } = useStore();
  const u = db.users.find((x) => x.id === userId)!;
  const ev = db.events.find((e) => e.id === eventId)!;
  const cert = db.certificates.find((c) => c.userId === userId && c.eventId === eventId);
  return (
    <div className="print-area relative mx-auto aspect-[1.414] w-full max-w-2xl overflow-hidden rounded-2xl bg-white p-[5%] shadow-card ring-1 ring-ink/10" style={{ containerType: 'inline-size' } as React.CSSProperties}>
      <div className="absolute inset-[2.5%] rounded-xl border-2 border-bml/20" />
      <div className="absolute -right-[10%] -top-[25%] h-[60%] w-[45%] rounded-full mesh opacity-90" />
      <div className="relative flex h-full flex-col">
        <div className="text-[1.6cqw] font-bold uppercase tracking-[.25em] text-bml">BML Refresher · Learn. Connect. Transform.</div>
        <div className="mt-[5%] font-display text-[5cqw] font-extrabold leading-none text-ink">Certificate of Completion</div>
        <div className="mt-[4%] text-[2cqw] text-ink-3">This certifies that</div>
        <div className="font-display text-[4.4cqw] font-extrabold text-lav-700">{u.name}</div>
        <div className="mt-[2%] max-w-[75%] text-[2cqw] text-ink-2">completed the {ev.name}, held {formatDay(ev.days[0].date, { day: 'numeric', month: 'long' })}–{formatDay(ev.days[ev.days.length - 1].date, { day: 'numeric', month: 'long', year: 'numeric' })}.</div>
        <div className="mt-auto flex items-end justify-between text-[1.6cqw] text-ink-3">
          <div><div className="mb-1 h-px w-[22cqw] bg-ink/30" />Authorised signatory (to be confirmed)</div>
          <div className="text-right font-mono">{cert ? cert.serial : 'PREVIEW · NOT ISSUED'}<br />Prototype certificate</div>
        </div>
      </div>
    </div>
  );
}

export default function Beyond() {
  const { db, me, update, toast, celebrate } = useStore();
  const ev = useEvent();
  const { go } = useNav();
  const [tab, setTab] = useState<'actions' | 'learn' | 'certificate' | 'ai'>('actions');
  const [form, setForm] = useState<{ horizon: 30 | 60 | 90; action: string; measure: string } | null>(null);
  const [showCert, setShowCert] = useState(false);
  const mine = db.commitments.filter((c) => c.userId === me.id && c.eventId === ev.id).sort((a, b) => a.horizon - b.horizon);
  const elig = certEligibility(db, me.id, ev.id);
  const cert = db.certificates.find((c) => c.userId === me.id && c.eventId === ev.id);
  const end = ev.days[ev.days.length - 1].date;

  const setProgress = (c: Commitment, progress: number) => update((d) => {
    const x = d.commitments.find((y) => y.id === c.id)!;
    x.progress = progress;
    x.status = progress >= 100 ? 'done' : progress > 0 ? 'in-progress' : 'not-started';
    if (progress >= 100) {
      if (awardPoints(d, `commitment:${c.id}`, me.id, me.teamId, 100, 'Completed commitment')) { setTimeout(() => { celebrate(); toast('Commitment completed · +100 points'); }, 0); }
      if (!x.review) x.review = { status: 'pending', note: '', reviewer: '' };
    }
  });

  return (
    <div>
      <PageHeader eyebrow="Continuous learning" title="Beyond Refresher" subtitle="Turn two days of learning into lasting change: track your actions, revisit resources and collect your certificate." />
      <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[{ id: 'actions', label: '30/60/90 actions' }, { id: 'learn', label: 'Keep learning' }, { id: 'certificate', label: 'Certificate' }, { id: 'ai', label: 'AI companion' }]} />

      {tab === 'actions' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {([30, 60, 90] as const).map((h) => {
              const list = mine.filter((c) => c.horizon === h);
              return (
                <Card key={h} className="p-4">
                  <div className="flex items-center justify-between"><div><div className="font-display text-2xl font-extrabold">{h} days</div><div className="text-xs text-ink-3">due {formatDay(addDays(end, h))}</div></div><Button size="sm" variant="soft" icon={<Plus size={15} />} onClick={() => setForm({ horizon: h, action: '', measure: '' })}>Add</Button></div>
                  <div className="mt-2 text-xs font-semibold text-ink-3">{list.length} action{list.length === 1 ? '' : 's'}</div>
                </Card>
              );
            })}
          </div>
          {mine.length === 0 ? <EmptyState icon={<Target />} title="No actions yet" body="Add one specific action for each horizon. Your manager can review progress at 30, 60 and 90 days." action={<Button icon={<Plus size={16} />} onClick={() => setForm({ horizon: 30, action: '', measure: '' })}>Add my first action</Button>} /> : (
            <div className="space-y-3">
              {mine.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><Badge tone="lav">{c.horizon}-day</Badge><Badge tone={c.status === 'done' ? 'teal' : c.status === 'in-progress' ? 'amber' : 'ink'}>{c.status.replace('-', ' ')}</Badge>
                        {c.review && <Badge tone={c.review.status === 'reviewed' ? 'green' : 'sky'} icon={c.review.status === 'reviewed' ? <UserCheck size={12} /> : <Clock size={12} />}>{c.review.status === 'reviewed' ? 'Manager reviewed' : 'Awaiting manager review'}</Badge>}</div>
                      <div className="mt-1 font-semibold">{c.action}</div>
                      <div className="text-xs text-ink-3">Success measure: {c.measure || '—'} · Owner: you · Due {formatDay(c.due)}</div>
                      {c.review?.note && <div className="mt-2 rounded-xl bg-teal-50 p-2 text-sm text-ink-2"><b>Manager note:</b> {c.review.note}</div>}
                    </div>
                    <Button size="sm" variant="ghost" aria-label="Delete action" onClick={() => update((d) => { d.commitments = d.commitments.filter((x) => x.id !== c.id); })} icon={<Trash2 size={15} />} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={c.progress} color="bg-teal-500" label="Progress" />
                    <span className="w-10 text-right text-sm font-bold tabular-nums">{c.progress}%</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">{[0, 25, 50, 75, 100].map((p) => <button key={p} onClick={() => setProgress(c, p)} className={cx('h-9 rounded-lg px-3 text-xs font-bold', c.progress === p ? 'bg-ink text-white' : 'bg-canvas text-ink-2 hover:bg-lav-50')}>{p === 100 ? 'Done' : `${p}%`}</button>)}</div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'learn' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5"><h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Layers size={18} /> Flashcards</h2><Flashcards /></Card>
          <div className="space-y-4">
            <Card className="flex items-center gap-3 p-5"><Library className="text-sky2-600" /><div className="flex-1"><div className="font-bold">Resource library</div><div className="text-sm text-ink-3">Approved slides, notes and product/process updates.</div></div><Button size="sm" variant="secondary" onClick={() => go('library')}>Open</Button></Card>
            <Card className="flex items-center gap-3 p-5"><Images className="text-coral-600" /><div className="flex-1"><div className="font-bold">Event gallery</div><div className="text-sm text-ink-3">Moderated photos from the programme.</div></div><Button size="sm" variant="secondary" onClick={() => go('gallery')}>Open</Button></Card>
            <Card className="flex items-center gap-3 p-5"><Award className="text-amber-600" /><div className="flex-1"><div className="font-bold">My results</div><div className="text-sm text-ink-3">Badges, private quiz results and notes.</div></div><Button size="sm" variant="secondary" onClick={() => go('profile')}>Open</Button></Card>
          </div>
        </div>
      )}

      {tab === 'certificate' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Card className="h-fit p-5">
            <h2 className="font-display text-lg font-bold">Eligibility</h2>
            <p className="mb-3 text-sm text-ink-3">Certificates are issued by organisers once the approved rules are met.</p>
            <ul className="space-y-2">{elig.checks.filter((c) => c.required).map((c) => <li key={c.label} className="flex items-start gap-2 text-sm">{c.ok ? <CheckCircle2 size={18} className="shrink-0 text-teal-600" /> : <Circle size={18} className="shrink-0 text-ink-4" />}{c.label}</li>)}</ul>
            <div className="mt-4 rounded-xl bg-canvas p-3 text-sm">{cert ? <b className="text-teal-700">Issued · {cert.serial}</b> : elig.eligible ? 'Eligible. Waiting for organiser approval.' : 'Not yet eligible.'}</div>
            <Button className="mt-3 w-full" variant="secondary" disabled={!cert} disabledReason="Available once an organiser issues your certificate" onClick={() => setShowCert(true)} icon={<Award size={16} />}>View certificate</Button>
          </Card>
          <div><div className="mb-2 text-xs font-semibold text-ink-3">{cert ? 'Your certificate' : 'Preview'}</div><CertificateCard userId={me.id} eventId={ev.id} /></div>
        </div>
      )}

      {tab === 'ai' && (
        <Card className="p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lav-50 text-lav-600"><Bot size={28} /></span>
            <div>
              <div className="flex items-center gap-2"><h2 className="font-display text-xl font-bold">AI learning companion</h2><Badge tone="amber">Future feature</Badge></div>
              <p className="mt-1 text-sm text-ink-2">A planned assistant that answers questions using only approved training, product and process materials, always with source citations. It will say “I don’t know” when the approved sources don’t cover a question, and it will never use confidential customer or employee data.</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2"><li>Grounded only in approved content from the library</li><li>Citations to the exact document and version</li><li>Abstains when evidence is missing</li><li>Requires BML information security approval before launch</li></ul>
              <Button className="mt-4" disabled disabledReason="Not built in this prototype; requires approval and an approved AI service">Ask the companion · not available yet</Button>
            </div>
          </div>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Add an action" footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button disabled={!form?.action.trim()} disabledReason="Describe the action" onClick={() => {
        if (!form) return;
        update((d) => { d.commitments.push({ id: uid('cm'), userId: me.id, eventId: ev.id, horizon: form.horizon, action: form.action.trim(), measure: form.measure.trim(), due: addDays(end, form.horizon), progress: 0, status: 'not-started', review: null, ts: Date.now() }); });
        setForm(null); toast('Action added');
      }}>Add action</Button></>}>
        {form && <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Horizon">{([30, 60, 90] as const).map((h) => <button key={h} role="radio" aria-checked={form.horizon === h} onClick={() => setForm({ ...form, horizon: h })} className={cx('h-12 rounded-xl text-sm font-bold', form.horizon === h ? 'bg-lav-600 text-white' : 'bg-canvas')}>{h} days</button>)}</div>
          <Field label="Action" htmlFor="cm-action"><input id="cm-action" className={inputCls} value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} placeholder="e.g. Ask three open questions before recommending anything" /></Field>
          <Field label="Success measure" htmlFor="cm-measure"><input id="cm-measure" className={inputCls} value={form.measure} onChange={(e) => setForm({ ...form, measure: e.target.value })} placeholder="How will you and your manager know?" /></Field>
          <p className="text-xs text-ink-3">Due {formatDay(addDays(end, form.horizon))}. Your manager can view and review this action.</p>
        </div>}
      </Modal>
      <Modal open={showCert} onClose={() => setShowCert(false)} title="Certificate" wide footer={<Button variant="secondary" onClick={() => { try { window.print(); } catch { /* blocked */ } toast('If no print dialog appeared, printing is blocked in this viewer.', 'info'); }}>Print</Button>}>
        <CertificateCard userId={me.id} eventId={ev.id} />
      </Modal>
    </div>
  );
}

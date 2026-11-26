import React, { useState } from 'react';
import { ArrowLeft, Send, Crown, CalendarDays, FileText, UserRound } from 'lucide-react';
import { useStore, uid, useSessions } from '../lib/store';
import { useNav } from '../lib/nav';
import { Avatar, Badge, Button, Card, PageHeader, SectionTitle, EmptyState, inputCls, cx } from '../components/ui';
import { SessionMeta } from '../components/shared';
import { ResourceRow } from './Library';

export function TrainerDirectory() {
  const { db } = useStore();
  const sessions = useSessions();
  const { go } = useNav();
  const staff = db.trainers.filter((t) => t.kind === 'staff');
  return (
    <div>
      <PageHeader eyebrow="Meet the team" title="Trainers" subtitle="Trainers from Retail, Islamic Banking, Customer Experience and People Development, plus our external engagement partner. Official photos and designations will be added when supplied." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {staff.map((t) => {
          const mine = sessions.filter((s) => s.trainerIds.includes(t.id));
          return (
            <button key={t.id} onClick={() => go('trainer', t.id)} className="group text-left">
              <Card className="flex h-full items-center gap-4 p-4 transition group-hover:-translate-y-0.5 group-hover:shadow-pop">
                <Avatar name={t.name} color={t.color} size={60} />
                <div className="min-w-0">
                  <div className="font-display text-base font-bold leading-snug text-ink">{t.name}</div>
                  <div className="text-xs text-ink-3">{t.designation || 'Designation to be confirmed'}{t.department ? ` · ${t.department}` : ''}</div>
                  <div className="mt-2 flex flex-wrap gap-1">{mine.map((s) => <Badge key={s.id} tone="red">{s.code ? `S${s.code}` : s.title}</Badge>)}</div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {db.leaders.length > 0 && <>
      <SectionTitle className="mt-8" title="Leadership" eyebrow="Joining the programme" />
      <div className="grid gap-3 sm:grid-cols-2">
        {db.leaders.map((l) => (
          <Card key={l.id} className="flex items-center gap-4 p-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600"><Crown size={24} /></span>
            <div><div className="font-display font-bold text-ink">{l.name || 'Name to be confirmed'}</div><div className="text-sm text-ink-3">{l.role}</div></div>
          </Card>
        ))}
      </div>
      </>}
      <Card className="mt-3 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-ink-2">Have a question for leadership? Submit it in advance or during the event.</p>
        <Button variant="soft" onClick={() => go('leadership')}>Ask Leadership</Button>
      </Card>

      <SectionTitle className="mt-8" title="Partners & hosts" />
      <div className="grid gap-3 sm:grid-cols-3">
        {db.trainers.filter((t) => t.kind !== 'staff').map((t) => (
          <Card key={t.id} className="flex items-center gap-3 p-4"><Avatar name={t.name} color={t.color} size={44} /><div><div className="font-semibold text-ink">{t.name}</div><div className="text-xs text-ink-3">{t.kind === 'vendor' ? 'Engagement activities' : t.kind === 'participants' ? 'Participant-led sessions' : 'Ice breaker host'}</div></div></Card>
        ))}
      </div>
    </div>
  );
}

export function TrainerProfile() {
  const { db, me, update, toast } = useStore();
  const { param, back, go } = useNav();
  const sessions = useSessions();
  const [q, setQ] = useState('');
  const t = db.trainers.find((x) => x.id === param);
  if (!t) return <EmptyState title="Trainer not found" action={<Button onClick={() => go('trainers')}>All trainers</Button>} />;
  const mine = sessions.filter((s) => s.trainerIds.includes(t.id));
  const materials = db.resources.filter((r) => mine.some((s) => s.id === r.sessionId) && r.status === 'approved' && r.audience === 'participants');
  const myQs = t.questions.filter((x) => x.userId === me.id);
  return (
    <div className="space-y-5">
      <button onClick={back} className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-ink-3 hover:text-ink"><ArrowLeft size={16} /> Back</button>
      <Card className="overflow-hidden">
        <div className="h-24 sm:h-32" style={{ background: `linear-gradient(120deg, ${t.color}, ${t.color}99 50%, #7C5CFA)` }} />
        <div className="-mt-12 flex flex-col gap-4 px-5 pb-5 sm:-mt-14 sm:flex-row sm:items-end">
          <div className="relative">
            <Avatar name={t.name} color={t.color} size={104} className="ring-4 ring-white" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-ink-3 shadow">Photo pending</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold text-ink">{t.name}</h1>
            <div className="text-sm text-ink-3">{t.designation || 'Designation to be confirmed'} · {t.department || 'Department to be confirmed'}</div>
          </div>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-1 font-display text-lg font-bold">About</h2>
            {t.bio ? <p className="text-sm text-ink-2">{t.bio}</p> : <p className="flex items-center gap-2 text-sm text-ink-3"><UserRound size={16} /> Biography to be supplied by the trainer. Organisers can add it in Refresher 360.</p>}
            {t.expertise.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{t.expertise.map((e) => <Badge key={e} tone="lav">{e}</Badge>)}</div>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><CalendarDays size={18} /> Sessions</h2>
            <ul className="space-y-2">{mine.map((s) => (
              <li key={s.id}><button onClick={() => go('session', s.id)} className="flex w-full items-center gap-3 rounded-xl bg-canvas p-3 text-left hover:bg-lav-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-mono text-sm font-bold text-bml">{s.code}</span>
                <div className="min-w-0"><div className="font-semibold text-ink">{s.title}</div><div className="text-xs text-ink-3">Day {s.day} · <SessionMeta s={s} /></div></div>
              </button></li>
            ))}</ul>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><FileText size={18} /> Materials</h2>
            {materials.length ? <div className="space-y-2">{materials.map((r) => <ResourceRow key={r.id} r={r} />)}</div> : <p className="text-sm text-ink-3">No approved materials yet.</p>}
          </Card>
        </div>
        <Card className="h-fit p-5">
          <h2 className="font-display text-lg font-bold">Ask before the session</h2>
          <p className="text-sm text-ink-3">Pre-submit a question. Only {t.name.split(' ')[0]} and organisers see it.</p>
          <label htmlFor="pre-q" className="sr-only">Question</label>
          <textarea id="pre-q" className={cx(inputCls, 'mt-3')} rows={3} maxLength={280} value={q} onChange={(e) => setQ(e.target.value)} placeholder="What would you like covered?" />
          <Button className="mt-2 w-full" disabled={q.trim().length < 5} disabledReason="Type at least 5 characters" icon={<Send size={15} />} onClick={() => { update((d) => { d.trainers.find((x) => x.id === t.id)!.questions.push({ id: uid('pq'), userId: me.id, text: q.trim(), ts: Date.now() }); }); setQ(''); toast('Question sent to trainer'); }}>Send question</Button>
          {myQs.length > 0 && <ul className="mt-3 space-y-1.5">{myQs.map((x) => <li key={x.id} className="rounded-lg bg-canvas px-3 py-2 text-sm text-ink-2">{x.text}</li>)}</ul>}
        </Card>
      </div>
    </div>
  );
}

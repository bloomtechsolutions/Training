import React, { useState } from 'react';
import { ArrowLeft, Radio, Star, QrCode, Bookmark, BookmarkCheck, FileText, Send, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useStore, useNow, useEvent, uid, useSessions } from '../lib/store';
import { useNav } from '../lib/nav';
import { Badge, Button, Card, Tabs, cx, EmptyState, inputCls, Avatar, Toggle } from '../components/ui';
import { SessionMeta, SlideView, KindIcon } from '../components/shared';
import { formatDay, sessionStatus } from '../lib/time';
import { NoteEditor } from './NoteEditor';
import { ResourceRow } from './Library';
import { typeOf, showTypeBadge } from '../lib/sessionTypes';
import { TypeBadge } from '../admin/AgendaBuilder';

export default function SessionDetail() {
  const { db, me, update, toast } = useStore();
  const { param, go, back } = useNav();
  const ev = useEvent();
  const now = useNow();
  const s = useSessions().find((x) => x.id === param);
  const [tab, setTab] = useState<'overview' | 'slides' | 'notes' | 'resources' | 'ask'>('overview');
  const [slide, setSlide] = useState(0);
  const [question, setQuestion] = useState('');
  const [anon, setAnon] = useState(false);
  if (!s) return <EmptyState title="Session not found" body="It may have been removed from the agenda." action={<Button onClick={() => go('agenda')}>Back to agenda</Button>} />;
  const st = sessionStatus(ev, s, now);
  const trainers = s.trainerIds.map((id) => db.trainers.find((t) => t.id === id)!).filter(Boolean);
  const saved = (db.bookmarks[me.id] ?? []).includes(s.id);
  const deck = db.decks[s.id];
  const slidesShared = st !== 'upcoming';
  const resources = db.resources.filter((r) => r.sessionId === s.id && r.status === 'approved' && r.audience === 'participants');
  const note = db.notes[`${me.id}:${s.id}`];
  const myQs = db.qa.filter((q) => q.sessionId === s.id && q.userId === me.id);
  const checked = db.attendance.some((a) => a.userId === me.id && a.sessionId === s.id);

  const bookmarkSlide = (i: number) => update((d) => {
    const k = `${me.id}:${s.id}`;
    const n = d.notes[k] ?? { text: '', learned: ['', '', ''], action: '', questions: '', application: '', slides: [], updatedAt: Date.now() };
    n.slides = n.slides.includes(i) ? n.slides.filter((x) => x !== i) : [...n.slides, i].sort((a, b) => a - b);
    n.updatedAt = Date.now();
    d.notes[k] = n;
  });

  return (
    <div className="space-y-5">
      <button onClick={back} className="inline-flex items-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-ink-3 hover:text-ink"><ArrowLeft size={16} /> Back</button>
      <Card className="overflow-hidden">
        <div className={cx('relative p-5 sm:p-7', s.kind === 'vendor' ? 'bg-gradient-to-br from-amber-100 to-coral-50' : 'mesh-soft')}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-bml shadow-sm"><KindIcon s={s} /></span>
            {s.code && <Badge tone="red">Session {s.code}</Badge>}
            {showTypeBadge(db, s) && <TypeBadge t={typeOf(db, s)} />}
            <Badge tone={st === 'live' ? 'red' : st === 'done' ? 'teal' : 'lav'}>{st === 'live' ? 'Live now' : st === 'done' ? 'Completed' : 'Upcoming'}</Badge>
            {checked && <Badge tone="green">Checked in</Badge>}
          </div>
          <h1 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{s.title}</h1>
          <div className="mt-1 text-sm font-semibold text-ink-2">Day {s.day} · {formatDay(ev.days[s.day - 1].date)} · <SessionMeta s={s} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.engage && st !== 'upcoming' && <Button onClick={() => go('live', s.id)} icon={<Radio size={16} />}>{st === 'live' ? 'Join live activity' : 'Open activities'}</Button>}
            {st === 'live' && !checked && <Button variant="secondary" onClick={() => go('attendance')} icon={<QrCode size={16} />}>Check in</Button>}
            {s.kind === 'session' && st !== 'upcoming' && <Button variant="secondary" onClick={() => go('feedback', s.id)} icon={<Star size={16} />}>Give feedback</Button>}
            <Button variant="ghost" aria-pressed={saved} onClick={() => update((d) => { const c = d.bookmarks[me.id] ?? []; d.bookmarks[me.id] = saved ? c.filter((x) => x !== s.id) : [...c, s.id]; })} icon={saved ? <BookmarkCheck size={16} className="text-bml" /> : <Bookmark size={16} />}>{saved ? 'Saved' : 'Save'}</Button>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        ...(deck ? [{ id: 'slides' as const, label: 'Slides' }] : []),
        { id: 'notes', label: note?.updatedAt ? 'My notes ✓' : 'My notes' },
        { id: 'resources', label: `Resources (${resources.length})` },
        ...(s.kind === 'session' ? [{ id: 'ask' as const, label: 'Ask a question' }] : []),
      ]} />

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="font-display text-lg font-bold">About this session</h2>
            <p className="mt-1 text-sm text-ink-2">{s.description}</p>
            {s.objectives.length > 0 && (<>
              <h3 className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-3">Objectives · draft</h3>
              <ul className="mt-2 space-y-2">{s.objectives.map((o, i) => <li key={o} className="flex gap-3 text-sm text-ink-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-bml-50 font-mono text-xs font-bold text-bml">{i + 1}</span>{o}</li>)}</ul>
            </>)}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg font-bold">{trainers.length > 1 ? 'Trainers' : 'Trainer'}</h2>
            {trainers.length === 0 ? <p className="text-sm text-ink-3">No trainer for this item.</p> : (
              <ul className="space-y-2">
                {trainers.map((t) => (
                  <li key={t.id}>
                    <button disabled={t.kind !== 'staff'} onClick={() => go('trainer', t.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-canvas disabled:hover:bg-transparent">
                      <Avatar name={t.name} color={t.color} size={42} />
                      <div className="min-w-0"><div className="font-semibold text-ink">{t.name}</div><div className="text-xs text-ink-3">{t.kind === 'staff' ? (t.designation || 'Designation to be confirmed') : t.kind === 'vendor' ? 'External engagement vendor' : t.kind === 'participants' ? 'Led by participants' : 'People Development / Retail'}</div></div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {s.trainerLabel.includes('hosted by') && <p className="mt-2 text-xs text-ink-3">{s.trainerLabel}</p>}
          </Card>
        </div>
      )}

      {tab === 'slides' && deck && (
        slidesShared ? (
          <Card className="p-4 sm:p-5">
            <SlideView slide={deck.slides[slide]} index={slide} total={deck.slides.length} className="shadow-card ring-1 ring-ink/5" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button size="sm" variant="secondary" aria-label="Previous slide" disabled={slide === 0} onClick={() => setSlide(slide - 1)} icon={<ChevronLeft size={16} />} />
                <span className="px-2 text-sm font-semibold tabular-nums text-ink-2">{slide + 1} / {deck.slides.length}</span>
                <Button size="sm" variant="secondary" aria-label="Next slide" disabled={slide === deck.slides.length - 1} onClick={() => setSlide(slide + 1)} icon={<ChevronRight size={16} />} />
              </div>
              <Button size="sm" variant={note?.slides.includes(slide) ? 'soft' : 'ghost'} onClick={() => bookmarkSlide(slide)} icon={note?.slides.includes(slide) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}>{note?.slides.includes(slide) ? 'Slide bookmarked' : 'Bookmark slide'}</Button>
            </div>
            <p className="mt-2 text-xs text-ink-3">{deck.source === 'sample' ? 'Sample deck for the prototype. Approved slides will replace it.' : 'Slides shared by the trainer.'} Speaker notes are never shown to participants.</p>
          </Card>
        ) : <EmptyState icon={<Lock />} title="Slides will appear once the session starts" body="Trainers share approved slides during or after the session." />
      )}

      {tab === 'notes' && <Card className="p-5"><NoteEditor sessionId={s.id} /></Card>}

      {tab === 'resources' && (resources.length ? <div className="space-y-2">{resources.map((r) => <ResourceRow key={r.id} r={r} />)}</div> : <EmptyState icon={<FileText />} title="No approved resources yet" body="Trainers’ materials appear here after approval." />)}

      {tab === 'ask' && (
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Ask {trainers.filter((t) => t.kind === 'staff').map((t) => t.name.split(' ')[0]).join(' / ') || 'the hosts'} a question</h2>
          <p className="text-sm text-ink-3">Questions are moderated before they’re shown or answered.</p>
          <label htmlFor="sess-q" className="sr-only">Your question</label>
          <textarea id="sess-q" className={cx(inputCls, 'mt-3')} rows={3} maxLength={280} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Type your question…" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="w-72"><Toggle checked={anon} onChange={setAnon} label="Hide my name from the audience" description="Organisers can still see who asked." /></div>
            <Button disabled={question.trim().length < 5} disabledReason="Type at least 5 characters" icon={<Send size={15} />} onClick={() => {
              update((d) => { d.qa.push({ id: uid('q'), eventId: ev.id, channel: 'session', sessionId: s.id, userId: me.id, text: question.trim(), anonymous: anon, status: 'pending', votes: [], answer: '', onScreen: false, ts: Date.now() }); });
              setQuestion(''); toast('Question sent for moderation');
            }}>Send question</Button>
          </div>
          {myQs.length > 0 && <ul className="mt-4 space-y-2">{myQs.map((q) => <li key={q.id} className="rounded-xl bg-canvas p-3 text-sm"><div className="flex items-center justify-between gap-2"><span>{q.text}</span><Badge tone={q.status === 'answered' ? 'teal' : q.status === 'approved' ? 'lav' : q.status === 'rejected' ? 'ink' : 'amber'}>{q.status}</Badge></div>{q.answer && <p className="mt-1 text-ink-2"><b>Answer:</b> {q.answer}</p>}</li>)}</ul>}
        </Card>
      )}
    </div>
  );
}

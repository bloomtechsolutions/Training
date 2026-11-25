import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, MonitorOff, MousePointer2, Upload, Rocket, Repeat2, Timer, Cast, StickyNote, Info, RotateCcw } from 'lucide-react';
import { useStore, useNow, useEvent, setLive, audit, uid, useTick } from '../lib/store';
import { Badge, Button, Card, EmptyState, Modal, cx, Avatar, inputCls } from '../components/ui';
import { SlideView } from '../components/shared';
import { TrainerBar } from './Header';
import { useTrainerContext } from './useTrainer';
import { launchActivity } from './liveControl';
import { sessionEnd, mmss, sessionStatus } from '../lib/time';
import type { Slide } from '../lib/types';
import { useNav } from '../lib/nav';

function readImage(file: File, max = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Could not read file'));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`${file.name} is not a readable image`));
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.78));
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(file);
  });
}

export default function Presenter() {
  const { db, update, toast, setTrainerId, trainerId } = useStore();
  const { session, trainer } = useTrainerContext();
  const { go } = useNav();
  const ev = useEvent();
  const now = useNow();
  const real = useTick(1000);
  const stage = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [localIdx, setLocalIdx] = useState(0);
  const [pointerMode, setPointerMode] = useState(false);
  const [handover, setHandover] = useState(false);
  const [launch, setLaunch] = useState(false);
  const [jump, setJump] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const deck = session ? db.decks[session.id] : undefined;
  const onVenue = !!session && db.live.sessionId === session.id && (db.live.venueMode === 'presentation' || db.live.venueMode === 'blackout');
  const idx = onVenue ? db.live.slideIndex : localIdx;
  const total = deck?.slides.length ?? 0;

  const goTo = (i: number) => {
    if (!deck) return;
    const n = Math.max(0, Math.min(total - 1, i));
    setLocalIdx(n);
    if (onVenue) update((d) => setLive(d, { slideIndex: n, pointer: null }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); goTo(idx + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(idx - 1); }
      if (e.key.toLowerCase() === 'b') toggleBlackout();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!session || !deck) return <><TrainerBar title="Presenter" /><EmptyState title="No deck for this session" /></>;
  const slide = deck.slides[idx] ?? deck.slides[0];
  const next = deck.slides[idx + 1];
  const blackout = onVenue && db.live.venueMode === 'blackout';
  const remaining = sessionEnd(ev, session) - now;
  const acts = db.activities.filter((a) => a.sessionId === session.id);
  const co = session.trainerIds.filter((t) => t !== trainerId && db.trainers.find((x) => x.id === t)?.kind === 'staff');

  function toggleBlackout() {
    if (!onVenue) { toast('Send the deck to the venue screen first', 'warn'); return; }
    update((d) => setLive(d, { venueMode: d.live.venueMode === 'blackout' ? 'presentation' : 'blackout' }));
  }

  const present = () => {
    update((d) => { setLive(d, { sessionId: session.id, venueMode: 'presentation', slideIndex: localIdx, controller: trainerId, activityId: null, phase: 'idle', pointer: null }); audit(d, trainer.name, 'venue.present', `Presenting ${session.title}`); });
    setStartedAt(Date.now());
    toast('Venue screen is now showing your slides');
  };

  return (
    <div>
      <TrainerBar title="Presenter" subtitle={onVenue ? 'Controlling the venue screen' : 'Rehearsal mode: the venue screen is not showing this deck'} actions={
        onVenue ? <Badge tone="red" icon={<Cast size={12} />} className="h-10 px-3 text-xs">On venue screen</Badge> : <Button onClick={present} icon={<Cast size={16} />}>Send to venue screen</Button>
      } />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-3">
          <div ref={stage} className="relative rounded-2xl bg-ink p-2 sm:p-3">
            <div className={cx('relative', pointerMode && 'cursor-crosshair')} onClick={(e) => {
              if (!pointerMode || !onVenue) return;
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const x = ((e.clientX - r.left) / r.width) * 100; const y = ((e.clientY - r.top) / r.height) * 100;
              update((d) => setLive(d, { pointer: { x, y } }));
            }}>
              <SlideView slide={slide} index={idx} total={total} className={cx(blackout && 'opacity-20')} />
              {onVenue && db.live.pointer && <span className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bml shadow-[0_0_0_6px_rgba(181,9,40,.35)]" style={{ left: `${db.live.pointer.x}%`, top: `${db.live.pointer.y}%` }} />}
              {blackout && <div className="absolute inset-0 flex items-center justify-center rounded-xl text-sm font-bold text-white/80">Venue screen is blacked out</div>}
            </div>
          </div>
          <Card className="flex flex-wrap items-center gap-2 p-2">
            <Button variant="secondary" aria-label="Previous slide" disabled={idx === 0} onClick={() => goTo(idx - 1)} icon={<ChevronLeft size={20} />} className="h-12 w-14 px-0" />
            <Button aria-label="Next slide" disabled={idx >= total - 1} onClick={() => goTo(idx + 1)} icon={<ChevronRight size={20} />} className="h-12 w-20 px-0" />
            <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const n = Number(jump); if (n >= 1 && n <= total) { goTo(n - 1); setJump(''); } else toast(`Enter 1–${total}`, 'warn'); }}>
              <label htmlFor="jump" className="sr-only">Jump to slide</label>
              <input id="jump" inputMode="numeric" className="h-12 w-16 rounded-xl bg-canvas text-center text-sm font-semibold" placeholder={`${idx + 1}/${total}`} value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))} />
              <Button size="sm" variant="ghost" type="submit">Go</Button>
            </form>
            <div className="mx-1 hidden h-8 w-px bg-ink/10 sm:block" />
            <Button size="sm" variant={blackout ? 'dark' : 'secondary'} onClick={toggleBlackout} icon={<MonitorOff size={16} />} disabled={!onVenue} disabledReason="Send to the venue screen first">{blackout ? 'Restore' : 'Blackout'}</Button>
            <Button size="sm" variant={pointerMode ? 'dark' : 'secondary'} onClick={() => { setPointerMode(!pointerMode); if (pointerMode) update((d) => setLive(d, { pointer: null })); }} icon={<MousePointer2 size={16} />} disabled={!onVenue} disabledReason="Send to the venue screen first">Pointer</Button>
            <Button size="sm" variant="secondary" onClick={() => { const el = stage.current; if (el?.requestFullscreen) el.requestFullscreen().catch(() => toast('Full screen is not available in this viewer', 'warn')); else toast('Full screen is not available here', 'warn'); }} icon={<Maximize2 size={16} />}>Full screen</Button>
            <Button size="sm" variant="soft" onClick={() => setLaunch(true)} icon={<Rocket size={16} />} disabled={!acts.length} disabledReason="No activities for this session">Launch activity</Button>
            <Button size="sm" variant="ghost" onClick={() => setHandover(true)} icon={<Repeat2 size={16} />} disabled={!co.length} disabledReason="No co-trainer on this session">Handover</Button>
          </Card>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Slide thumbnails">
            {deck.slides.map((s, i) => (
              <button key={s.id} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}: ${s.title}`} aria-current={i === idx} className={cx('w-36 shrink-0 overflow-hidden rounded-xl ring-2 transition', i === idx ? 'ring-bml' : 'ring-transparent opacity-80 hover:opacity-100')}>
                <SlideView slide={s} compact />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Card className="grid grid-cols-2 gap-2 p-3 text-center">
            <div className="rounded-xl bg-canvas p-2"><div className="text-[11px] font-semibold text-ink-3">Presenting for</div><div className="font-mono text-xl font-bold tabular-nums">{startedAt ? mmss(real - startedAt) : '0:00'}</div></div>
            <div className={cx('rounded-xl p-2', sessionStatus(ev, session, now) === 'live' && remaining < 300000 ? 'bg-bml-50 text-bml' : 'bg-canvas')}><div className="text-[11px] font-semibold text-ink-3"><Timer size={11} className="inline" /> Session left</div><div className="font-mono text-xl font-bold tabular-nums">{sessionStatus(ev, session, now) === 'live' ? mmss(remaining) : '—'}</div></div>
            {startedAt && <button className="col-span-2 text-xs font-semibold text-ink-3 hover:text-ink" onClick={() => setStartedAt(Date.now())}><RotateCcw size={11} className="inline" /> Reset timer</button>}
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-3"><StickyNote size={14} /> Speaker notes · private</div>
            <label htmlFor="notes" className="sr-only">Speaker notes</label>
            <textarea id="notes" className={cx(inputCls, 'min-h-[120px] text-[15px] leading-relaxed')} value={slide.notes} onChange={(e) => update((d) => { d.decks[session.id].slides[idx].notes = e.target.value; })} />
            <p className="mt-1 text-[11px] text-ink-3">Never shown on the venue screen or to participants.</p>
          </Card>
          <Card className="p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-3">Next slide</div>
            {next ? <SlideView slide={next} compact /> : <div className="rounded-xl bg-canvas p-6 text-center text-sm text-ink-3">End of deck</div>}
          </Card>
          <Card className="p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-3">Slides</div>
            <p className="text-sm text-ink-2">{deck.source === 'sample' ? 'Using the built-in sample deck.' : `${deck.slides.length} uploaded slide images.`}</p>
            <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp,.pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="sr-only" id="deck-up" onChange={async (e) => {
              const files = Array.from(e.target.files ?? []); e.target.value = '';
              if (!files.length) return;
              const imgs = files.filter((f) => /^image\/(png|jpeg|webp)$/.test(f.type)).slice(0, 15);
              const docs = files.filter((f) => /\.(pdf|pptx)$/i.test(f.name));
              const bad = files.length - imgs.length - docs.length;
              setBusy(true);
              try {
                if (imgs.length) {
                  imgs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
                  const urls = await Promise.all(imgs.map((f) => readImage(f)));
                  const slides: Slide[] = urls.map((u, i) => ({ id: uid('sl'), layout: 'image', title: imgs[i].name.replace(/\.[^.]+$/, ''), bullets: [], notes: '', accent: '#B50928', image: u }));
                  update((d) => { d.decks[session.id] = { ...d.decks[session.id], slides, source: 'images', uploads: [...d.decks[session.id].uploads, ...imgs.map((f) => ({ name: f.name, size: f.size, kind: f.type, ts: Date.now() }))] }; });
                  setLocalIdx(0);
                  toast(`${imgs.length} slide image${imgs.length > 1 ? 's' : ''} loaded`);
                }
                if (docs.length) {
                  update((d) => {
                    d.decks[session.id].uploads.push(...docs.map((f) => ({ name: f.name, size: f.size, kind: f.name.split('.').pop()!, ts: Date.now() })));
                    docs.forEach((f) => d.resources.push({ id: uid('res'), eventId: ev.id, sessionId: session.id, title: f.name, kind: f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'pptx', description: 'Uploaded by trainer. Awaiting conversion and organiser approval.', version: 1, status: 'pending', audience: 'participants', size: `${(f.size / 1048576).toFixed(1)} MB`, updated: Date.now(), owner: trainer.name, tags: ['upload'] }));
                    audit(d, trainer.name, 'content.upload', `Uploaded ${docs.map((f) => f.name).join(', ')} for approval`);
                  });
                  toast('PPTX/PDF saved for approval. Converting to slides needs the production service; export slides as images to present now.', 'info');
                }
                if (bad) toast(`${bad} file(s) skipped: use PNG, JPG, WebP, PDF or PPTX`, 'warn');
              } catch (err) { toast((err as Error).message, 'err'); } finally { setBusy(false); }
            }} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()} icon={<Upload size={15} />}>{busy ? 'Processing…' : 'Upload slides'}</Button>
              {deck.source === 'images' && <Button size="sm" variant="ghost" onClick={() => { update((d) => { const s = d.sessions.find((x) => x.id === session.id)!; d.decks[session.id] = { ...d.decks[session.id], slides: buildSample(d.decks[session.id].slides, s.title), source: 'sample' }; }); setLocalIdx(0); }}>Use sample deck</Button>}
            </div>
            <p className="mt-2 flex gap-1.5 text-[11px] text-ink-3"><Info size={13} className="shrink-0" /> Slide images (exported from PowerPoint) present immediately. PPTX/PDF files are stored for approval; production converts them to slide images server-side. Animations and embedded media are not reproduced.</p>
            {deck.uploads.length > 0 && <ul className="mt-2 space-y-1 text-xs text-ink-3">{deck.uploads.slice(-4).map((u) => <li key={u.name + u.ts} className="truncate">• {u.name}</li>)}</ul>}
          </Card>
        </div>
      </div>

      <Modal open={launch} onClose={() => setLaunch(false)} title="Launch an activity">
        <div className="space-y-2">
          {acts.map((a) => (
            <button key={a.id} onClick={() => { update((d) => launchActivity(d, a, trainer.name)); setLaunch(false); toast(`${a.title} is live`); }} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-inset ring-ink/10 hover:ring-lav-500">
              <Badge tone="lav">{a.type}</Badge><span className="flex-1 font-semibold">{a.title}</span><span className="text-xs text-ink-3">{a.questions.length ? `${a.questions.length} Q` : ''}</span>
            </button>
          ))}
          <p className="pt-2 text-xs text-ink-3">The venue screen switches to the activity; use <button className="font-semibold text-lav-600 underline" onClick={() => { setLaunch(false); go('activities'); }}>Activities</button> to control timing, reveal and results.</p>
        </div>
      </Modal>
      <Modal open={handover} onClose={() => setHandover(false)} title="Hand over control">
        <p className="mb-3 text-sm text-ink-2">Pass venue control to a co-trainer. In this demo the studio switches to their view.</p>
        <div className="space-y-2">
          {co.map((id) => { const t = db.trainers.find((x) => x.id === id)!; return (
            <button key={id} onClick={() => { update((d) => { setLive(d, { controller: id }); audit(d, trainer.name, 'venue.handover', `Handed control to ${t.name}`); }); setTrainerId(id); setHandover(false); toast(`Control handed to ${t.name}`); }} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-inset ring-ink/10 hover:ring-lav-500">
              <Avatar name={t.name} color={t.color} size={36} /><span className="font-semibold">{t.name}</span>
            </button>
          ); })}
        </div>
      </Modal>
    </div>
  );
}

function buildSample(_old: Slide[], title: string): Slide[] {
  return [
    { id: uid('sl'), layout: 'title', title, subtitle: 'Sample deck', bullets: [], notes: 'Sample speaker note.', accent: '#B50928' },
    { id: uid('sl'), layout: 'statement', title: 'Customer first, digital first', subtitle: 'Sample slide · replace with the approved deck', bullets: [], notes: '', accent: '#5B3FD9' },
    { id: uid('sl'), layout: 'activity', title: 'Your turn', subtitle: 'Join the live activity on your phone', bullets: [], notes: '', accent: '#0E9384' },
  ];
}

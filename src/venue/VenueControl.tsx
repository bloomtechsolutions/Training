import React, { useState } from 'react';
import { ExternalLink, Maximize2, X, Home, QrCode, CalendarDays, UserRound, Presentation, BarChart3, HelpCircle, Cloud, MessageSquareText, Timer, Trophy, Coffee, Award, PartyPopper, MonitorOff, WifiOff, Info } from 'lucide-react';
import { useStore, setLive, audit, useSessions } from '../lib/store';
import { Badge, Button, Card, PageHeader, cx, inputCls, Field } from '../components/ui';
import { Scaled, VenueStage } from './VenueScreen';
import type { VenueMode } from '../lib/types';

const MODES: { id: VenueMode; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'welcome', label: 'Welcome', icon: Home },
  { id: 'qr', label: 'Attendance QR', icon: QrCode },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'trainer', label: 'Trainer intro', icon: UserRound },
  { id: 'presentation', label: 'Presentation', icon: Presentation },
  { id: 'poll', label: 'Poll results', icon: BarChart3 },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  { id: 'wordcloud', label: 'Word cloud', icon: Cloud },
  { id: 'qa', label: 'Moderated Q&A', icon: MessageSquareText },
  { id: 'timer', label: 'Activity timer', icon: Timer },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'break', label: 'Break countdown', icon: Coffee },
  { id: 'awards', label: 'Awards', icon: Award },
  { id: 'closing', label: 'Closing', icon: PartyPopper },
  { id: 'blackout', label: 'Blackout', icon: MonitorOff },
  { id: 'offline', label: 'Connection lost', icon: WifiOff },
];

export default function VenueControl() {
  const { db, update, toast, role } = useStore();
  const sessions = useSessions().filter((s) => s.kind !== 'break');
  const [full, setFull] = useState(false);
  const [mins, setMins] = useState(5);
  const [label, setLabel] = useState('Team activity');
  const live = db.live;
  const actor = role === 'trainer' ? 'Trainer (demo)' : 'Event Organiser (demo)';
  const setMode = (m: VenueMode) => {
    const act = db.activities.find((a) => a.id === live.activityId);
    if ((m === 'quiz' || m === 'poll') && (!act || !act.questions.length)) { toast('Launch a quiz or poll from Trainer Studio → Activities first', 'warn'); }
    update((d) => { setLive(d, { venueMode: m }); audit(d, actor, 'venue.mode', `Venue screen → ${m}`); });
  };

  const openWindow = () => {
    let w: Window | null = null;
    try { w = window.open(`${window.location.pathname}${window.location.search}#venue`, 'bml-venue', 'noopener=no'); } catch { w = null; }
    if (!w) { toast('This viewer blocked the new window. Use “Full-screen preview”, or open this app in its own browser tab and add #venue to the address.', 'warn'); setFull(true); }
  };

  return (
    <div>
      <PageHeader eyebrow="Venue Live Screen" title="Screen control" subtitle="Choose what the projector shows. No private data, speaker notes or individual results ever appear on the public screen."
        actions={<><Button variant="secondary" icon={<Maximize2 size={16} />} onClick={() => setFull(true)}>Full-screen preview</Button><Button icon={<ExternalLink size={16} />} onClick={openWindow}>Open screen in new window</Button></>} />
      <Card className="mb-4 flex items-start gap-3 bg-amber-50/60 p-4 ring-amber-100"><Info className="mt-0.5 shrink-0 text-amber-600" size={18} /><p className="text-sm text-ink-2"><b>Local demo synchronisation.</b> The screen window follows these controls through BroadcastChannel, which only links tabs in the same browser on the same device. Production uses an authenticated real-time service so a trainer’s phone can drive the projector.</p></Card>
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl bg-black shadow-pop ring-1 ring-ink/10"><Scaled><VenueStage /></Scaled></div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-3"><Badge tone="red">{live.venueMode}</Badge>Live state rev {live.rev} · session {db.sessions.find((s) => s.id === live.sessionId)?.code ?? '—'} · slide {live.slideIndex + 1}{live.activityId ? ` · activity ${live.phase}` : ''}</div>
        </div>
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-3">Mode</div>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={live.venueMode === m.id} className={cx('flex h-12 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold transition', live.venueMode === m.id ? 'bg-bml text-white shadow-md shadow-bml/25' : 'bg-canvas text-ink-2 hover:bg-lav-50')}>
                  <m.icon size={17} /><span className="truncate">{m.label}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="space-y-3 p-4">
            <Field label="Session shown (QR, trainer intro, slides)" htmlFor="vc-session">
              <select id="vc-session" className={inputCls} value={live.sessionId ?? ''} onChange={(e) => update((d) => setLive(d, { sessionId: e.target.value || null, slideIndex: 0 }))}>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.code ? `${s.code} · ` : 'Day ' + s.day + ' · '}{s.title}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <Field label="Timer label" htmlFor="vc-label"><input id="vc-label" className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
              <Field label="Minutes" htmlFor="vc-min"><input id="vc-min" type="number" min={1} max={120} className={inputCls} value={mins} onChange={(e) => setMins(Math.max(1, Math.min(120, Number(e.target.value) || 1)))} /></Field>
            </div>
            <Button className="w-full" variant="soft" icon={<Timer size={16} />} onClick={() => { update((d) => setLive(d, { venueMode: 'timer', timerLabel: label, deadline: Date.now() + mins * 60000, activityId: null, phase: 'idle' })); toast(`${mins}-minute timer started`); }}>Start timer on screen</Button>
          </Card>
        </div>
      </div>
      {full && (
        <div className="fixed inset-0 z-[70] bg-black">
          <Scaled className="h-full"><VenueStage /></Scaled>
          <button onClick={() => setFull(false)} aria-label="Close full-screen preview" className="absolute right-4 top-4 flex h-11 items-center gap-2 rounded-xl bg-white/15 px-3 text-sm font-bold text-white backdrop-blur hover:bg-white/25" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}><X size={18} /> Close</button>
        </div>
      )}
    </div>
  );
}

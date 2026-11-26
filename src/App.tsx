import React, { Component, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Home, CalendarDays, Radio, Users, UserCircle, LayoutDashboard, Presentation, Layers, MessageSquareText, BarChart3,
  Settings2, Clock, RotateCcw, Info, WifiOff, HardDriveDownload, CalendarPlus, MapPinned, UserCog, FolderOpen, QrCode,
  Megaphone, Star, Lightbulb, Target, Award, FileBarChart, ShieldCheck, Monitor, BookOpen, Library, NotebookPen, Rocket,
  ListChecks, Trophy, X, ChevronDown, Menu, Sparkles, Images, HelpCircle, LogOut, KeyRound,
} from 'lucide-react';
import { StoreProvider, useStore, demoNow, api } from './lib/store';
import { Landing, VenueLogin, SetupScreen, Splash } from './auth/Login';
import AccountsAdmin from './admin/Accounts';
import PublicAgenda from './public/PublicAgenda';
import { NavContext } from './lib/nav';
import type { Role } from './lib/types';
import { Button, cx, Modal, Skeleton, ErrorState, EmptyState } from './components/ui';
import { useNav } from './lib/nav';
import { Confetti } from './components/shared';
import { formatDateTime } from './lib/time';

import ParticipantHome from './participant/Home';
import Agenda from './participant/Agenda';
import SessionDetail from './participant/SessionDetail';
import LiveHub from './participant/Live';
import { TrainerDirectory, TrainerProfile } from './participant/Trainers';
import Profile from './participant/Profile';
import Notebook from './participant/Notebook';
import LibraryView from './participant/Library';
import Attendance from './participant/Attendance';
import FeedbackView from './participant/Feedback';
import Beyond from './participant/Beyond';
import { AskLeadership, Gallery } from './participant/Community';

import TrainerStudio from './trainer/Studio';
import SessionBuilder from './trainer/Builder';
import Presenter from './trainer/Presenter';
import ActivityStudio from './trainer/Activities';
import TrainerQA from './trainer/QA';

import AdminOverview from './admin/Overview';
import EventsAdmin from './admin/Events';
import AgendaBuilder from './admin/AgendaBuilder';
import RegionsAdmin from './admin/Regions';
import ParticipantsAdmin from './admin/Participants';
import TrainersAdmin from './admin/TrainersAdmin';
import ContentAdmin from './admin/Content';
import AttendanceAdmin from './admin/AttendanceAdmin';
import TeamsAdmin from './admin/Teams';
import AnnouncementsAdmin from './admin/Announcements';
import FeedbackAdmin from './admin/FeedbackAdmin';
import InnovationAdmin from './admin/Innovation';
import CommitmentsAdmin from './admin/Commitments';
import CertificatesAdmin from './admin/Certificates';
import ReportsAdmin from './admin/Reports';
import AccessAdmin from './admin/Access';

import VenueScreen from './venue/VenueScreen';
import VenueControl from './venue/VenueControl';

type NavItem = { id: string; label: string; icon: React.ComponentType<any>; el: React.ComponentType; mobile?: boolean; group?: string };

const NAV: Record<Exclude<Role, 'venue'>, NavItem[]> = {
  participant: [
    { id: 'home', label: 'Home', icon: Home, el: ParticipantHome, mobile: true },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays, el: Agenda, mobile: true },
    { id: 'live', label: 'Live', icon: Radio, el: LiveHub, mobile: true },
    { id: 'trainers', label: 'Trainers', icon: Users, el: TrainerDirectory, mobile: true },
    { id: 'profile', label: 'Profile', icon: UserCircle, el: Profile, mobile: true },
    { id: 'attendance', label: 'Attendance', icon: QrCode, el: Attendance, group: 'Quick access' },
    { id: 'notebook', label: 'Notebook', icon: NotebookPen, el: Notebook, group: 'Quick access' },
    { id: 'library', label: 'Resources', icon: Library, el: LibraryView, group: 'Quick access' },
    { id: 'feedback', label: 'Feedback', icon: Star, el: FeedbackView, group: 'Quick access' },
    { id: 'leadership', label: 'Ask Leadership', icon: HelpCircle, el: AskLeadership, group: 'Community' },
    { id: 'gallery', label: 'Event gallery', icon: Images, el: Gallery, group: 'Community' },
    { id: 'beyond', label: 'Beyond Refresher', icon: Rocket, el: Beyond, group: 'Community' },
  ],
  trainer: [
    { id: 'studio', label: 'Studio', icon: LayoutDashboard, el: TrainerStudio, mobile: true },
    { id: 'builder', label: 'Session builder', icon: Layers, el: SessionBuilder, mobile: true },
    { id: 'present', label: 'Present', icon: Presentation, el: Presenter, mobile: true },
    { id: 'activities', label: 'Activities', icon: Sparkles, el: ActivityStudio, mobile: true },
    { id: 'qa', label: 'Q&A', icon: MessageSquareText, el: TrainerQA, mobile: true },
    { id: 'venue', label: 'Venue screen', icon: Monitor, el: VenueControl, group: 'Display' },
  ],
  admin: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, el: AdminOverview, mobile: true },
    { id: 'events', label: 'Events', icon: CalendarPlus, el: EventsAdmin, group: 'Prepare' },
    { id: 'agenda', label: 'Agenda builder', icon: CalendarDays, el: AgendaBuilder, mobile: true, group: 'Prepare' },
    { id: 'regions', label: 'Regions & centres', icon: MapPinned, el: RegionsAdmin, group: 'Prepare' },
    { id: 'participants', label: 'Participants', icon: Users, el: ParticipantsAdmin, mobile: true, group: 'Prepare' },
    { id: 'trainers', label: 'Trainers', icon: UserCog, el: TrainersAdmin, group: 'Prepare' },
    { id: 'content', label: 'Content library', icon: FolderOpen, el: ContentAdmin, group: 'Prepare' },
    { id: 'attendance', label: 'Attendance', icon: QrCode, el: AttendanceAdmin, mobile: true, group: 'Run' },
    { id: 'teams', label: 'Teams & activities', icon: Trophy, el: TeamsAdmin, group: 'Run' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, el: AnnouncementsAdmin, group: 'Run' },
    { id: 'venue', label: 'Venue screen', icon: Monitor, el: VenueControl, group: 'Run' },
    { id: 'feedback', label: 'Feedback', icon: Star, el: FeedbackAdmin, group: 'Measure' },
    { id: 'innovation', label: 'Innovation', icon: Lightbulb, el: InnovationAdmin, group: 'Measure' },
    { id: 'commitments', label: 'Commitments', icon: Target, el: CommitmentsAdmin, group: 'Measure' },
    { id: 'certificates', label: 'Certificates', icon: Award, el: CertificatesAdmin, group: 'Measure' },
    { id: 'reports', label: 'Reports', icon: FileBarChart, el: ReportsAdmin, mobile: true, group: 'Measure' },
    { id: 'accounts', label: 'Sign-in & codes', icon: KeyRound, el: AccountsAdmin, group: 'Govern' },
    { id: 'access', label: 'Access & audit', icon: ShieldCheck, el: AccessAdmin, group: 'Govern' },
  ],
  leadership: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, el: AdminOverview, mobile: true },
    { id: 'reports', label: 'Reports', icon: FileBarChart, el: ReportsAdmin, mobile: true },
    { id: 'feedback', label: 'Feedback', icon: Star, el: FeedbackAdmin, mobile: true },
    { id: 'innovation', label: 'Innovation', icon: Lightbulb, el: InnovationAdmin, mobile: true },
    { id: 'commitments', label: 'Commitments', icon: Target, el: CommitmentsAdmin, mobile: true },
  ],
};

// Views that are reachable but not in the nav.
const HIDDEN: Record<string, Record<string, React.ComponentType>> = {
  participant: { session: SessionDetail, trainer: TrainerProfile },
};

const ROLES: { id: Role; label: string; short: string }[] = [
  { id: 'participant', label: 'Participant Hub', short: 'Participant' },
  { id: 'trainer', label: 'Trainer Studio', short: 'Trainer' },
  { id: 'admin', label: 'Refresher 360 (Admin)', short: 'Admin' },
  { id: 'leadership', label: 'Leadership (read-only)', short: 'Leadership' },
  { id: 'venue', label: 'Venue Live Screen', short: 'Venue' },
];

const CLOCKS: { label: string; iso: string | null }[] = [
  { label: 'Real time', iso: null },
  { label: 'Before event · Thu 26 Nov 10:00', iso: '2026-11-26T10:00:00+05:00' },
  { label: 'Day 1 · 14:20 (Session 02 live)', iso: '2026-11-27T14:20:00+05:00' },
  { label: 'Day 1 · 15:05 (Break / Prayer)', iso: '2026-11-27T15:05:00+05:00' },
  { label: 'Day 2 · 09:12 (Rapid Questions live)', iso: '2026-11-28T09:12:00+05:00' },
  { label: 'Day 2 · 10:40 (Communication live)', iso: '2026-11-28T10:40:00+05:00' },
  { label: 'Day 2 · 15:35 (Innovation live)', iso: '2026-11-28T15:35:00+05:00' },
  { label: 'After event · Mon 30 Nov 10:00', iso: '2026-11-30T10:00:00+05:00' },
];

const DEFAULT_VIEW: Record<Role, string> = { participant: 'home', trainer: 'studio', admin: 'overview', leadership: 'overview', venue: 'venue' };

class Boundary extends Component<{ children: React.ReactNode; onReset: () => void }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) return <div className="p-6"><ErrorState body={`${this.state.err.message}. Your saved data is safe.`} action={<Button onClick={() => { this.setState({ err: null }); this.props.onReset(); }}>Go back home</Button>} /></div>;
    return this.props.children;
  }
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl mesh text-white shadow-md shadow-bml/30">
        <span className="font-display text-[15px] font-extrabold tracking-tight">R</span>
      </div>
      {!compact && (
        <div className="hidden leading-none min-[440px]:block">
          <div className="font-display text-[15px] font-extrabold tracking-tight text-ink">BML Refresher</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-ink-3">Learn. Connect. Transform.</div>
        </div>
      )}
    </div>
  );
}

function ClockMenu() {
  const { db, update, demoMode, actor } = useStore();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(demoNow(db));
  useEffect(() => { const i = setInterval(() => setNow(demoNow(db)), 1000); return () => clearInterval(i); }, [db]);
  if (!(demoMode && actor?.role === 'admin')) {
    return (
      <div className="flex h-10 items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100" title="Maldives time">
        <Clock size={15} /><span className="hidden tabular-nums sm:inline">{db.demoClock ? 'Demo clock · ' : ''}{formatDateTime(now)}</span><span className="tabular-nums sm:hidden">{formatDateTime(now).split('·')[1]}</span>
      </div>
    );
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex h-10 items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100 hover:bg-amber-100">
        <Clock size={15} />
        <span className="hidden tabular-nums sm:inline">{db.demoClock ? 'Demo clock · ' : ''}{formatDateTime(now)}</span>
        <span className="tabular-nums sm:hidden">{formatDateTime(now).split('·')[1]}</span>
        <ChevronDown size={14} className="hidden sm:block" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className="anim-sheet absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-ink/10">
            <div className="px-3 pb-2 pt-1 text-xs text-ink-3">Demo mode: set the event clock for everyone (Maldives time). It keeps running from the chosen point. Choose Real time for a live event.</div>
            {CLOCKS.map((c) => (
              <button key={c.label} role="menuitemradio" aria-checked={db.demoClock === c.iso} onClick={() => { update((d) => { d.demoClock = c.iso; d.demoClockSetAt = Date.now(); }); setOpen(false); }} className={cx('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-canvas', db.demoClock === c.iso && 'bg-lav-50 font-semibold text-lav-700')}>
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="About BML Refresher" wide footer={<Button onClick={onClose}>Got it</Button>}>
      <div className="space-y-4 text-sm text-ink-2">
        <p><b>BML Refresher</b> stores everything in a shared database, so participants’ phones, trainers’ devices, the venue screen and organisers stay in sync within a couple of seconds.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-teal-50 p-4"><div className="mb-1 font-bold text-teal-700">Working</div><ul className="list-disc space-y-1 pl-4">
            <li>Personal sign-in with access codes; permissions checked on the server</li><li>Shared live sessions, quizzes, polls, word clouds and Q&amp;A across devices</li><li>QR check-in with rotating server-signed codes (scan with the phone camera)</li><li>Server-side scoring with duplicate protection</li><li>Agenda drafts and publishing, events, CSV import, reports, audit log</li></ul></div>
          <div className="rounded-2xl bg-amber-50 p-4"><div className="mb-1 font-bold text-amber-700">Not yet / limits</div><ul className="list-disc space-y-1 pl-4">
            <li>Corporate (Microsoft Entra ID) sign-in: future</li><li>PPTX/PDF conversion: upload slide images instead</li><li>Email/Teams notifications, AI companion: future</li><li>Updates arrive by polling every ~2 s, not push</li><li>Demo mode, when on, adds one-tap demo sign-in and fictional data</li></ul></div>
        </div>
        <p className="text-xs text-ink-3">See README and docs/ in the repository for setup and architecture.</p>
      </div>
    </Modal>
  );
}

function Shell() {
  const { db, role, setRole, toasts, dismissToast, confetti, online, reset, toast, actor, demoMode, applyRemote, allowedRoles } = useStore();
  const initial = useMemo(() => {
    const h = window.location.hash.replace('#', '');
    const [r, v] = h.split('-');
    if (r && (['participant', 'trainer', 'admin', 'leadership'] as string[]).includes(r)) return { role: r as Role, view: v || DEFAULT_VIEW[r as Role] };
    return null;
  }, []);
  const [nav, setNav] = useState<{ view: string; param?: string }[]>([{ view: initial?.view ?? DEFAULT_VIEW[role] }]);
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetText, setResetText] = useState('');
  const [about, setAbout] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { if (initial && initial.role !== role) setRole(initial.role); }, []); // eslint-disable-line
  useEffect(() => {
    const onHash = () => {
      const [r, v] = window.location.hash.replace('#', '').split('-');
      if (!(['participant', 'trainer', 'admin', 'leadership'] as string[]).includes(r)) return;
      setRole(r as Role);
      setNav([{ view: v || DEFAULT_VIEW[r as Role] }]);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [setRole]);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 250); return () => clearTimeout(t); }, []);
  // Check-in links from the venue QR code: /?checkin=<payload>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payload = params.get('checkin');
    if (!payload) return;
    try { history.replaceState(null, '', window.location.pathname + window.location.hash); } catch { /* ignore */ }
    if (actor?.role !== 'participant') { toast('Sign in as a participant to check in with this code.', 'warn'); return; }
    setRole('participant');
    setNav([{ view: 'attendance' }]);
    api<{ record: any; late: boolean; title: string }>('checkin', { payload })
      .then((r) => { applyRemote([{ c: 'attendance', k: r.record.id, v: r.record }]); toast(r.late ? `Checked in to ${r.title} · marked late` : `Checked in to ${r.title}. Welcome!`); })
      .catch((e) => toast((e as Error).message, 'err'));
  }, []); // eslint-disable-line

  const cur = nav[nav.length - 1];
  const go = useCallback((view: string, param?: string) => {
    setNav((n) => [...n.slice(-15), { view, param }]);
    setDrawer(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const back = useCallback(() => setNav((n) => (n.length > 1 ? n.slice(0, -1) : n)), []);

  useEffect(() => {
    const h = `#${role}-${cur.view}`;
    if (role !== 'venue' && window.location.hash !== h) { try { history.replaceState(null, '', h); } catch { /* sandboxed */ } }
  }, [role, cur.view]);

  const switchRole = (r: Role) => { if (!allowedRoles.includes(r)) return; setRole(r); setNav([{ view: DEFAULT_VIEW[r] }]); setDrawer(false); };

  if (role === 'venue') {
    return (
      <NavContext.Provider value={{ ...cur, go, back }}>
        <TopBar role={role} switchRole={switchRole} onReset={() => setConfirmReset(true)} onAbout={() => setAbout(true)} onMenu={() => setDrawer(true)} />
        <main className="mx-auto max-w-[1400px] px-4 pb-10 pt-4 sm:px-6"><VenueControl /></main>
        {Overlays()}
      </NavContext.Provider>
    );
  }

  const items = NAV[role];
  const item = items.find((i) => i.id === cur.view);
  const noEvent = db.events.length === 0;
  const NO_EVENT_OK = ['events', 'regions', 'trainers', 'accounts', 'access'];
  const View = noEvent && !(role === 'admin' && NO_EVENT_OK.includes(cur.view)) ? NoEventView : item?.el ?? HIDDEN[role]?.[cur.view] ?? items[0].el;
  const groups = Array.from(new Set(items.map((i) => i.group ?? '')));
  const mobileItems = items.filter((i) => i.mobile);

  function Overlays() {
    return (
      <>
        <Confetti trigger={confetti} />
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6">
          {toasts.map((t) => (
            <div key={t.id} className={cx('anim-sheet pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl', t.tone === 'err' ? 'bg-bml text-white' : t.tone === 'warn' ? 'bg-amber-500 text-white' : 'bg-ink text-white')}>
              <span className="min-w-0 flex-1">{t.text}</span>
              <button aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="rounded-lg p-1 hover:bg-white/10"><X size={16} /></button>
            </div>
          ))}
        </div>
        <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?" wide footer={<Button variant="secondary" onClick={() => { setConfirmReset(false); setResetText(''); }}>Cancel</Button>}>
          <div className="space-y-4 text-sm text-ink-2">
            <p>This permanently deletes data for <b>everyone</b>: participants, access codes, check-ins, answers, points, feedback, notes, photos and the audit log. Your <b>admin</b> sign-in is kept. This cannot be undone.</p>
            <label htmlFor="reset-confirm" className="block text-xs font-semibold text-ink-2">Type RESET to enable the buttons</label>
            <input id="reset-confirm" className="w-full rounded-xl bg-canvas px-3.5 py-2.5 font-mono text-sm ring-1 ring-inset ring-ink/10" value={resetText} onChange={(e) => setResetText(e.target.value)} autoComplete="off" />
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ['empty', 'Completely empty', 'Only your admin sign-in, the six regions and the five team names. Build events, agenda and trainers from scratch.'],
                ['event', 'Event without people', 'Keeps the 27–28 Nov event, agenda, trainers and content. No participants or results.'],
                ['demo', 'Event with demo data', 'Restores the event plus fictional participants and results for demonstrations.'],
              ] as const).map(([mode, label, desc]) => (
                <button key={mode} disabled={resetText !== 'RESET'} onClick={() => {
                  setConfirmReset(false); setResetText(''); setNav([{ view: mode === 'empty' ? 'events' : DEFAULT_VIEW[role] }]);
                  reset(mode).then(() => toast(mode === 'empty' ? 'Database emptied. Create your first event.' : 'Data reset')).catch((e) => toast(e.message, 'err'));
                }} className="rounded-2xl p-4 text-left ring-1 ring-inset ring-ink/10 transition enabled:hover:ring-bml disabled:opacity-40">
                  <div className="font-bold text-ink">{label}</div><div className="mt-1 text-xs text-ink-3">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
        <AboutModal open={about} onClose={() => setAbout(false)} />
      </>
    );
  }

  return (
    <NavContext.Provider value={{ ...cur, go, back }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-xl">Skip to content</a>
      <TopBar role={role} switchRole={switchRole} onReset={() => setConfirmReset(true)} onAbout={() => setAbout(true)} onMenu={() => setDrawer(true)} />
      {!online && <div role="status" className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-xs font-semibold text-white"><WifiOff size={14} /> Connection lost. Reconnecting… Changes you make now may not be saved.</div>}
      {demoMode && <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-[11px] font-semibold text-amber-800"><HardDriveDownload size={13} /> Demo mode is on: one-tap demo sign-in and fictional data. Turn DEMO_MODE off before a real event.</div>}
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-[64px] hidden h-[calc(100vh-64px)] w-64 shrink-0 overflow-y-auto border-r border-ink/5 px-3 py-5 lg:block" aria-label="Section navigation">
          <SideNav items={items} groups={groups} current={cur.view} go={(v) => setNav([{ view: v }])} role={role} />
        </aside>
        <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-7">
          <Boundary onReset={() => setNav([{ view: DEFAULT_VIEW[role] }])}>
            {loading ? <LoadingView /> : <div key={`${role}-${cur.view}-${cur.param ?? ''}`} className="anim-in"><View /></div>}
          </Boundary>
        </main>
      </div>
      {/* Mobile bottom navigation */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/5 bg-white/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto flex max-w-xl items-stretch justify-around px-1">
          {mobileItems.slice(0, 5).map((i) => {
            const active = cur.view === i.id;
            const Icon = i.icon;
            return (
              <button key={i.id} onClick={() => setNav([{ view: i.id }])} aria-current={active ? 'page' : undefined} className={cx('flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition', active ? 'text-bml' : 'text-ink-3')}>
                <span className={cx('flex h-8 w-12 items-center justify-center rounded-full transition', active && 'bg-bml-50')}>
                  {i.id === 'live' ? <span className="relative"><Icon size={21} /><span className="live-dot absolute -right-1 -top-1 h-2 w-2 rounded-full bg-bml" /></span> : <Icon size={21} />}
                </span>
                {i.label}
              </button>
            );
          })}
        </div>
      </nav>
      {/* Mobile drawer with the full menu */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
          <div className="anim-sheet absolute inset-y-0 left-0 w-[86%] max-w-xs overflow-y-auto bg-white px-3 py-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between px-2"><Logo /><button aria-label="Close menu" onClick={() => setDrawer(false)} className="rounded-xl p-2 hover:bg-ink/5"><X size={20} /></button></div>
            <RoleSelect role={role} switchRole={switchRole} full />
            <div className="mt-4"><SideNav items={items} groups={groups} current={cur.view} go={(v) => { setNav([{ view: v }]); setDrawer(false); }} role={role} /></div>
          </div>
        </div>
      )}
      {Overlays()}
    </NavContext.Provider>
  );
}

function NoEventView() {
  const { role } = useStore();
  const { go } = useNav();
  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState icon={<CalendarPlus />} title="No event set up yet" body={role === 'admin' ? 'Start by creating an event. Then add trainers, build the agenda, import participants and publish.' : 'The organisers haven’t published an event yet. Check back soon.'}
        action={role === 'admin' ? <div className="flex flex-wrap justify-center gap-2"><Button onClick={() => go('events')} icon={<CalendarPlus size={16} />}>Create an event</Button><Button variant="secondary" onClick={() => go('trainers')}>Add trainers</Button></div> : undefined} />
    </div>
  );
}

function LoadingView() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
    </div>
  );
}

function SideNav({ items, groups, current, go, role }: { items: NavItem[]; groups: string[]; current: string; go: (v: string) => void; role: Role }) {
  return (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g || 'main'}>
          {g && <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-ink-4">{g}</div>}
          <ul className="space-y-0.5">
            {items.filter((i) => (i.group ?? '') === g).map((i) => {
              const Icon = i.icon;
              const active = current === i.id || (role === 'participant' && current === 'session' && i.id === 'agenda') || (current === 'trainer' && i.id === 'trainers');
              return (
                <li key={i.id}>
                  <button onClick={() => go(i.id)} aria-current={active ? 'page' : undefined} className={cx('flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition', active ? 'bg-bml text-white shadow-md shadow-bml/25' : 'text-ink-2 hover:bg-white hover:shadow-sm')}>
                    <Icon size={18} />{i.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {role === 'leadership' && <div className="rounded-xl bg-lav-50 p-3 text-xs text-lav-700">Read-only aggregated reporting. Editing controls are hidden for this role.</div>}
    </nav>
  );
}

function RoleSelect({ role, switchRole, full }: { role: Role; switchRole: (r: Role) => void; full?: boolean }) {
  const { allowedRoles } = useStore();
  if (allowedRoles.length < 2) return null;
  return (
    <div className={cx('flex items-center gap-1 rounded-2xl bg-ink/[.05] p-1', full ? 'flex-wrap' : 'hidden md:flex')} role="radiogroup" aria-label="View">
      {ROLES.filter((r) => allowedRoles.includes(r.id)).map((r) => (
        <button key={r.id} role="radio" aria-checked={role === r.id} onClick={() => switchRole(r.id)} className={cx('h-9 rounded-xl px-3 text-xs font-bold transition', role === r.id ? 'bg-white text-bml shadow-sm' : 'text-ink-3 hover:text-ink')}>
          {r.short}
        </button>
      ))}
    </div>
  );
}

function TopBar({ role, switchRole, onReset, onAbout, onMenu }: { role: Role; switchRole: (r: Role) => void; onReset: () => void; onAbout: () => void; onMenu: () => void }) {
  const [more, setMore] = useState(false);
  const { actor, allowedRoles, signOut, syncing } = useStore();
  return (
    <header className="sticky top-0 z-30 border-b border-ink/5 bg-white/90 backdrop-blur no-print">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        {role !== 'venue' && <button aria-label="Open menu" onClick={onMenu} className="rounded-xl p-2 text-ink-2 hover:bg-ink/5 lg:hidden"><Menu size={22} /></button>}
        <Logo compact={false} />
        {syncing && <span className="hidden text-[11px] font-semibold text-ink-3 sm:inline" aria-live="polite">Saving…</span>}
        <div className="flex-1" />
        <RoleSelect role={role} switchRole={switchRole} />
        {allowedRoles.length > 1 && <div className="md:hidden">
          <label className="sr-only" htmlFor="role-mobile">View</label>
          <select id="role-mobile" value={role} onChange={(e) => switchRole(e.target.value as Role)} className="h-10 rounded-xl border-0 bg-bml-50 px-2 text-xs font-bold text-bml ring-1 ring-inset ring-bml-100">
            {ROLES.filter((r) => allowedRoles.includes(r.id)).map((r) => <option key={r.id} value={r.id}>{r.short}</option>)}
          </select>
        </div>}
        <ClockMenu />
        <div className="relative">
          <button aria-label="Account and settings" aria-expanded={more} onClick={() => setMore((m) => !m)} className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-ink/5"><Settings2 size={19} /></button>
          {more && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMore(false)} />
              <div role="menu" className="anim-sheet absolute right-0 z-50 mt-2 w-60 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-ink/10">
                <div className="px-3 pb-2 pt-1"><div className="truncate text-sm font-bold text-ink">{actor?.name}</div><div className="text-xs capitalize text-ink-3">{actor?.role}</div></div>
                <button role="menuitem" onClick={() => { setMore(false); onAbout(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-canvas"><Info size={16} /> About this app</button>
                {actor?.role === 'admin' && <button role="menuitem" onClick={() => { setMore(false); onReset(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-bml hover:bg-bml-50"><RotateCcw size={16} /> Reset all data</button>}
                <button role="menuitem" onClick={() => { setMore(false); signOut(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-canvas"><LogOut size={16} /> Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Gate({ standalone, publicAgenda }: { standalone: boolean; publicAgenda: boolean }) {
  const { status, statusMessage, actor } = useStore();
  if (publicAgenda) return <PublicAgenda />;
  if (status === 'loading') return <Splash />;
  if (status === 'nodb') return <SetupScreen message={statusMessage} />;
  if (status === 'error') return <SetupScreen message={statusMessage} error />;
  if (status === 'signedOut' || !actor) return standalone ? <VenueLogin /> : <Landing />;
  if (standalone || actor.role === 'venue') return <VenueScreen standalone />;
  return <Shell />;
}

export default function App() {
  const [standalone, setStandalone] = useState(() => window.location.hash === '#venue');
  const [publicAgenda, setPublicAgenda] = useState(() => window.location.hash === '#agenda');
  useEffect(() => {
    const on = () => { setStandalone(window.location.hash === '#venue'); setPublicAgenda(window.location.hash === '#agenda'); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return <StoreProvider><Gate standalone={standalone} publicAgenda={publicAgenda} /></StoreProvider>;
}


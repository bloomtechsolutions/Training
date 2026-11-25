import React, { Component, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Home, CalendarDays, Radio, Users, UserCircle, LayoutDashboard, Presentation, Layers, MessageSquareText, BarChart3,
  Settings2, Clock, RotateCcw, Info, WifiOff, HardDriveDownload, CalendarPlus, MapPinned, UserCog, FolderOpen, QrCode,
  Megaphone, Star, Lightbulb, Target, Award, FileBarChart, ShieldCheck, Monitor, BookOpen, Library, NotebookPen, Rocket,
  ListChecks, Trophy, X, ChevronDown, Menu, Sparkles, Images, HelpCircle,
} from 'lucide-react';
import { StoreProvider, useStore, demoNow } from './lib/store';
import { NavContext } from './lib/nav';
import type { Role } from './lib/types';
import { Button, cx, Modal, Skeleton, ErrorState } from './components/ui';
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
    if (this.state.err) return <div className="p-6"><ErrorState body={`${this.state.err.message}. Your data is safe in this browser.`} action={<Button onClick={() => { this.setState({ err: null }); this.props.onReset(); }}>Go back home</Button>} /></div>;
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
  const { db, update } = useStore();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(demoNow(db));
  useEffect(() => { const i = setInterval(() => setNow(demoNow(db)), 1000); return () => clearInterval(i); }, [db]);
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
            <div className="px-3 pb-2 pt-1 text-xs text-ink-3">Simulate a moment in the event (Maldives time). The clock keeps running from the chosen point.</div>
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
    <Modal open={open} onClose={onClose} title="About this prototype" wide footer={<Button onClick={onClose}>Got it</Button>}>
      <div className="space-y-4 text-sm text-ink-2">
        <p>This is an interactive prototype of <b>BML Refresher</b>. It runs entirely in your browser with demonstration data. The role switcher is a demo, not authentication.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-teal-50 p-4"><div className="mb-1 font-bold text-teal-700">Working in this prototype</div><ul className="list-disc space-y-1 pl-4">
            <li>All navigation, forms, notes, quizzes, polls, word cloud, feedback</li><li>Agenda editing, validation and publishing</li><li>Event create / duplicate / archive</li><li>CSV participant import with validation</li><li>Teams, scoring with duplicate protection, leaderboards</li><li>Presenter mode with a sample deck or uploaded slide images</li><li>Saved in this browser (localStorage) where allowed</li></ul></div>
          <div className="rounded-2xl bg-amber-50 p-4"><div className="mb-1 font-bold text-amber-700">Simulated or future</div><ul className="list-disc space-y-1 pl-4">
            <li>Venue sync: same-browser tabs only (BroadcastChannel), not cross-device real-time</li><li>QR check-in: demo scan; no camera, no server validation</li><li>Sample audience responses are generated</li><li>PPTX/PDF conversion, email/Teams, SSO, AI companion: future</li><li>Exports: CSV and browser print only</li><li>All participant names, figures and feedback are fictional</li></ul></div>
        </div>
        <p className="text-xs text-ink-3">Production architecture, data model and integration checklist: see <code>docs/</code> in the repository.</p>
      </div>
    </Modal>
  );
}

function Shell() {
  const { role, setRole, toasts, dismissToast, confetti, online, persisted, reset, toast } = useStore();
  const initial = useMemo(() => {
    const h = window.location.hash.replace('#', '');
    const [r, v] = h.split('-');
    if (r && (['participant', 'trainer', 'admin', 'leadership'] as string[]).includes(r)) return { role: r as Role, view: v || DEFAULT_VIEW[r as Role] };
    return null;
  }, []);
  const [nav, setNav] = useState<{ view: string; param?: string }[]>([{ view: initial?.view ?? DEFAULT_VIEW[role] }]);
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
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
  useEffect(() => { const t = setTimeout(() => setLoading(false), 450); return () => clearTimeout(t); }, []);

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

  const switchRole = (r: Role) => { setRole(r); setNav([{ view: DEFAULT_VIEW[r] }]); setDrawer(false); };

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
  const View = item?.el ?? HIDDEN[role]?.[cur.view] ?? items[0].el;
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
        <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo data?" footer={<><Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button><Button onClick={() => { reset(); setConfirmReset(false); setNav([{ view: DEFAULT_VIEW[role] }]); toast('Demo data restored'); }} icon={<RotateCcw size={16} />}>Reset everything</Button></>}>
          <p className="text-sm text-ink-2">This restores the seeded 27–28 November event and clears notes, responses, check-ins, feedback and any changes you made in this browser. Other open tabs will follow.</p>
        </Modal>
        <AboutModal open={about} onClose={() => setAbout(false)} />
      </>
    );
  }

  return (
    <NavContext.Provider value={{ ...cur, go, back }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-xl">Skip to content</a>
      <TopBar role={role} switchRole={switchRole} onReset={() => setConfirmReset(true)} onAbout={() => setAbout(true)} onMenu={() => setDrawer(true)} />
      {!online && <div role="status" className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-xs font-semibold text-white"><WifiOff size={14} /> You are offline. Changes are kept on this device and shown here; production would queue them and sync when the connection returns.</div>}
      {!persisted && <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-800"><HardDriveDownload size={14} /> This browser is not allowing local storage, so changes last only until you close this page.</div>}
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
  return (
    <div className={cx('flex items-center gap-1 rounded-2xl bg-ink/[.05] p-1', full ? 'flex-wrap' : 'hidden md:flex')} role="radiogroup" aria-label="Demo role">
      {ROLES.map((r) => (
        <button key={r.id} role="radio" aria-checked={role === r.id} onClick={() => switchRole(r.id)} className={cx('h-9 rounded-xl px-3 text-xs font-bold transition', role === r.id ? 'bg-white text-bml shadow-sm' : 'text-ink-3 hover:text-ink')}>
          {r.short}
        </button>
      ))}
    </div>
  );
}

function TopBar({ role, switchRole, onReset, onAbout, onMenu }: { role: Role; switchRole: (r: Role) => void; onReset: () => void; onAbout: () => void; onMenu: () => void }) {
  const [more, setMore] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-ink/5 bg-white/90 backdrop-blur no-print">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        {role !== 'venue' && <button aria-label="Open menu" onClick={onMenu} className="rounded-xl p-2 text-ink-2 hover:bg-ink/5 lg:hidden"><Menu size={22} /></button>}
        <Logo compact={false} />
        <span className="hidden rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white sm:inline">Prototype</span>
        <div className="flex-1" />
        <RoleSelect role={role} switchRole={switchRole} />
        <div className="md:hidden">
          <label className="sr-only" htmlFor="role-mobile">Demo role</label>
          <select id="role-mobile" value={role} onChange={(e) => switchRole(e.target.value as Role)} className="h-10 rounded-xl border-0 bg-bml-50 px-2 text-xs font-bold text-bml ring-1 ring-inset ring-bml-100">
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.short}</option>)}
          </select>
        </div>
        <ClockMenu />
        <div className="relative">
          <button aria-label="Demo settings" aria-expanded={more} onClick={() => setMore((m) => !m)} className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-ink/5"><Settings2 size={19} /></button>
          {more && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMore(false)} />
              <div role="menu" className="anim-sheet absolute right-0 z-50 mt-2 w-60 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-ink/10">
                <button role="menuitem" onClick={() => { setMore(false); onAbout(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-canvas"><Info size={16} /> What is simulated?</button>
                <button role="menuitem" onClick={() => { setMore(false); onReset(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-bml hover:bg-bml-50"><RotateCcw size={16} /> Reset demo data</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [standalone, setStandalone] = useState(() => window.location.hash === '#venue');
  useEffect(() => {
    const on = () => setStandalone(window.location.hash === '#venue');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  if (standalone) return <StoreProvider initialRole="venue"><VenueScreen standalone /></StoreProvider>;
  return <StoreProvider><Shell /></StoreProvider>;
}


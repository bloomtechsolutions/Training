import React from 'react';
import { Award, Lock, Bell, CalendarCheck, Target, BadgeCheck, Trophy } from 'lucide-react';
import { useStore, useEvent, userPoints } from '../lib/store';
import { useNav } from '../lib/nav';
import { Avatar, Badge, Button, Card, PageHeader, SectionTitle, Toggle, cx, DemoTag, Progress } from '../components/ui';
import { TeamChip } from '../components/shared';
import { computeBadges } from './badges';
import type { NotificationPrefs } from '../lib/types';

const DEFAULT_PREFS: NotificationPrefs = { announcements: true, schedule: true, activities: true, reminders: true, quietHours: false };

export default function Profile() {
  const { db, me, update } = useStore();
  const ev = useEvent();
  const { go } = useNav();
  const badges = computeBadges(db, me.id);
  const pts = userPoints(db, me.id);
  const prefs = db.prefs[me.id] ?? DEFAULT_PREFS;
  const setPref = (k: keyof NotificationPrefs, v: boolean) => update((d) => { d.prefs[me.id] = { ...(d.prefs[me.id] ?? DEFAULT_PREFS), [k]: v }; });
  const myResponses = db.responses.filter((r) => r.userId === me.id && r.correct !== undefined);
  const correct = myResponses.filter((r) => r.correct).length;
  const commitments = db.commitments.filter((c) => c.userId === me.id);
  const cert = db.certificates.find((c) => c.userId === me.id && c.eventId === ev.id);
  const region = db.regions.find((r) => r.id === me.regionId);
  const sc = db.serviceCentres.find((s) => s.id === me.scId);
  const history = db.events.filter((e) => me.eventIds.includes(e.id));

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" />
      <Card className="overflow-hidden">
        <div className="mesh grain relative h-24" />
        <div className="-mt-10 flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end">
          <Avatar name={me.name} color="#5B3FD9" size={84} className="ring-4 ring-white" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl font-extrabold">{me.name}</h2><DemoTag>Demo user</DemoTag></div>
            <div className="text-sm text-ink-3">{me.designation} · {sc?.name} · {region?.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">Staff ID {me.staffId} · <TeamChip team={db.teams.find((t) => t.id === me.teamId)} /></div>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl bg-amber-50 px-4 py-2 text-center"><div className="font-display text-2xl font-extrabold tabular-nums text-amber-700">{pts}</div><div className="text-[11px] font-semibold text-amber-700">points</div></div>
            <div className="rounded-2xl bg-lav-50 px-4 py-2 text-center"><div className="font-display text-2xl font-extrabold tabular-nums text-lav-700">{badges.filter((b) => b.earned).length}</div><div className="text-[11px] font-semibold text-lav-700">badges</div></div>
          </div>
        </div>
      </Card>

      <section>
        <SectionTitle title="Achievements" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {badges.map((b) => (
            <Card key={b.id} className={cx('flex flex-col items-center p-4 text-center', !b.earned && 'opacity-60')}>
              <span className={cx('mb-2 flex h-14 w-14 items-center justify-center rounded-2xl', b.earned ? 'bg-gradient-to-br from-amber-500 to-coral-500 text-white shadow-md' : 'bg-ink/5 text-ink-4')}>{b.earned ? <Award size={28} /> : <Lock size={22} />}</span>
              <div className="text-sm font-bold">{b.name}</div>
              <div className="mt-0.5 text-[11px] text-ink-3">{b.desc}</div>
              <div className="mt-1 text-[11px] font-bold tabular-nums text-ink-2">{b.progress}</div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="My learning results" eyebrow="Private" action={<Lock size={16} className="text-ink-3" />} />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-canvas p-3"><div className="font-display text-2xl font-extrabold tabular-nums">{correct}/{myResponses.length}</div><div className="text-[11px] text-ink-3">quiz answers correct</div></div>
            <div className="rounded-2xl bg-canvas p-3"><div className="font-display text-2xl font-extrabold tabular-nums">{db.scenarioProgress.filter((p) => p.userId === me.id && p.done).length}</div><div className="text-[11px] text-ink-3">scenarios done</div></div>
            <div className="rounded-2xl bg-canvas p-3"><div className="font-display text-2xl font-extrabold tabular-nums">{Object.keys(db.notes).filter((k) => k.startsWith(me.id)).length}</div><div className="text-[11px] text-ink-3">sessions with notes</div></div>
          </div>
          <p className="mt-3 text-xs text-ink-3">Only you can see your individual results. Teams see combined points only.</p>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Commitments & certificate" action={<Button size="sm" variant="ghost" onClick={() => go('beyond')}>Manage</Button>} />
          {commitments.length ? commitments.map((c) => <div key={c.id} className="mb-3"><div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{c.horizon}-day · {c.action}</span><span className="tabular-nums text-ink-3">{c.progress}%</span></div><Progress value={c.progress} color="bg-teal-500" /></div>) : <p className="text-sm text-ink-3">No commitments yet. Add your 30/60/90-day actions in Beyond Refresher.</p>}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-canvas p-3 text-sm">{cert ? <><BadgeCheck className="text-teal-600" size={18} /> Certificate issued · {cert.serial}</> : <><Award size={18} className="text-ink-3" /> Certificate not yet issued</>}</div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Event history" action={<CalendarCheck size={18} className="text-ink-3" />} />
          {history.map((e) => <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-canvas p-3 text-sm"><span className="font-semibold">{e.name}</span><Badge tone={e.status === 'published' ? 'teal' : 'ink'}>{e.status}</Badge></div>)}
        </Card>
        <Card className="p-5">
          <SectionTitle title="Notification preferences" action={<Bell size={18} className="text-ink-3" />} />
          <div className="divide-y divide-ink/5">
            <Toggle checked={prefs.announcements} onChange={(v) => setPref('announcements', v)} label="Announcements" description="Organiser updates during the event" />
            <Toggle checked={prefs.schedule} onChange={(v) => setPref('schedule', v)} label="Schedule changes" description="Agenda updates and room changes" />
            <Toggle checked={prefs.activities} onChange={(v) => setPref('activities', v)} label="Live activities" description="When a quiz or poll opens" />
            <Toggle checked={prefs.reminders} onChange={(v) => setPref('reminders', v)} label="Commitment reminders" description="30/60/90-day check-ins" />
            <Toggle checked={prefs.quietHours} onChange={(v) => setPref('quietHours', v)} label="Quiet hours" description="Mute non-urgent alerts 21:00–08:00" />
          </div>
          <p className="mt-2 text-xs text-ink-3">In-app only in this prototype. Push, email and Teams delivery are future, approved integrations.</p>
        </Card>
      </div>
      <p className="text-center text-xs text-ink-3"><Trophy size={12} className="inline" /> Points come from learning activities only, never from attendance or trainer ratings.</p>
      <span className="hidden"><Target /></span>
    </div>
  );
}

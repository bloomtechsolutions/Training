import React, { useState } from 'react';
import { Users, QrCode, Clock, Star, Sparkles, Lightbulb, Target, GraduationCap, TrendingUp, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Badge, Card, PageHeader, SectionTitle, Stat, Bars, HBar, DemoTag, cx } from '../components/ui';
import { computeMetrics, DEMO_HISTORY } from './metrics';
import { ReadOnlyNote, useReadOnly } from './common';
import { Leaderboard } from '../components/shared';
import { teamPoints } from '../lib/store';
import { formatDay } from '../lib/time';

export default function AdminOverview() {
  const { db } = useStore();
  const { go } = useNav();
  const ro = useReadOnly();
  const [eventId, setEventId] = useState(db.currentEventId);
  const [region, setRegion] = useState<string>('all');
  const m = computeMetrics(db, eventId, region);
  const ev = db.events.find((e) => e.id === eventId)!;
  const implemented = m.ideas.filter((i) => i.status === 'implemented').length;
  const commitDone = m.commitments.filter((c) => c.status === 'done').length;

  return (
    <div>
      <PageHeader eyebrow={ro ? 'Leadership' : 'Refresher 360'} title="Command centre" subtitle="Live view of participation, learning and follow-through across events and regions."
        actions={<>
          <label htmlFor="ov-ev" className="sr-only">Event</label>
          <select id="ov-ev" value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-10 max-w-[260px] rounded-xl border-0 bg-white px-3 text-sm font-semibold shadow-sm ring-1 ring-inset ring-ink/10">{db.events.filter((e) => e.status !== 'archived' || true).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <label htmlFor="ov-reg" className="sr-only">Region</label>
          <select id="ov-reg" value={region} onChange={(e) => setRegion(e.target.value)} className="h-10 rounded-xl border-0 bg-white px-3 text-sm font-semibold shadow-sm ring-1 ring-inset ring-ink/10"><option value="all">All regions</option>{db.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </>} />
      <ReadOnlyNote />
      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <Badge tone={ev.status === 'published' ? 'teal' : ev.status === 'draft' ? 'amber' : 'ink'}>{ev.status}</Badge>
        <span className="font-semibold">{ev.name}</span>
        <span className="text-sm text-ink-3">{formatDay(ev.days[0].date)} – {formatDay(ev.days[ev.days.length - 1].date)} · {ev.regionId ? db.regions.find((r) => r.id === ev.regionId)?.name : 'Region TBC'} · {ev.venue || 'Venue TBC'}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-3"><DemoTag /> Participants, check-ins and feedback in this prototype are fictional.</span>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Participants" value={m.users.length} sub={`${m.confirmed} confirmed`} icon={<Users size={16} />} tone="lav" />
        <Stat label="Attendance rate" value={`${m.attendanceRate}%`} sub={`${m.held.length} sessions held so far`} icon={<QrCode size={16} />} tone="teal" />
        <Stat label="Punctuality" value={`${m.punctuality}%`} sub="checked in on time" icon={<Clock size={16} />} tone="amber" />
        <Stat label="Session feedback" value={m.fbAvg ? m.fbAvg.toFixed(2) : '—'} sub={`${m.fb.length} trainer ratings · confidential`} icon={<Star size={16} />} tone="coral" />
        <Stat label="Activity participation" value={`${m.participation}%`} sub={`${m.responders} active participants`} icon={<Sparkles size={16} />} tone="red" />
        <Stat label="Quiz accuracy (event)" value={m.knowledge === null ? '—' : `${m.knowledge}%`} sub="live quiz answers" icon={<GraduationCap size={16} />} tone="sky" />
        <Stat label="Ideas" value={m.ideas.length} sub={`${m.ideas.filter((i) => i.status !== 'submitted').length} shortlisted+ · ${implemented} implemented`} icon={<Lightbulb size={16} />} tone="amber" />
        <Stat label="Commitments" value={m.commitments.length} sub={`${commitDone} completed`} icon={<Target size={16} />} tone="teal" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Attendance by session" eyebrow="This event" action={!ro && <button className="text-sm font-semibold text-lav-600" onClick={() => go('attendance')}>Monitor</button>} />
          <Bars data={m.bySession.map(({ s, count }) => ({ label: s.code ?? (s.day === 1 && s.start < '12:00' ? 'EA am' : 'EA pm'), value: count, color: s.kind === 'vendor' ? '#F5A524' : '#B50928' }))} max={Math.max(1, m.confirmed)} height={170} />
          <div className="mt-2 text-xs text-ink-3">Check-ins per agenda item against {m.confirmed} confirmed participants.</div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Regional participation" />
          <div className="space-y-3">{m.byRegion.map((r) => <HBar key={r.id} label={r.name} value={r.participants} max={Math.max(...m.byRegion.map((x) => x.participants), 1)} color="#7C5CFA" right={`${r.participants} · ${r.rate}%`} />)}</div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title={<span className="flex items-center gap-2">Pre / post knowledge by region <DemoTag>Demo values</DemoTag></span>} eyebrow="Across previous events" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="text-left text-xs text-ink-3"><th className="py-2 font-semibold">Region</th><th className="font-semibold">Events</th><th className="font-semibold">Participants</th><th className="font-semibold">Attendance</th><th className="w-[40%] font-semibold">Pre → post assessment</th></tr></thead>
              <tbody>{DEMO_HISTORY.map((r) => (
                <tr key={r.region} className="border-t border-ink/5">
                  <td className="py-2.5 font-semibold">{r.region}</td><td className="tabular-nums">{r.events}</td><td className="tabular-nums">{r.participants}</td><td className="tabular-nums">{r.attendance}%</td>
                  <td><div className="relative h-3 rounded-full bg-ink/5"><div className="absolute h-3 rounded-full bg-lav-200" style={{ width: `${r.post}%` }} /><div className="absolute h-3 rounded-full bg-lav-500" style={{ width: `${r.pre}%` }} /></div><div className="mt-0.5 text-[11px] tabular-nums text-ink-3">{r.pre}% → {r.post}% (+{r.post - r.pre})</div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />Assessment gains show learning during the programme. They do not show that training caused changes in business performance; that needs a proper evaluation design.</p>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Team standings" action={<TrendingUp size={18} className="text-ink-3" />} />
          <Leaderboard rows={teamPoints(db)} />
        </Card>
      </div>
      {!ro && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[['agenda', 'Edit the agenda', 'Change times, reorder, publish updates'], ['participants', 'Manage participants', 'Import CSV, validate, allocate'], ['reports', 'Reports & exports', 'CSV and print-ready reports']].map(([id, t, d]) => (
            <button key={id} onClick={() => go(id)} className="text-left"><Card className={cx('p-4 transition hover:-translate-y-0.5 hover:shadow-pop')}><div className="font-bold">{t}</div><div className="text-sm text-ink-3">{d}</div></Card></button>
          ))}
        </div>
      )}
    </div>
  );
}

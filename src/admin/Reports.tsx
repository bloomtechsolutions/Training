import React, { useState } from 'react';
import { Printer, FileBarChart } from 'lucide-react';
import { useStore, eventSessions } from '../lib/store';
import { Button, Card, PageHeader, Tabs, inputCls, cx, toCsv, DemoTag } from '../components/ui';
import { ExportButtons } from '../components/shared';
import { ReadOnlyNote } from './common';
import { computeMetrics } from './metrics';
import { formatDay, formatClock } from '../lib/time';

type R = 'attendance-region' | 'attendance-participant' | 'attendance-session' | 'participation' | 'ideas';

export default function ReportsAdmin() {
  const { db, toast } = useStore();
  const [eventId, setEventId] = useState(db.currentEventId);
  const [region, setRegion] = useState('all');
  const [day, setDay] = useState('all');
  const [rep, setRep] = useState<R>('attendance-region');
  const ev = db.events.find((e) => e.id === eventId)!;
  const m = computeMetrics(db, eventId, region);
  const sessions = eventSessions(db, eventId).filter((s) => s.kind !== 'break' && (day === 'all' || String(s.day) === day));
  const users = m.users.filter((u) => u.status === 'confirmed');

  const table: (string | number)[][] = (() => {
    if (rep === 'attendance-region') return [['Region', 'Service centre', 'Participants', 'Check-ins', 'Late', 'Attendance %'], ...db.serviceCentres.filter((sc) => region === 'all' || sc.regionId === region).map((sc) => {
      const us = users.filter((u) => u.scId === sc.id); const ids = new Set(us.map((u) => u.id));
      const recs = db.attendance.filter((a) => ids.has(a.userId) && sessions.some((s) => s.id === a.sessionId));
      const held = sessions.filter((s) => db.attendance.some((a) => a.sessionId === s.id)).length;
      return [db.regions.find((r) => r.id === sc.regionId)!.name, sc.name, us.length, recs.length, recs.filter((r) => r.late).length, held * us.length ? Math.round((recs.length / (held * us.length)) * 100) : 0];
    }).filter((r) => r[2] !== 0)];
    if (rep === 'attendance-participant') return [['Staff ID', 'Participant', 'Region', ...sessions.map((s) => s.code ? `S${s.code}` : `EA ${s.start}`)], ...users.map((u) => [u.staffId, u.name, db.regions.find((r) => r.id === u.regionId)!.name, ...sessions.map((s) => { const a = db.attendance.find((x) => x.userId === u.id && x.sessionId === s.id); return a ? `${a.late ? 'L' : 'P'} ${formatClock(a.checkIn)}` : '—'; })])];
    if (rep === 'attendance-session') return [['Day', 'Time', 'Session', 'Checked in', 'Late', 'Rate %'], ...sessions.map((s) => { const n = db.attendance.filter((a) => a.sessionId === s.id && users.some((u) => u.id === a.userId)); return [`Day ${s.day}`, `${s.start}–${s.end}`, s.title, n.length, n.filter((a) => a.late).length, users.length ? Math.round((n.length / users.length) * 100) : 0]; })];
    if (rep === 'participation') return [['Activity', 'Session', 'Responses', 'Unique participants'], ...db.activities.filter((a) => sessions.some((s) => s.id === a.sessionId)).map((a) => { const rs = a.type === 'wordcloud' ? db.words.filter((w) => w.activityId === a.id) : db.responses.filter((r) => r.activityId === a.id); return [a.title, `S${db.sessions.find((s) => s.id === a.sessionId)?.code}`, rs.length, new Set(rs.map((r) => r.userId)).size]; })];
    return [['Idea', 'Team', 'Votes', 'Status', 'Owner', 'Progress %'], ...m.ideas.map((i) => [i.title, db.teams.find((t) => t.id === i.teamId)?.name ?? '', i.votes.length, i.status, i.owner, i.progress])];
  })();

  return (
    <div>
      <PageHeader eyebrow="Measure" title="Reports" subtitle="Filter, export to CSV (opens in Excel) or print a report. Native .xlsx and scheduled PDF reports are future features."
        actions={<><ExportButtons filename={`${rep}.csv`} getText={() => toCsv(table)} /><Button size="sm" variant="secondary" icon={<Printer size={15} />} onClick={() => { try { window.print(); } catch { /* blocked */ } toast('If no print dialog opened, printing is blocked in this viewer. Use CSV.', 'info'); }}>Print</Button></>} />
      <ReadOnlyNote />
      <Card className="mb-4 grid gap-2 p-4 no-print sm:grid-cols-3">
        <label className="sr-only" htmlFor="rp-ev">Event</label>
        <select id="rp-ev" className={inputCls} value={eventId} onChange={(e) => setEventId(e.target.value)}>{db.events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <label className="sr-only" htmlFor="rp-rg">Region</label>
        <select id="rp-rg" className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)}><option value="all">All regions</option>{db.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <label className="sr-only" htmlFor="rp-day">Day</label>
        <select id="rp-day" className={inputCls} value={day} onChange={(e) => setDay(e.target.value)}><option value="all">Both days</option>{ev.days.map((d, i) => <option key={d.date} value={String(i + 1)}>Day {i + 1} · {formatDay(d.date)}</option>)}</select>
      </Card>
      <Tabs className="mb-4 no-print" value={rep} onChange={setRep} tabs={[{ id: 'attendance-region', label: 'By service centre' }, { id: 'attendance-session', label: 'By session' }, { id: 'attendance-participant', label: 'By participant' }, { id: 'participation', label: 'Activity participation' }, { id: 'ideas', label: 'Ideas' }]} />
      <Card className="print-area p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2"><FileBarChart size={18} className="text-bml" /><h2 className="font-display text-lg font-bold">{ev.name}</h2><DemoTag /></div>
        <div className="mb-3 text-xs text-ink-3">{region === 'all' ? 'All regions' : db.regions.find((r) => r.id === region)?.name} · {day === 'all' ? 'Both days' : `Day ${day}`} · generated {new Date().toLocaleString('en-GB')}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-ink/10 text-left text-xs text-ink-3">{table[0].map((h) => <th key={String(h)} className="whitespace-nowrap px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{table.slice(1).map((r, i) => <tr key={i} className={cx('border-b border-ink/5', i % 2 === 1 && 'bg-canvas/60')}>{r.map((c, j) => <td key={j} className="whitespace-nowrap px-2 py-2 tabular-nums">{c}</td>)}</tr>)}</tbody>
          </table>
          {table.length === 1 && <p className="py-6 text-center text-sm text-ink-3">No data for these filters.</p>}
        </div>
      </Card>
    </div>
  );
}

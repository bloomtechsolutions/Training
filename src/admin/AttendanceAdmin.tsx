import React, { useState } from 'react';
import { AlertTriangle, Pencil, QrCode, ShieldAlert } from 'lucide-react';
import { useStore, uid, audit, eventSessions, useNow } from '../lib/store';
import { Badge, Button, Card, PageHeader, Modal, Field, inputCls, cx, Stat, toCsv, DemoTag } from '../components/ui';
import { ExportButtons } from '../components/shared';
import { ADMIN_ACTOR } from './common';
import { formatClock, sessionStatus, mvtEpoch } from '../lib/time';
import type { AttendanceRecord, User } from '../lib/types';

export default function AttendanceAdmin() {
  const { db, update, toast } = useStore();
  const now = useNow();
  const ev = db.events.find((e) => e.id === db.currentEventId)!;
  const sessions = eventSessions(db, ev.id).filter((s) => s.kind !== 'break');
  const defaultS = sessions.find((s) => sessionStatus(ev, s, now) === 'live') ?? sessions[0];
  const [sid, setSid] = useState(defaultS?.id ?? '');
  const [region, setRegion] = useState('all');
  const [fix, setFix] = useState<{ u: User; rec?: AttendanceRecord } | null>(null);
  const [status, setStatus] = useState<AttendanceRecord['status']>('present');
  const [reason, setReason] = useState('');
  const s = sessions.find((x) => x.id === sid)!;
  const people = db.users.filter((u) => u.eventIds.includes(ev.id) && u.status === 'confirmed' && (region === 'all' || u.regionId === region));
  const rec = (u: User) => db.attendance.find((a) => a.userId === u.id && a.sessionId === sid);
  const present = people.filter((u) => rec(u)).length;
  const late = people.filter((u) => rec(u)?.late).length;
  const offline = db.attendance.filter((a) => a.method === 'offline' && a.eventId === ev.id);

  const save = () => {
    if (!fix || reason.trim().length < 5) return;
    update((d) => {
      const existing = d.attendance.find((a) => a.userId === fix.u.id && a.sessionId === sid);
      if (status === 'absent') { d.attendance = d.attendance.filter((a) => a !== existing); }
      else if (existing) { existing.status = status; existing.late = status === 'late'; existing.method = 'manual'; }
      else d.attendance.push({ id: uid('att'), eventId: ev.id, sessionId: sid, userId: fix.u.id, checkIn: mvtEpoch(ev.days[s.day - 1].date, s.start), checkOut: null, late: status === 'late', method: 'manual', status });
      audit(d, ADMIN_ACTOR, 'attendance.correct', `${fix.u.name} · ${s.code ? `S${s.code}` : s.title} → ${status}`, reason.trim());
    });
    toast('Correction saved and logged'); setFix(null); setReason('');
  };

  return (
    <div>
      <PageHeader eyebrow="Run" title="Attendance" subtitle="Live check-in monitor, exceptions and audited corrections."
        actions={<ExportButtons filename={`attendance-${s?.code ?? s?.id}.csv`} getText={() => toCsv([['staff_id', 'name', 'region', 'service_centre', 'session', 'status', 'check_in', 'check_out', 'method'], ...people.map((u) => { const r = rec(u); return [u.staffId, u.name, db.regions.find((x) => x.id === u.regionId)?.name, db.serviceCentres.find((x) => x.id === u.scId)?.name, s.title, r ? r.status : 'absent', r ? formatClock(r.checkIn) : '', r?.checkOut ? formatClock(r.checkOut) : '', r?.method ?? '']; })])} />} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="at-s" className="sr-only">Session</label>
        <select id="at-s" className={cx(inputCls, 'sm:max-w-md')} value={sid} onChange={(e) => setSid(e.target.value)}>{sessions.map((x) => <option key={x.id} value={x.id}>Day {x.day} · {x.start} · {x.code ? `S${x.code} ` : ''}{x.title}{sessionStatus(ev, x, now) === 'live' ? ' (live)' : ''}</option>)}</select>
        <label htmlFor="at-r" className="sr-only">Region</label>
        <select id="at-r" className={cx(inputCls, 'sm:w-48')} value={region} onChange={(e) => setRegion(e.target.value)}><option value="all">All regions</option>{db.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Checked in" value={`${present}/${people.length}`} icon={<QrCode size={16} />} tone="teal" />
        <Stat label="Late" value={late} sub="after start + 10 min" tone="amber" icon={<AlertTriangle size={16} />} />
        <Stat label="Not yet" value={people.length - present} tone="red" />
        <Stat label="Offline exceptions" value={offline.length} sub="need validation" tone="lav" icon={<ShieldAlert size={16} />} />
      </div>
      <p className="mb-3 flex items-center gap-2 text-xs text-ink-3"><DemoTag /> QR check-in is simulated. Organisers should validate presence; a QR scan alone does not prove someone is in the room.</p>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b border-ink/5 text-left text-xs text-ink-3"><th className="px-4 py-3 font-semibold">Participant</th><th className="font-semibold">Service centre</th><th className="font-semibold">Status</th><th className="font-semibold">Check-in</th><th className="font-semibold">Method</th><th className="px-4 text-right font-semibold">Correct</th></tr></thead>
          <tbody>{people.map((u) => { const r = rec(u); return (
            <tr key={u.id} className="border-b border-ink/5 last:border-0">
              <td className="px-4 py-2.5 font-semibold">{u.name}<div className="font-mono text-[11px] font-normal text-ink-3">{u.staffId}</div></td>
              <td className="text-xs text-ink-2">{db.serviceCentres.find((x) => x.id === u.scId)?.name}</td>
              <td>{r ? <Badge tone={r.late ? 'amber' : r.status === 'excused' ? 'lav' : 'green'}>{r.status}</Badge> : <Badge tone="ink">not checked in</Badge>}</td>
              <td className="font-mono text-xs tabular-nums">{r ? formatClock(r.checkIn) : '—'}{r?.checkOut ? ` → ${formatClock(r.checkOut)}` : ''}</td>
              <td className="text-xs">{r?.method ?? '—'}</td>
              <td className="px-4 text-right"><Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => { setFix({ u, rec: r }); setStatus(r?.status ?? 'present'); }}>Correct</Button></td>
            </tr>
          ); })}</tbody>
        </table>
      </Card>
      <Modal open={!!fix} onClose={() => setFix(null)} title={`Correct attendance · ${fix?.u.name ?? ''}`} footer={<><Button variant="secondary" onClick={() => setFix(null)}>Cancel</Button><Button disabled={reason.trim().length < 5} disabledReason="A reason of at least 5 characters is required" onClick={save}>Save correction</Button></>}>
        <div className="space-y-3">
          <Field label="Status" htmlFor="fx-st"><select id="fx-st" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as AttendanceRecord['status'])}><option value="present">Present</option><option value="late">Late</option><option value="excused">Excused</option><option value="absent">Absent (remove record)</option></select></Field>
          <Field label="Reason (required, saved to the audit log)" htmlFor="fx-r"><textarea id="fx-r" rows={3} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Phone battery died; verified in person by organiser" /></Field>
        </div>
      </Modal>
    </div>
  );
}

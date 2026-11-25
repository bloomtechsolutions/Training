import React, { useMemo, useRef, useState } from 'react';
import { Upload, Search, CheckCircle2, AlertTriangle, FileSpreadsheet, UserPlus } from 'lucide-react';
import { useStore, audit } from '../lib/store';
import { Badge, Button, Card, PageHeader, Modal, inputCls, cx, EmptyState, DemoTag, toCsv } from '../components/ui';
import { TeamChip, ExportButtons } from '../components/shared';
import { ADMIN_ACTOR } from './common';
import type { User } from '../lib/types';

const SAMPLE = `staff_id,name,email,region,service_centre,designation
D2001,Demo Person A,demo.a@example.test,South,South Service Centre 1,Teller
D2002,Demo Person B,demo.b@example.test,Malé,Malé Service Centre 2,Customer Service Officer
D1003,Duplicate Staff,dup@example.test,North,North Service Centre 1,Teller
D2004,Missing Region,demo.d@example.test,,North Service Centre 1,Teller
D2005,Bad Email,not-an-email,Central,Central Service Centre 3,Teller`;

interface Row { line: number; raw: Record<string, string>; errors: string[]; user?: User }

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let cur: string[] = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; continue; }
    if (c === '"') q = true; else if (c === ',') { cur.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; cur.push(f); rows.push(cur); cur = []; f = ''; } else f += c;
  }
  if (f || cur.length) { cur.push(f); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export default function ParticipantsAdmin() {
  const { db, update, toast } = useStore();
  const ev = db.events.find((e) => e.id === db.currentEventId)!;
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('all');
  const [importing, setImporting] = useState(false);
  const [csv, setCsv] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const users = useMemo(() => db.users.filter((u) => u.eventIds.includes(ev.id)).filter((u) => region === 'all' || u.regionId === region).filter((u) => !q || `${u.name} ${u.staffId} ${u.email}`.toLowerCase().includes(q.toLowerCase())), [db.users, ev.id, region, q]);

  const validate = (text: string) => {
    const t = parseCsv(text.trim());
    if (t.length < 2) { setRows([]); return; }
    const head = t[0].map((h) => h.trim().toLowerCase());
    const need = ['staff_id', 'name', 'email', 'region', 'service_centre'];
    const missing = need.filter((n) => !head.includes(n));
    if (missing.length) { toast(`Missing column(s): ${missing.join(', ')}`, 'err'); setRows(null); return; }
    const seen = new Set<string>();
    setRows(t.slice(1).map((r, i) => {
      const raw = Object.fromEntries(head.map((h, j) => [h, (r[j] ?? '').trim()]));
      const errors: string[] = [];
      if (!/^[A-Z]\d{3,6}$/i.test(raw.staff_id)) errors.push('Staff ID format (e.g. D1234)');
      if (seen.has(raw.staff_id.toUpperCase())) errors.push('Duplicate in file');
      if (db.users.some((u) => u.staffId.toUpperCase() === raw.staff_id.toUpperCase())) errors.push('Already registered');
      seen.add(raw.staff_id.toUpperCase());
      if (raw.name.length < 2) errors.push('Name required');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw.email)) errors.push('Invalid email');
      const reg = db.regions.find((x) => x.name.toLowerCase() === raw.region.toLowerCase() || x.id === raw.region.toLowerCase());
      if (!reg) errors.push('Unknown region');
      const sc = db.serviceCentres.find((x) => x.name.toLowerCase() === raw.service_centre.toLowerCase() && x.regionId === reg?.id);
      if (reg && !sc) errors.push('Service centre not in region');
      const user: User | undefined = errors.length ? undefined : { id: `u-${raw.staff_id.toLowerCase()}`, name: raw.name, staffId: raw.staff_id.toUpperCase(), email: raw.email, regionId: reg!.id, scId: sc!.id, designation: raw.designation || '', teamId: null, status: 'registered', eventIds: [ev.id], demo: true };
      return { line: i + 2, raw, errors, user };
    }));
  };
  const valid = rows?.filter((r) => r.user) ?? [];

  const setStatus = (u: User, status: User['status']) => update((d) => { d.users.find((x) => x.id === u.id)!.status = status; audit(d, ADMIN_ACTOR, 'participant.status', `${u.name} → ${status}`); });

  return (
    <div>
      <PageHeader eyebrow="Prepare" title="Participants" subtitle={`${db.users.filter((u) => u.eventIds.includes(ev.id)).length} registered for ${ev.name}`}
        actions={<><ExportButtons filename="participants.csv" getText={() => toCsv([['staff_id', 'name', 'email', 'region', 'service_centre', 'designation', 'team', 'status'], ...users.map((u) => [u.staffId, u.name, u.email, db.regions.find((r) => r.id === u.regionId)?.name, db.serviceCentres.find((s) => s.id === u.scId)?.name, u.designation, db.teams.find((t) => t.id === u.teamId)?.name ?? '', u.status])])} /><Button icon={<Upload size={16} />} onClick={() => { setImporting(true); setRows(null); setCsv(''); }}>Import CSV</Button></>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" size={17} /><label htmlFor="pq" className="sr-only">Search</label><input id="pq" className={cx(inputCls, 'pl-10')} placeholder="Search name, staff ID or email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <label htmlFor="preg" className="sr-only">Region</label>
        <select id="preg" className={cx(inputCls, 'sm:w-48')} value={region} onChange={(e) => setRegion(e.target.value)}><option value="all">All regions</option>{db.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      </div>
      {users.length === 0 ? <EmptyState icon={<UserPlus />} title="No participants match" body="Change the filters or import a CSV." /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-ink/5 text-left text-xs text-ink-3"><th className="px-4 py-3 font-semibold">Participant</th><th className="font-semibold">Staff ID</th><th className="font-semibold">Region / service centre</th><th className="font-semibold">Team</th><th className="font-semibold">Status</th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5"><div className="font-semibold">{u.name} {u.demo && <DemoTag className="ml-1">Demo</DemoTag>}</div><div className="text-xs text-ink-3">{u.email}</div></td>
                <td className="font-mono text-xs">{u.staffId}</td>
                <td className="text-ink-2"><div>{db.regions.find((r) => r.id === u.regionId)?.name}</div><div className="text-xs text-ink-3">{db.serviceCentres.find((s) => s.id === u.scId)?.name ?? '—'}</div></td>
                <td><TeamChip team={db.teams.find((t) => t.id === u.teamId)} /></td>
                <td>
                  <label htmlFor={`st-${u.id}`} className="sr-only">Status</label>
                  <select id={`st-${u.id}`} value={u.status} onChange={(e) => setStatus(u, e.target.value as User['status'])} className={cx('h-9 rounded-lg border-0 px-2 text-xs font-bold ring-1 ring-inset', u.status === 'confirmed' ? 'bg-teal-50 text-teal-700 ring-teal-100' : u.status === 'registered' ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-ink/5 text-ink-3 ring-ink/10')}>
                    <option value="registered">Registered</option><option value="confirmed">Confirmed</option><option value="withdrawn">Withdrawn</option>
                  </select>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      <Modal open={importing} onClose={() => setImporting(false)} title="Import participants from CSV" wide footer={<><Button variant="secondary" onClick={() => setImporting(false)}>Cancel</Button><Button disabled={!valid.length} disabledReason="No valid rows to import" onClick={() => {
        update((d) => { valid.forEach((r) => d.users.push(r.user!)); audit(d, ADMIN_ACTOR, 'participant.import', `Imported ${valid.length} participants (${(rows?.length ?? 0) - valid.length} rejected)`); });
        toast(`${valid.length} participant${valid.length > 1 ? 's' : ''} imported`); setImporting(false);
      }}>Import {valid.length} valid row{valid.length === 1 ? '' : 's'}</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-ink-2">Columns: <code className="rounded bg-canvas px-1">staff_id, name, email, region, service_centre, designation</code>. Rows are validated before anything is saved. Use only demo data in this prototype.</p>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" id="csv-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (f.size > 1024 * 1024) { toast('CSV larger than 1 MB', 'err'); return; } f.text().then((t) => { setCsv(t); validate(t); }); }} />
            <Button size="sm" variant="secondary" icon={<FileSpreadsheet size={15} />} onClick={() => fileRef.current?.click()}>Choose CSV file</Button>
            <Button size="sm" variant="ghost" onClick={() => { setCsv(SAMPLE); validate(SAMPLE); }}>Load sample with errors</Button>
          </div>
          <label htmlFor="csv-text" className="sr-only">CSV text</label>
          <textarea id="csv-text" rows={6} className={cx(inputCls, 'font-mono text-xs')} placeholder="…or paste CSV here" value={csv} onChange={(e) => setCsv(e.target.value)} />
          <Button size="sm" variant="soft" disabled={!csv.trim()} disabledReason="Paste or load CSV first" onClick={() => validate(csv)}>Validate</Button>
          {rows && (
            <div className="overflow-x-auto rounded-xl ring-1 ring-ink/10">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="bg-canvas"><tr className="text-left"><th className="px-3 py-2">Line</th><th>Staff ID</th><th>Name</th><th>Region</th><th>Result</th></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.line} className="border-t border-ink/5"><td className="px-3 py-2 font-mono">{r.line}</td><td className="font-mono">{r.raw.staff_id}</td><td>{r.raw.name}</td><td>{r.raw.region}</td>
                    <td className="py-2">{r.errors.length ? <span className="flex items-start gap-1 font-semibold text-bml"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{r.errors.join('; ')}</span> : <Badge tone="teal" icon={<CheckCircle2 size={11} />}>Valid</Badge>}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

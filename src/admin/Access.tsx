import React, { useState } from 'react';
import { Check, Minus, ShieldCheck, Search } from 'lucide-react';
import { useStore } from '../lib/store';
import { Card, PageHeader, SectionTitle, inputCls, cx, toCsv, Badge } from '../components/ui';
import { ExportButtons } from '../components/shared';
import { formatDateTime } from '../lib/time';

const ROLES = ['Participant', 'Trainer', 'Event organiser', 'Central Retail admin', 'Leadership', 'Manager', 'Venue display', 'Vendor (optional)'];
const PERMS: [string, (0 | 1 | 2)[]][] = [
  // 0 none, 1 own/scoped, 2 full
  ['View published agenda & resources', [1, 1, 2, 2, 2, 0, 1, 1]],
  ['Own notes, feedback, commitments', [1, 0, 0, 0, 0, 0, 0, 0]],
  ['Run activities & presenter', [0, 1, 2, 2, 0, 0, 0, 1]],
  ['Edit agenda & publish', [0, 0, 1, 2, 0, 0, 0, 0]],
  ['Manage participants & import', [0, 0, 1, 2, 0, 0, 0, 0]],
  ['Approve content', [0, 0, 1, 2, 0, 0, 0, 0]],
  ['Correct attendance (with reason)', [0, 0, 1, 2, 0, 0, 0, 0]],
  ['Aggregated feedback & reports', [0, 0, 1, 2, 1, 0, 0, 0]],
  ['Review assigned commitments', [0, 0, 0, 0, 0, 1, 0, 0]],
  ['Issue certificates', [0, 0, 1, 2, 0, 0, 0, 0]],
  ['Public screen content only', [0, 0, 0, 0, 0, 0, 1, 0]],
];

export default function AccessAdmin() {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const logs = db.audit.filter((a) => !q || `${a.actor} ${a.action} ${a.detail} ${a.reason ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader eyebrow="Govern" title="Access & audit" subtitle="Role permissions, event-level scoping and a tamper-evident audit trail (in production)." />
      <Card className="mb-5 flex items-start gap-3 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-teal-600" size={18} /><p className="text-sm text-ink-2">The role switcher in this prototype is a demonstration, not authentication. In production, sign-in uses Microsoft Entra ID and every permission below is enforced on the server and scoped to the events a person is assigned to.</p></Card>
      <SectionTitle title="Role permissions" />
      <Card className="mb-6 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead><tr className="border-b border-ink/5 text-left text-xs text-ink-3"><th className="px-4 py-3 font-semibold">Capability</th>{ROLES.map((r) => <th key={r} className="px-2 text-center font-semibold">{r}</th>)}</tr></thead>
          <tbody>{PERMS.map(([p, v]) => (
            <tr key={p} className="border-b border-ink/5 last:border-0"><td className="px-4 py-2.5 font-medium">{p}</td>{v.map((x, i) => <td key={i} className="text-center">{x === 2 ? <Check size={17} className="mx-auto text-teal-600" aria-label="Full" /> : x === 1 ? <Badge tone="lav">scoped</Badge> : <Minus size={15} className="mx-auto text-ink-4" aria-label="None" />}</td>)}</tr>
          ))}</tbody>
        </table>
      </Card>
      <SectionTitle title={`Audit log (${db.audit.length})`} action={<ExportButtons filename="audit-log.csv" getText={() => toCsv([['time', 'actor', 'action', 'detail', 'reason'], ...db.audit.map((a) => [new Date(a.ts).toISOString(), a.actor, a.action, a.detail, a.reason ?? ''])])} />} />
      <div className="relative mb-3"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" size={16} /><label htmlFor="al-q" className="sr-only">Filter</label><input id="al-q" className={cx(inputCls, 'pl-10')} placeholder="Filter by actor, action or text" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b border-ink/5 text-left text-xs text-ink-3"><th className="px-4 py-3 font-semibold">When (MVT)</th><th className="font-semibold">Actor</th><th className="font-semibold">Action</th><th className="font-semibold">Detail</th></tr></thead>
          <tbody>{logs.slice(0, 200).map((a) => (
            <tr key={a.id} className="border-b border-ink/5 last:border-0"><td className="whitespace-nowrap px-4 py-2 text-xs tabular-nums text-ink-3">{formatDateTime(a.ts)}</td><td className="whitespace-nowrap text-xs font-semibold">{a.actor}</td><td><code className="rounded bg-canvas px-1.5 py-0.5 text-xs">{a.action}</code></td><td className="py-2 text-ink-2">{a.detail}{a.reason && <div className="text-xs text-amber-700">Reason: {a.reason}</div>}</td></tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}

import React, { useState } from 'react';
import { Award, CheckCircle2, Circle, Eye } from 'lucide-react';
import { useStore, uid, audit } from '../lib/store';
import { Badge, Button, Card, PageHeader, Toggle, Field, inputCls, Modal, SectionTitle } from '../components/ui';
import { certEligibility } from '../lib/cert';
import { CertificateCard } from '../participant/Beyond';
import { ADMIN_ACTOR } from './common';

export default function CertificatesAdmin() {
  const { db, update, toast } = useStore();
  const ev = db.events.find((e) => e.id === db.currentEventId)!;
  const [view, setView] = useState<string | null>(null);
  const people = db.users.filter((u) => u.eventIds.includes(ev.id) && u.status === 'confirmed').map((u) => ({ u, e: certEligibility(db, u.id, ev.id), cert: db.certificates.find((c) => c.userId === u.id && c.eventId === ev.id) }));
  const eligible = people.filter((p) => p.e.eligible && !p.cert);
  const issue = (ids: string[]) => update((d) => {
    ids.forEach((id) => { if (!d.certificates.some((c) => c.userId === id && c.eventId === ev.id)) d.certificates.push({ id: uid('cert'), userId: id, eventId: ev.id, serial: `BMLR-${ev.days[0].date.slice(0, 7).replace('-', '')}-${String(d.certificates.length + 1).padStart(4, '0')}`, ts: Date.now() }); });
    audit(d, ADMIN_ACTOR, 'certificate.issue', `Issued ${ids.length} certificate(s)`);
  });
  return (
    <div>
      <PageHeader eyebrow="Achieve" title="Certificates" subtitle="Generate personalised certificates only when the approved rules are met. Issuing is an organiser decision."
        actions={<Button icon={<Award size={16} />} disabled={!eligible.length} disabledReason="Nobody newly eligible" onClick={() => { issue(eligible.map((p) => p.u.id)); toast(`${eligible.length} certificate(s) issued`); }}>Issue to all eligible ({eligible.length})</Button>} />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit space-y-2 p-5">
          <SectionTitle title="Eligibility rules" eyebrow="Configurable" />
          <Field label={`Minimum attendance: ${db.certRules.minAttendancePct}%`} htmlFor="cr-att"><input id="cr-att" type="range" min={50} max={100} step={5} value={db.certRules.minAttendancePct} onChange={(e) => update((d) => { d.certRules.minAttendancePct = Number(e.target.value); })} className="w-full accent-[#B50928]" /></Field>
          <Toggle checked={db.certRules.requireFeedback} onChange={(v) => update((d) => { d.certRules.requireFeedback = v; })} label="Require event feedback" />
          <Toggle checked={db.certRules.requireCommitment} onChange={(v) => update((d) => { d.certRules.requireCommitment = v; })} label="Require a 30/60/90 commitment" />
          <p className="text-xs text-ink-3">Rules must be approved before go-live. Changing them does not revoke issued certificates.</p>
        </Card>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-ink/5 text-left text-xs text-ink-3"><th className="px-4 py-3 font-semibold">Participant</th><th className="font-semibold">Attendance</th><th className="font-semibold">Checks</th><th className="font-semibold">Status</th><th className="px-4 text-right font-semibold" /></tr></thead>
            <tbody>{people.map(({ u, e, cert }) => (
              <tr key={u.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5 font-semibold">{u.name}</td>
                <td className="tabular-nums">{e.pct}%</td>
                <td><div className="flex gap-1">{e.checks.filter((c) => c.required).map((c) => <span key={c.label} title={c.label}>{c.ok ? <CheckCircle2 size={16} className="text-teal-600" /> : <Circle size={16} className="text-ink-4" />}</span>)}</div></td>
                <td>{cert ? <Badge tone="teal">Issued</Badge> : e.eligible ? <Badge tone="amber">Eligible</Badge> : <Badge tone="ink">Not yet</Badge>}</td>
                <td className="whitespace-nowrap px-4 text-right">
                  {!cert && e.eligible && <Button size="sm" onClick={() => { issue([u.id]); toast(`Issued to ${u.name}`); }}>Issue</Button>}
                  {cert && <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={() => setView(u.id)}>View</Button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      </div>
      <Modal open={!!view} onClose={() => setView(null)} title="Certificate" wide>{view && <CertificateCard userId={view} eventId={ev.id} />}</Modal>
    </div>
  );
}

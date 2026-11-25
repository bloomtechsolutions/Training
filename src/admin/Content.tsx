import React, { useRef, useState } from 'react';
import { Upload, Check, Lock, Unlock, GitBranch, Search } from 'lucide-react';
import { useStore, uid, audit, eventSessions } from '../lib/store';
import { Badge, Button, Card, PageHeader, Tabs, inputCls, cx, EmptyState } from '../components/ui';
import { ADMIN_ACTOR } from './common';
import type { Resource } from '../lib/types';
import { relTime } from '../lib/time';

const ALLOWED = /\.(pdf|pptx|docx|mp4|png|jpg|jpeg)$/i;

export default function ContentAdmin() {
  const { db, update, toast } = useStore();
  const [tab, setTab] = useState<'all' | Resource['status']>('all');
  const [q, setQ] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState('');
  const sessions = eventSessions(db, db.currentEventId).filter((s) => s.kind === 'session');
  const list = db.resources.filter((r) => r.eventId === db.currentEventId || r.eventId === null).filter((r) => tab === 'all' || r.status === tab).filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()));
  const set = (r: Resource, patch: Partial<Resource>, msg: string) => { update((d) => { Object.assign(d.resources.find((x) => x.id === r.id)!, { ...patch, updated: Date.now() }); audit(d, ADMIN_ACTOR, 'content.update', `${msg}: ${r.title}`); }); toast(msg); };
  const count = (s: Resource['status']) => db.resources.filter((r) => r.status === s).length;

  return (
    <div>
      <PageHeader eyebrow="Prepare" title="Content library" subtitle="Upload, classify, version, approve and restrict resources. Participants only ever see approved, participant-facing items." />
      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1"><label htmlFor="ct-s" className="mb-1 block text-xs font-semibold text-ink-2">Link to session</label><select id="ct-s" className={inputCls} value={session} onChange={(e) => setSession(e.target.value)}><option value="">Whole event / permanent library</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.title}</option>)}</select></div>
        <input ref={fileRef} type="file" multiple className="sr-only" id="ct-file" onChange={(e) => {
          const files = Array.from(e.target.files ?? []); e.target.value = '';
          const ok = files.filter((f) => ALLOWED.test(f.name) && f.size <= 50 * 1024 * 1024);
          if (ok.length < files.length) toast(`${files.length - ok.length} file(s) rejected: allowed PDF, PPTX, DOCX, MP4, PNG, JPG up to 50 MB`, 'warn');
          if (!ok.length) return;
          update((d) => { ok.forEach((f) => { const ext = f.name.split('.').pop()!.toLowerCase(); d.resources.push({ id: uid('res'), eventId: d.currentEventId, sessionId: session || null, title: f.name.replace(/\.[^.]+$/, ''), kind: ext === 'pdf' ? 'pdf' : ext === 'pptx' ? 'pptx' : ext === 'mp4' ? 'video' : 'doc', description: 'Uploaded via content library. Pending review.', version: 1, status: 'pending', audience: 'participants', size: `${(f.size / 1048576).toFixed(1)} MB`, updated: Date.now(), owner: ADMIN_ACTOR, tags: [] }); }); audit(d, ADMIN_ACTOR, 'content.upload', `Uploaded ${ok.length} file(s)`); });
          toast(`${ok.length} file(s) added for review. File contents stay on your device in this prototype.`, 'info');
        }} />
        <Button icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>Upload files</Button>
      </Card>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs size="sm" value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All' }, { id: 'pending', label: `Pending (${count('pending')})` }, { id: 'approved', label: 'Approved' }, { id: 'draft', label: 'Draft' }, { id: 'restricted', label: 'Restricted' }]} />
        <div className="relative sm:w-64"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" /><label htmlFor="ct-q" className="sr-only">Search</label><input id="ct-q" className={cx(inputCls, 'pl-9')} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {list.length === 0 ? <EmptyState title="Nothing here" /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-ink/5 text-left text-xs text-ink-3"><th className="px-4 py-3 font-semibold">Resource</th><th className="font-semibold">Session</th><th className="font-semibold">Version</th><th className="font-semibold">Audience</th><th className="font-semibold">Status</th><th className="px-4 text-right font-semibold">Actions</th></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5"><div className="font-semibold">{r.title}</div><div className="text-xs text-ink-3">{r.kind.toUpperCase()} · {r.size} · {relTime(r.updated)}</div></td>
                <td className="text-xs text-ink-2">{db.sessions.find((s) => s.id === r.sessionId)?.code ? `S${db.sessions.find((s) => s.id === r.sessionId)?.code}` : r.eventId ? 'Event' : 'Library'}</td>
                <td className="font-mono text-xs">v{r.version}</td>
                <td><Badge tone={r.audience === 'trainers' ? 'lav' : 'ink'}>{r.audience}</Badge></td>
                <td><Badge tone={r.status === 'approved' ? 'teal' : r.status === 'pending' ? 'amber' : r.status === 'restricted' ? 'red' : 'ink'}>{r.status}</Badge></td>
                <td className="whitespace-nowrap px-4 text-right">
                  {r.status !== 'approved' && r.status !== 'restricted' && <Button size="sm" variant="ghost" icon={<Check size={14} />} onClick={() => set(r, { status: 'approved' }, 'Approved')}>Approve</Button>}
                  <Button size="sm" variant="ghost" icon={<GitBranch size={14} />} onClick={() => set(r, { version: r.version + 1, status: 'pending' }, `New version v${r.version + 1} pending`)}>New version</Button>
                  {r.status === 'restricted' ? <Button size="sm" variant="ghost" icon={<Unlock size={14} />} onClick={() => set(r, { status: 'draft', audience: 'participants' }, 'Unrestricted')}>Unrestrict</Button> : <Button size="sm" variant="ghost" icon={<Lock size={14} />} onClick={() => set(r, { status: 'restricted', audience: 'trainers' }, 'Restricted to trainers')}>Restrict</Button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      <p className="mt-3 text-xs text-ink-3">Production: files go to BML-approved storage with file-type validation and malware scanning before review. This prototype records metadata only.</p>
    </div>
  );
}

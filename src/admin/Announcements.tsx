import React, { useState } from 'react';
import { Send, Trash2, Mail, MessageSquare } from 'lucide-react';
import { useStore, uid, audit } from '../lib/store';
import { Badge, Button, Card, PageHeader, Field, inputCls, EmptyState } from '../components/ui';
import { ADMIN_ACTOR } from './common';
import { relTime } from '../lib/time';
import type { Announcement } from '../lib/types';

export default function AnnouncementsAdmin() {
  const { db, update, toast } = useStore();
  const ev = db.events.find((e) => e.id === db.currentEventId)!;
  const [f, setF] = useState({ title: '', body: '', audience: 'all', kind: 'info' as Announcement['kind'] });
  const list = db.announcements.filter((a) => a.eventId === ev.id).sort((a, b) => b.ts - a.ts);
  const reach = (aud: string) => db.users.filter((u) => u.eventIds.includes(ev.id) && (aud === 'all' || u.regionId === aud)).length;
  return (
    <div>
      <PageHeader eyebrow="Run" title="Announcements" subtitle="Targeted in-app messages for participants." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit space-y-3 p-5">
          <Field label="Title" htmlFor="an-t"><input id="an-t" className={inputCls} maxLength={80} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Message" htmlFor="an-b"><textarea id="an-b" rows={4} className={inputCls} maxLength={500} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Audience" htmlFor="an-a"><select id="an-a" className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="all">Everyone</option>{db.regions.map((r) => <option key={r.id} value={r.id}>{r.name} only</option>)}</select></Field>
            <Field label="Type" htmlFor="an-k"><select id="an-k" className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Announcement['kind'] })}><option value="info">Information</option><option value="schedule">Schedule change</option><option value="urgent">Urgent</option></select></Field>
          </div>
          <div className="text-xs text-ink-3">Reaches {reach(f.audience)} participants in the app.</div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!f.title.trim() || !f.body.trim()} disabledReason="Add a title and message" icon={<Send size={16} />} onClick={() => { update((d) => { d.announcements.push({ id: uid('an'), eventId: ev.id, ...f, title: f.title.trim(), body: f.body.trim(), ts: Date.now(), author: 'Event organisers' }); audit(d, ADMIN_ACTOR, 'announcement.send', f.title); }); setF({ title: '', body: '', audience: 'all', kind: 'info' }); toast('Announcement sent in-app'); }}>Send in-app</Button>
            <Button variant="secondary" disabled disabledReason="Future integration, pending approval" icon={<Mail size={16} />}>Email</Button>
            <Button variant="secondary" disabled disabledReason="Future integration, pending approval" icon={<MessageSquare size={16} />}>Teams</Button>
          </div>
          <p className="text-xs text-ink-3">Email and Microsoft Teams delivery are future capabilities that need approval.</p>
        </Card>
        <div className="space-y-2">
          {list.length === 0 ? <EmptyState title="No announcements yet" /> : list.map((a) => (
            <Card key={a.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><b>{a.title}</b><Badge tone={a.kind === 'schedule' ? 'amber' : a.kind === 'urgent' ? 'red' : 'lav'}>{a.kind}</Badge><Badge tone="ink">{a.audience === 'all' ? 'Everyone' : db.regions.find((r) => r.id === a.audience)?.name}</Badge></div>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{a.body}</p>
                <div className="mt-1 text-xs text-ink-3">{relTime(a.ts)} · read by {Object.values(db.readAnnouncements).filter((ids) => ids.includes(a.id)).length}</div>
              </div>
              <Button size="sm" variant="ghost" aria-label="Delete" icon={<Trash2 size={15} />} onClick={() => { update((d) => { d.announcements = d.announcements.filter((x) => x.id !== a.id); audit(d, ADMIN_ACTOR, 'announcement.delete', a.title); }); toast('Announcement removed'); }} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

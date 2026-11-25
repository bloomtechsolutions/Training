import React, { useState } from 'react';
import { Shuffle, Check, X, Award } from 'lucide-react';
import { useStore, audit, awardPoints, teamPoints } from '../lib/store';
import { Badge, Button, Card, PageHeader, Tabs, SectionTitle, cx, EmptyState, inputCls } from '../components/ui';
import { Leaderboard, PhotoTile } from '../components/shared';
import { QAModeration } from '../trainer/QA';
import { ADMIN_ACTOR } from './common';
import { SCORE_RULES } from '../lib/content';

export default function TeamsAdmin() {
  const { db, update, toast } = useStore();
  const [tab, setTab] = useState<'teams' | 'moderation' | 'qa' | 'scoring'>('teams');
  const people = db.users.filter((u) => u.eventIds.includes(db.currentEventId) && u.status !== 'withdrawn');
  const pendingC = db.challenges.filter((c) => c.status === 'pending').length;
  const pendingP = db.photos.filter((p) => p.status === 'pending').length;
  const pendingQ = db.qa.filter((q) => q.channel === 'leadership' && q.status === 'pending').length;

  const autoBalance = () => update((d) => {
    // Balanced allocation: sort by region then service centre, deal round-robin so each team mixes locations.
    const list = d.users.filter((u) => u.eventIds.includes(d.currentEventId) && u.status !== 'withdrawn').sort((a, b) => a.regionId.localeCompare(b.regionId) || a.scId.localeCompare(b.scId));
    list.forEach((u, i) => { u.teamId = d.teams[i % d.teams.length].id; });
    audit(d, ADMIN_ACTOR, 'teams.allocate', `Auto-balanced ${list.length} participants into ${d.teams.length} teams`);
  });

  return (
    <div>
      <PageHeader eyebrow="Run" title="Teams & activities" subtitle="Allocate teams, moderate contributions and manage scoring." />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'teams', label: 'Teams' }, { id: 'moderation', label: `Wall & gallery (${pendingC + pendingP})` }, { id: 'qa', label: `Ask Leadership (${pendingQ})` }, { id: 'scoring', label: 'Scoring rules' }]} />

      {tab === 'teams' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2"><Button icon={<Shuffle size={16} />} onClick={() => { autoBalance(); toast('Teams re-balanced across regions and service centres'); }}>Auto-balance teams</Button></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {db.teams.map((t) => {
              const members = people.filter((u) => u.teamId === t.id);
              const regions = new Set(members.map((m) => m.regionId)).size;
              return (
                <Card key={t.id} className="overflow-hidden">
                  <div className="px-4 py-3" style={{ background: t.tint }}><div className="font-display text-lg font-extrabold" style={{ color: t.color }}>{t.name}</div><div className="text-xs font-semibold text-ink-2">{members.length} members · {regions} regions</div></div>
                  <ul className="max-h-72 space-y-1 overflow-y-auto p-3">
                    {members.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">{m.name}</span>
                        <label htmlFor={`mv-${m.id}`} className="sr-only">Move {m.name}</label>
                        <select id={`mv-${m.id}`} value={m.teamId ?? ''} onChange={(e) => { const to = e.target.value; update((d) => { d.users.find((x) => x.id === m.id)!.teamId = to; audit(d, ADMIN_ACTOR, 'teams.move', `${m.name} → ${to}`); }); }} className="h-8 rounded-lg bg-canvas px-1 text-xs">
                          {db.teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
          {people.some((u) => !u.teamId) && <p className="mt-3 text-sm font-semibold text-amber-700">{people.filter((u) => !u.teamId).length} participants have no team yet. Use auto-balance.</p>}
        </>
      )}

      {tab === 'moderation' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle title="Challenge wall" />
            {db.challenges.length === 0 ? <EmptyState title="No posts" /> : (
              <ul className="space-y-2">{db.challenges.map((c) => (
                <li key={c.id} className="rounded-xl bg-canvas p-3">
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{c.text}</span><Badge tone={c.status === 'approved' ? 'teal' : c.status === 'pending' ? 'amber' : 'ink'}>{c.status}</Badge></div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.status !== 'approved' && <Button size="sm" icon={<Check size={14} />} onClick={() => { update((d) => { d.challenges.find((x) => x.id === c.id)!.status = 'approved'; audit(d, ADMIN_ACTOR, 'wall.approve', c.text); }); toast('Approved'); }}>Approve</Button>}
                    {c.status !== 'rejected' && <Button size="sm" variant="danger" icon={<X size={14} />} onClick={() => update((d) => { d.challenges.find((x) => x.id === c.id)!.status = 'rejected'; audit(d, ADMIN_ACTOR, 'wall.reject', c.text); })}>Hide</Button>}
                  </div>
                  {c.status === 'approved' && (
                    <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get('sol') as string).trim(); if (!v) return; update((d) => { d.challenges.find((x) => x.id === c.id)!.solution = v; }); toast('Solution added'); }}>
                      <label htmlFor={`sol-${c.id}`} className="sr-only">Agreed solution</label>
                      <input id={`sol-${c.id}`} name="sol" defaultValue={c.solution} className={inputCls} placeholder="Agreed group solution…" />
                      <Button size="sm" type="submit" variant="soft">Save</Button>
                    </form>
                  )}
                </li>
              ))}</ul>
            )}
          </Card>
          <Card className="p-5">
            <SectionTitle title="Photo gallery" />
            <div className="grid grid-cols-2 gap-3">
              {db.photos.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-xl bg-canvas">
                  <PhotoTile {...p} className="rounded-none" />
                  <div className="p-2"><div className="truncate text-xs font-semibold">{p.caption}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <Badge tone={p.status === 'approved' ? 'teal' : p.status === 'pending' ? 'amber' : 'ink'}>{p.status}</Badge>
                      {p.status !== 'approved' && <button aria-label="Approve photo" onClick={() => update((d) => { d.photos.find((x) => x.id === p.id)!.status = 'approved'; audit(d, ADMIN_ACTOR, 'gallery.approve', p.caption); })} className="ml-auto rounded-lg p-1.5 text-teal-600 hover:bg-white"><Check size={15} /></button>}
                      {p.status !== 'rejected' && <button aria-label="Reject photo" onClick={() => update((d) => { d.photos.find((x) => x.id === p.id)!.status = 'rejected'; audit(d, ADMIN_ACTOR, 'gallery.reject', p.caption); })} className={cx('rounded-lg p-1.5 text-bml hover:bg-white', p.status === 'approved' && 'ml-auto')}><X size={15} /></button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'qa' && <QAModeration actor={ADMIN_ACTOR} filter={(q) => q.channel === 'leadership'} />}

      {tab === 'scoring' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle title="Point values" eyebrow="Configurable" />
            <ul className="divide-y divide-ink/5">{SCORE_RULES.map((r) => <li key={r.key} className="flex items-center justify-between py-2.5 text-sm"><span>{r.label}</span><b className="tabular-nums">+{r.points}</b></li>)}</ul>
            <ul className="mt-4 space-y-1 text-xs text-ink-3"><li>• Each award has a unique key, so the same points can’t be given twice.</li><li>• No points for attendance or trainer ratings.</li><li>• Individual quiz results stay private; only team totals are public.</li></ul>
          </Card>
          <Card className="p-5">
            <SectionTitle title="External engagement scores" eyebrow="Entered from the vendor’s results" />
            <div className="space-y-2">
              {db.teams.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.color }} /><span className="flex-1 text-sm font-semibold">{t.name}</span>
                  <Button size="sm" variant="secondary" icon={<Award size={14} />} onClick={() => { let ok = false; update((d) => { ok = awardPoints(d, `vendor:d2:${t.id}`, null, t.id, 300, 'Winning team · Engagement activity (Day 2)'); if (ok) audit(d, ADMIN_ACTOR, 'score.vendor', `+300 to ${t.name}`); }); setTimeout(() => toast(ok ? `+300 to ${t.name}` : 'Already awarded (duplicate blocked)', ok ? 'ok' : 'warn'), 0); }}>Winning team +300</Button>
                </div>
              ))}
            </div>
            <div className="mt-5"><Leaderboard rows={teamPoints(db)} /></div>
          </Card>
        </div>
      )}
    </div>
  );
}

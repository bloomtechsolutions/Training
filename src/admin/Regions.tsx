import React, { useState } from 'react';
import { Plus, Trash2, MapPinned, Building2 } from 'lucide-react';
import { useStore, uid, audit } from '../lib/store';
import { Badge, Button, Card, PageHeader, inputCls, DemoTag } from '../components/ui';
import { ADMIN_ACTOR } from './common';

export default function RegionsAdmin() {
  const { db, update, toast } = useStore();
  const [names, setNames] = useState<Record<string, string>>({});
  const [newRegion, setNewRegion] = useState('');
  return (
    <div>
      <PageHeader eyebrow="Prepare" title="Regions & service centres" subtitle="Maintain the region → service centre hierarchy used for events, participants and reporting."
        actions={<form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = newRegion.trim(); if (!n) return; if (db.regions.some((r) => r.name.toLowerCase() === n.toLowerCase())) { toast('That region already exists', 'warn'); return; } update((d) => { d.regions.push({ id: n.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-3), name: n }); audit(d, ADMIN_ACTOR, 'region.create', `Added region ${n}`); }); setNewRegion(''); toast('Region added'); }}>
          <label htmlFor="new-region" className="sr-only">New region</label>
          <input id="new-region" className={inputCls} placeholder="New region name" value={newRegion} onChange={(e) => setNewRegion(e.target.value)} />
          <Button type="submit" icon={<Plus size={16} />}>Add</Button>
        </form>} />
      {db.serviceCentres.some((s) => /Service Centre \d$/.test(s.name)) && <p className="mb-4 flex items-center gap-2 text-xs text-ink-3"><DemoTag /> Service centre names are placeholders. Replace them with the official list.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {db.regions.map((r) => {
          const scs = db.serviceCentres.filter((s) => s.regionId === r.id);
          const events = db.events.filter((e) => e.regionId === r.id).length;
          const people = db.users.filter((u) => u.regionId === r.id).length;
          return (
            <Card key={r.id} className="p-5">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bml-50 text-bml"><MapPinned size={19} /></span><div><div className="font-display text-lg font-bold">{r.name}</div><div className="text-xs text-ink-3">{scs.length} centres · {people} participants · {events} events assigned</div></div></div>
              <ul className="mt-4 space-y-1.5">
                {scs.map((s) => {
                  const n = db.users.filter((u) => u.scId === s.id).length;
                  return (
                    <li key={s.id} className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm">
                      <Building2 size={15} className="text-ink-3" />
                      <label htmlFor={`sc-${s.id}`} className="sr-only">Service centre name</label>
                      <input id={`sc-${s.id}`} className="min-w-0 flex-1 bg-transparent font-medium focus:outline-none" value={s.name} onChange={(e) => update((d) => { d.serviceCentres.find((x) => x.id === s.id)!.name = e.target.value; })} />
                      <Badge tone="ink">{n}</Badge>
                      <button aria-label="Delete service centre" disabled={n > 0} title={n > 0 ? 'Reassign its participants first' : 'Delete'} onClick={() => { update((d) => { d.serviceCentres = d.serviceCentres.filter((x) => x.id !== s.id); audit(d, ADMIN_ACTOR, 'sc.delete', `Deleted ${s.name}`); }); toast('Service centre removed'); }} className="rounded-lg p-1.5 text-ink-3 hover:bg-white disabled:opacity-30"><Trash2 size={14} /></button>
                    </li>
                  );
                })}
              </ul>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = (names[r.id] ?? '').trim(); if (!n) return; update((d) => { d.serviceCentres.push({ id: uid('sc'), regionId: r.id, name: n }); audit(d, ADMIN_ACTOR, 'sc.create', `Added ${n} to ${r.name}`); }); setNames({ ...names, [r.id]: '' }); toast('Service centre added'); }}>
                <label htmlFor={`new-${r.id}`} className="sr-only">New service centre</label>
                <input id={`new-${r.id}`} className={inputCls} placeholder="Add service centre…" value={names[r.id] ?? ''} onChange={(e) => setNames({ ...names, [r.id]: e.target.value })} />
                <Button type="submit" size="sm" variant="soft" icon={<Plus size={15} />} aria-label="Add" />
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Search, FileText, Presentation, Video, Layers, Newspaper, Download, Eye, FileType2 } from 'lucide-react';
import { useStore, useEvent } from '../lib/store';
import { Badge, Button, Card, PageHeader, Tabs, cx, EmptyState, Modal, inputCls } from '../components/ui';
import type { Resource } from '../lib/types';
import { Flashcards, UpdateCards } from '../engage/Cards';
import { relTime } from '../lib/time';

const ICON: Record<Resource['kind'], React.ComponentType<any>> = { pdf: FileText, pptx: Presentation, video: Video, doc: FileType2, flashcards: Layers, update: Newspaper };
const TINT: Record<Resource['kind'], string> = { pdf: 'bg-bml-50 text-bml', pptx: 'bg-coral-50 text-coral-600', video: 'bg-lav-50 text-lav-600', doc: 'bg-sky2-50 text-sky2-600', flashcards: 'bg-amber-50 text-amber-600', update: 'bg-teal-50 text-teal-600' };

export function ResourceRow({ r }: { r: Resource }) {
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  const Icon = ICON[r.kind];
  const s = db.sessions.find((x) => x.id === r.sessionId);
  return (
    <>
      <Card className="flex items-center gap-3 p-3 pr-4">
        <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', TINT[r.kind])}><Icon size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-ink">{r.title}</div>
          <div className="truncate text-xs text-ink-3">{r.kind.toUpperCase()} · v{r.version}{s ? ` · ${s.code ? `Session ${s.code}` : s.title}` : ''} · updated {relTime(r.updated)}</div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)} icon={<Eye size={15} />}>Open</Button>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={r.title} wide={r.kind === 'update' || r.kind === 'flashcards'}>
        {r.kind === 'flashcards' ? <Flashcards /> : r.kind === 'update' ? <UpdateCards /> : (
          <div className="space-y-4">
            <div className={cx('flex aspect-[16/9] flex-col items-center justify-center rounded-2xl text-center', TINT[r.kind])}>
              <Icon size={40} />
              <div className="mt-2 font-display text-lg font-bold">Preview placeholder</div>
              <div className="max-w-sm px-4 text-sm opacity-80">{r.kind === 'video' ? 'Video playback will use BML’s approved media platform.' : 'The approved file will open from BML’s approved document storage.'}</div>
            </div>
            <p className="text-sm text-ink-2">{r.description}</p>
            <div className="flex flex-wrap gap-2">{r.tags.map((t) => <Badge key={t} tone="lav">{t}</Badge>)}</div>
            <Button variant="secondary" disabled disabledReason="Prototype: no real file is attached" icon={<Download size={16} />}>Download ({r.size}) · not available in prototype</Button>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function LibraryView() {
  const { db } = useStore();
  const ev = useEvent();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | Resource['kind']>('all');
  const list = useMemo(() => db.resources
    .filter((r) => (r.eventId === ev.id || r.eventId === null) && r.status === 'approved' && r.audience === 'participants')
    .filter((r) => kind === 'all' || r.kind === kind)
    .filter((r) => !q || `${r.title} ${r.description} ${r.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())), [db.resources, q, kind, ev.id]);
  const pending = db.resources.filter((r) => r.eventId === ev.id && r.audience === 'participants' && r.status !== 'approved' && r.status !== 'restricted').length;

  return (
    <div>
      <PageHeader eyebrow="Learning library" title="Resources" subtitle="Approved presentations, notes, product and process updates, flashcards and videos." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" size={18} />
          <label htmlFor="lib-q" className="sr-only">Search resources</label>
          <input id="lib-q" className={cx(inputCls, 'h-12 pl-10')} placeholder="Search resources…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Tabs size="sm" value={kind} onChange={setKind} tabs={[{ id: 'all', label: 'All' }, { id: 'update', label: 'Updates' }, { id: 'flashcards', label: 'Flashcards' }, { id: 'pdf', label: 'PDFs' }, { id: 'doc', label: 'Docs' }, { id: 'pptx', label: 'Slides' }, { id: 'video', label: 'Video' }]} />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Search />} title="No matching resources" body={q ? `Nothing matches “${q}”. Try another word.` : 'Nothing in this category has been approved yet.'} action={<Button variant="secondary" onClick={() => { setQ(''); setKind('all'); }}>Clear filters</Button>} />
      ) : <div className="grid gap-2 lg:grid-cols-2">{list.map((r) => <ResourceRow key={r.id} r={r} />)}</div>}
      {pending > 0 && <p className="mt-4 text-xs text-ink-3">{pending} more resource{pending > 1 ? 's are' : ' is'} awaiting approval and will appear here once approved.</p>}
    </div>
  );
}

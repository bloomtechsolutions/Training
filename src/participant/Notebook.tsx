import React, { useState } from 'react';
import { NotebookPen, Printer, Copy, Bookmark, ChevronRight, Lock } from 'lucide-react';
import { useStore, useSessions, useEvent } from '../lib/store';
import { Badge, Button, Card, PageHeader, cx, EmptyState, copyText, downloadText } from '../components/ui';
import { NoteEditor } from './NoteEditor';
import { relTime } from '../lib/time';
import type { Note, Session } from '../lib/types';

function noteToText(s: Session, n: Note) {
  return [
    `${s.code ? `Session ${s.code} – ` : ''}${s.title}`,
    n.text && `Notes:\n${n.text}`,
    n.learned.some(Boolean) && `Three things I learned:\n${n.learned.filter(Boolean).map((l, i) => `  ${i + 1}. ${l}`).join('\n')}`,
    n.action && `One action I will change: ${n.action}`,
    n.questions && `Questions: ${n.questions}`,
    n.application && `Applying it in my service centre: ${n.application}`,
    n.slides.length > 0 && `Bookmarked slides: ${n.slides.map((x) => x + 1).join(', ')}`,
  ].filter(Boolean).join('\n\n');
}

export default function Notebook() {
  const { db, me, toast } = useStore();
  const ev = useEvent();
  const sessions = useSessions().filter((s) => s.kind !== 'break');
  const [sel, setSel] = useState<string>(sessions.find((s) => db.notes[`${me.id}:${s.id}`])?.id ?? sessions.find((s) => s.kind === 'session')?.id ?? sessions[0]?.id);
  const withNotes = sessions.filter((s) => db.notes[`${me.id}:${s.id}`]);
  const allText = () => `BML Refresher – My learning notebook\n${me.name} · ${ev.name}\n\n` + withNotes.map((s) => noteToText(s, db.notes[`${me.id}:${s.id}`])).join('\n\n———\n\n');
  const current = sessions.find((s) => s.id === sel);
  const n = current ? db.notes[`${me.id}:${current.id}`] : undefined;

  return (
    <div>
      <PageHeader eyebrow="Private to you" title="Learning notebook" subtitle="Notes, reflections and bookmarked slides for every session. Only you can see them."
        actions={<>
          <Button variant="secondary" size="sm" disabled={!withNotes.length} disabledReason="Write a note first" icon={<Printer size={15} />} onClick={() => { try { window.print(); } catch { /* blocked */ } toast('If no print dialog opened, your viewer blocks printing. Use Copy or Download instead.', 'info'); }}>Print / save PDF</Button>
          <Button variant="secondary" size="sm" disabled={!withNotes.length} disabledReason="Write a note first" onClick={() => { const ok = downloadText('my-refresher-notebook.txt', allText(), 'text/plain'); toast(ok ? 'Download started' : 'Download blocked; use Copy', ok ? 'ok' : 'warn'); }}>Download .txt</Button>
          <Button variant="ghost" size="sm" disabled={!withNotes.length} disabledReason="Write a note first" icon={<Copy size={15} />} onClick={async () => toast((await copyText(allText())) ? 'Notebook copied' : 'Clipboard unavailable', 'info')}>Copy all</Button>
        </>} />
      <div className="grid gap-5 lg:grid-cols-[280px_1fr] no-print">
        <Card className="h-fit p-2">
          <ul>
            {sessions.map((s) => {
              const has = db.notes[`${me.id}:${s.id}`];
              return (
                <li key={s.id}>
                  <button onClick={() => setSel(s.id)} aria-current={sel === s.id} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition', sel === s.id ? 'bg-lav-50' : 'hover:bg-canvas')}>
                    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold', s.kind === 'vendor' ? 'bg-amber-50 text-amber-700' : 'bg-bml-50 text-bml')}>{s.code ?? 'EA'}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{s.title}</span><span className="text-xs text-ink-3">Day {s.day} · {s.start}</span></span>
                    {has ? <span className="h-2 w-2 rounded-full bg-teal-500" aria-label="Has notes" /> : <ChevronRight size={15} className="text-ink-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="min-w-0 space-y-4">
          {current ? (
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div><div className="text-xs font-bold uppercase tracking-wider text-ink-3">{current.code ? `Session ${current.code}` : 'Engagement activity'}</div><h2 className="font-display text-xl font-bold">{current.title}</h2></div>
                <Badge tone="ink" icon={<Lock size={11} />}>Private</Badge>
              </div>
              <NoteEditor sessionId={current.id} />
              {n && n.slides.length > 0 && (
                <div className="mt-5 border-t border-ink/5 pt-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><Bookmark size={15} /> Bookmarked slides</div>
                  <div className="flex flex-wrap gap-2">{n.slides.map((i) => <Badge key={i} tone="lav">Slide {i + 1}{db.decks[current.id]?.slides[i] ? ` · ${db.decks[current.id].slides[i].title}` : ''}</Badge>)}</div>
                </div>
              )}
            </Card>
          ) : <EmptyState icon={<NotebookPen />} title="Pick a session" />}
          {withNotes.length > 0 && <p className="text-xs text-ink-3">{withNotes.length} session{withNotes.length > 1 ? 's' : ''} with notes · last edit {relTime(Math.max(...withNotes.map((s) => db.notes[`${me.id}:${s.id}`].updatedAt)))}</p>}
        </div>
      </div>
      {/* Print layout */}
      <div className="hidden print:block">
        <h1 className="font-display text-2xl font-bold">My learning notebook</h1>
        <p className="mb-6 text-sm">{me.name} · {ev.name}</p>
        {withNotes.map((s) => <pre key={s.id} className="mb-6 whitespace-pre-wrap font-sans text-sm">{noteToText(s, db.notes[`${me.id}:${s.id}`])}</pre>)}
      </div>
    </div>
  );
}

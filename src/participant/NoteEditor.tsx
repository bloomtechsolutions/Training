import React, { useEffect, useRef, useState } from 'react';
import { Check, Save } from 'lucide-react';
import { useStore } from '../lib/store';
import { Button, Field, inputCls } from '../components/ui';
import type { Note } from '../lib/types';
import { relTime } from '../lib/time';

export const emptyNote = (): Note => ({ text: '', learned: ['', '', ''], action: '', questions: '', application: '', slides: [], updatedAt: 0 });

/** Private learning notes for one session. Auto-saves after a short pause and on explicit save. */
export function NoteEditor({ sessionId, compact }: { sessionId: string; compact?: boolean }) {
  const { db, me, update, toast } = useStore();
  const key = `${me.id}:${sessionId}`;
  const stored = db.notes[key];
  const [draft, setDraft] = useState<Note>(stored ?? emptyNote());
  const [dirty, setDirty] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => { if (!dirty) setDraft(db.notes[key] ?? emptyNote()); }, [db.notes[key]]); // eslint-disable-line

  const save = (n = draft, manual = false) => {
    update((d) => { d.notes[key] = { ...n, updatedAt: Date.now() }; });
    setDirty(false);
    const reflected = n.learned.filter((x) => x.trim()).length >= 3 && n.action.trim();
    // Points are awarded once by the server; tell the person the first time.
    if (reflected && !db.scores.some((x) => x.key === `reflection:${me.id}:${sessionId}`)) toast('+50 points · Reflection completed', 'info');
    if (manual) toast('Notes saved privately');
  };

  const change = (patch: Partial<Note>) => {
    const n = { ...draft, ...patch };
    setDraft(n);
    setDirty(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(n), 900);
  };
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const id = (s: string) => `note-${sessionId}-${s}`;
  return (
    <div className="space-y-4">
      <Field label="Session notes" htmlFor={id('text')}>
        <textarea id={id('text')} className={inputCls} rows={compact ? 4 : 6} value={draft.text} onChange={(e) => change({ text: e.target.value })} placeholder="Key points, examples, ideas…" />
      </Field>
      <div>
        <div className="mb-1 text-xs font-semibold text-ink-2">Three things I learned</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <input key={i} id={id(`l${i}`)} aria-label={`Thing I learned ${i + 1}`} className={inputCls} value={draft.learned[i]} onChange={(e) => { const l = [...draft.learned] as Note['learned']; l[i] = e.target.value; change({ learned: l }); }} placeholder={`${i + 1}.`} />
          ))}
        </div>
      </div>
      <Field label="One action I will change" htmlFor={id('action')} hint="Complete three learnings and one action to earn a 50-point reflection (once per session).">
        <input id={id('action')} className={inputCls} value={draft.action} onChange={(e) => change({ action: e.target.value })} placeholder="From Monday I will…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Questions I still have" htmlFor={id('q')}><textarea id={id('q')} className={inputCls} rows={2} value={draft.questions} onChange={(e) => change({ questions: e.target.value })} /></Field>
        <Field label="How I’ll apply this in my service centre" htmlFor={id('app')}><textarea id={id('app')} className={inputCls} rows={2} value={draft.application} onChange={(e) => change({ application: e.target.value })} /></Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-ink-3" aria-live="polite">{dirty ? 'Saving…' : stored?.updatedAt ? <><Check size={13} className="text-teal-600" /> Saved privately · {relTime(stored.updatedAt)}</> : 'Only you can see your notes.'}</span>
        <Button size="sm" onClick={() => save(draft, true)} icon={<Save size={15} />}>Save notes</Button>
      </div>
    </div>
  );
}


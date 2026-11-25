import React, { useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown, Trash2, Plus, Presentation, Video, BarChart3, HelpCircle, Cloud, Briefcase, Users, MessagesSquare, Star, MessageCircleQuestion, FileText, Target, CheckCircle2, CircleDashed, AlertTriangle } from 'lucide-react';
import { useStore, uid } from '../lib/store';
import { Badge, Button, Card, EmptyState, cx, inputCls, Modal } from '../components/ui';
import { TrainerBar } from './Header';
import { useTrainerContext } from './useTrainer';
import type { BlockType } from '../lib/types';
import { toMin } from '../lib/time';

export const BLOCKS: { type: BlockType; label: string; icon: React.ComponentType<any>; tint: string }[] = [
  { type: 'presentation', label: 'Presentation', icon: Presentation, tint: 'bg-coral-50 text-coral-600' },
  { type: 'video', label: 'Video', icon: Video, tint: 'bg-lav-50 text-lav-600' },
  { type: 'poll', label: 'Poll', icon: BarChart3, tint: 'bg-sky2-50 text-sky2-600' },
  { type: 'quiz', label: 'Quiz', icon: HelpCircle, tint: 'bg-bml-50 text-bml' },
  { type: 'wordcloud', label: 'Word cloud', icon: Cloud, tint: 'bg-teal-50 text-teal-600' },
  { type: 'case', label: 'Case study', icon: Briefcase, tint: 'bg-amber-50 text-amber-600' },
  { type: 'team', label: 'Team activity', icon: Users, tint: 'bg-lav-50 text-lav-600' },
  { type: 'discussion', label: 'Discussion', icon: MessagesSquare, tint: 'bg-sky2-50 text-sky2-600' },
  { type: 'feedback', label: 'Feedback', icon: Star, tint: 'bg-amber-50 text-amber-600' },
  { type: 'question', label: 'Open question', icon: MessageCircleQuestion, tint: 'bg-teal-50 text-teal-600' },
  { type: 'resource', label: 'Resource', icon: FileText, tint: 'bg-ink/5 text-ink-2' },
  { type: 'commitment', label: 'Commitment', icon: Target, tint: 'bg-bml-50 text-bml' },
];

export default function SessionBuilder() {
  const { db, update, toast } = useStore();
  const { session } = useTrainerContext();
  const [adding, setAdding] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  if (!session) return <><TrainerBar title="Session builder" /><EmptyState title="No sessions assigned" /></>;
  const blocks = db.blocks.filter((b) => b.sessionId === session.id);
  const total = blocks.reduce((a, b) => a + b.minutes, 0);
  const length = toMin(session.end) - toMin(session.start);

  const move = (id: string, dir: -1 | 1) => update((d) => {
    const ids = d.blocks.filter((b) => b.sessionId === session.id).map((b) => b.id);
    const i = ids.indexOf(id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const a = d.blocks.findIndex((b) => b.id === ids[i]); const b = d.blocks.findIndex((x) => x.id === ids[j]);
    [d.blocks[a], d.blocks[b]] = [d.blocks[b], d.blocks[a]];
  });
  const dropOn = (target: string) => {
    if (!drag || drag === target) return;
    update((d) => {
      const from = d.blocks.findIndex((b) => b.id === drag);
      const item = d.blocks.splice(from, 1)[0];
      const to = d.blocks.findIndex((b) => b.id === target);
      d.blocks.splice(to, 0, item);
    });
    setDrag(null);
  };
  const patch = (id: string, p: Partial<(typeof blocks)[number]>) => update((d) => { Object.assign(d.blocks.find((b) => b.id === id)!, p); });

  return (
    <div>
      <TrainerBar title="Session builder" subtitle="Plan your session as a sequence of content blocks. Drag or use the arrows to reorder." actions={<Button icon={<Plus size={16} />} onClick={() => setAdding(true)}>Add block</Button>} />
      <Card className={cx('mb-4 flex flex-wrap items-center gap-3 p-4', total > length ? 'bg-bml-50/60' : '')}>
        <div className="flex-1 text-sm"><b className="tabular-nums">{total} min</b> planned of <b className="tabular-nums">{length} min</b> available</div>
        {total > length ? <Badge tone="red" icon={<AlertTriangle size={12} />}>Over by {total - length} min</Badge> : <Badge tone="teal">{length - total} min buffer</Badge>}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink/5 sm:w-72">{blocks.map((b, i) => <div key={b.id} title={`${b.title} · ${b.minutes} min`} style={{ width: `${(b.minutes / Math.max(total, length)) * 100}%`, background: ['#B50928', '#7C5CFA', '#14B8A6', '#F5A524', '#3B82F6', '#FF6B4A'][i % 6] }} />)}</div>
      </Card>
      {blocks.length === 0 ? <EmptyState title="No blocks yet" body="Add a presentation, poll, quiz or activity to start building." action={<Button onClick={() => setAdding(true)} icon={<Plus size={16} />}>Add block</Button>} /> : (
        <ol className="space-y-2">
          {blocks.map((b, i) => {
            const def = BLOCKS.find((x) => x.type === b.type)!;
            const Icon = def.icon;
            return (
              <li key={b.id} draggable onDragStart={() => setDrag(b.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(b.id)} onDragEnd={() => setDrag(null)} className={cx('transition', drag === b.id && 'opacity-40')}>
                <Card className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                  <span className="cursor-grab text-ink-4" aria-hidden><GripVertical size={18} /></span>
                  <span className="w-6 text-center font-mono text-xs font-bold text-ink-3">{i + 1}</span>
                  <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', def.tint)}><Icon size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`blk-${b.id}`} className="sr-only">Block title</label>
                    <input id={`blk-${b.id}`} className="w-full rounded-lg bg-transparent px-2 py-1 font-semibold text-ink hover:bg-canvas focus:bg-canvas focus:outline-none" value={b.title} onChange={(e) => patch(b.id, { title: e.target.value })} />
                    <div className="px-2 text-xs text-ink-3">{def.label}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <label htmlFor={`min-${b.id}`} className="sr-only">Minutes</label>
                    <input id={`min-${b.id}`} type="number" min={1} max={180} className="h-10 w-16 rounded-lg bg-canvas px-2 text-center text-sm font-semibold tabular-nums" value={b.minutes} onChange={(e) => patch(b.id, { minutes: Math.max(1, Math.min(180, Number(e.target.value) || 1)) })} />
                    <span className="text-xs text-ink-3">min</span>
                  </div>
                  <button onClick={() => patch(b.id, { ready: !b.ready })} aria-pressed={b.ready} className={cx('flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold', b.ready ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700')}>{b.ready ? <CheckCircle2 size={15} /> : <CircleDashed size={15} />}{b.ready ? 'Ready' : 'Draft'}</button>
                  <div className="flex">
                    <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(b.id, -1)} icon={<ArrowUp size={15} />} />
                    <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === blocks.length - 1} onClick={() => move(b.id, 1)} icon={<ArrowDown size={15} />} />
                    <Button size="sm" variant="ghost" aria-label="Delete block" onClick={() => { update((d) => { d.blocks = d.blocks.filter((x) => x.id !== b.id); }); toast('Block removed'); }} icon={<Trash2 size={15} />} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a content block" wide>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BLOCKS.map((b) => (
            <button key={b.type} onClick={() => { update((d) => { d.blocks.push({ id: uid('b'), sessionId: session.id, type: b.type, title: b.label, minutes: 5, ready: false }); }); setAdding(false); toast(`${b.label} block added`); }} className="flex flex-col items-start gap-2 rounded-2xl p-4 text-left ring-1 ring-inset ring-ink/10 transition hover:-translate-y-0.5 hover:shadow-card hover:ring-lav-500">
              <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl', b.tint)}><b.icon size={19} /></span>
              <span className="text-sm font-bold">{b.label}</span>
            </button>
          ))}
        </div>
      </Modal>
      <p className="mt-4 text-xs text-ink-3">Changes save automatically in this browser. In production, content goes through organiser approval before participants see it.</p>
      <input className={cx(inputCls, 'hidden')} readOnly />
    </div>
  );
}

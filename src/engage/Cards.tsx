import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, ArrowRight } from 'lucide-react';
import { UPDATE_CARDS } from '../lib/content';
import { SEED_ACTIVITIES } from '../lib/seed';
import { Button, cx, DemoTag } from '../components/ui';

function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => { start.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (start.current === null) return;
      const dx = e.changedTouches[0].clientX - start.current;
      if (dx < -40) onLeft(); else if (dx > 40) onRight();
      start.current = null;
    },
  };
}

export function UpdateCards() {
  const [i, setI] = useState(0);
  const c = UPDATE_CARDS[i];
  const next = () => setI((x) => Math.min(UPDATE_CARDS.length - 1, x + 1));
  const prev = () => setI((x) => Math.max(0, x - 1));
  const swipe = useSwipe(next, prev);
  return (
    <div onKeyDown={(e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }}>
      <div {...swipe} className="anim-in relative overflow-hidden rounded-3xl bg-white p-5 shadow-card ring-1 ring-ink/5" key={c.id} tabIndex={0} aria-roledescription="card" aria-label={`Update ${i + 1} of ${UPDATE_CARDS.length}`}>
        <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wider text-lav-600">{c.category}</span><DemoTag>Placeholder</DemoTag></div>
        <h3 className="font-display text-xl font-extrabold text-ink">{c.title}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <div className="rounded-2xl bg-ink/[.04] p-4"><div className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-3">Before</div><p className="text-sm text-ink-2">{c.before}</p></div>
          <div className="hidden items-center text-ink-4 sm:flex"><ArrowRight /></div>
          <div className="rounded-2xl bg-teal-50 p-4"><div className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-700">After</div><p className="text-sm text-ink-2">{c.after}</p></div>
        </div>
        <div className="mt-3 rounded-2xl bg-amber-50 p-4"><div className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-700">Customer benefit</div><p className="text-sm text-ink-2">{c.benefit}</p></div>
        <p className="mt-3 text-xs text-ink-3">{c.check}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button size="sm" variant="secondary" onClick={prev} disabled={i === 0} icon={<ChevronLeft size={16} />}>Previous</Button>
        <div className="flex gap-1.5" aria-hidden>{UPDATE_CARDS.map((u, k) => <span key={u.id} className={cx('h-2 rounded-full transition-all', k === i ? 'w-6 bg-bml' : 'w-2 bg-ink/15')} />)}</div>
        <Button size="sm" variant="secondary" onClick={next} disabled={i === UPDATE_CARDS.length - 1}>Next <ChevronRight size={16} /></Button>
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">Swipe or use arrow keys. Product rates and current policies are intentionally not shown.</p>
    </div>
  );
}

export function Flashcards() {
  const cards = SEED_ACTIVITIES.filter((a) => a.type === 'quiz').flatMap((a) => a.questions);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const c = cards[i];
  const answer = c.options.find((o) => o.id === c.correct)?.text;
  const go = (d: number) => { setFlip(false); setI((x) => (x + d + cards.length) % cards.length); };
  const swipe = useSwipe(() => go(1), () => go(-1));
  return (
    <div>
      <button {...swipe} onClick={() => setFlip((f) => !f)} aria-label={flip ? 'Show question' : 'Show answer'} className={cx('flex min-h-[240px] w-full flex-col justify-between rounded-3xl p-6 text-left shadow-card transition', flip ? 'bg-teal-600 text-white' : 'mesh text-white')}>
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">{flip ? 'Answer' : `Card ${i + 1} of ${cards.length}`}</span>
        <span className="font-display text-xl font-extrabold leading-snug">{flip ? answer : c.text}</span>
        <span className="text-sm opacity-85">{flip ? c.explanation : 'Tap to reveal'}</span>
      </button>
      <div className="mt-3 flex items-center justify-between">
        <Button size="sm" variant="secondary" onClick={() => go(-1)} icon={<ChevronLeft size={16} />}>Previous</Button>
        <Button size="sm" variant="ghost" onClick={() => setFlip((f) => !f)} icon={<RotateCw size={15} />}>Flip</Button>
        <Button size="sm" variant="secondary" onClick={() => go(1)}>Next <ChevronRight size={16} /></Button>
      </div>
    </div>
  );
}

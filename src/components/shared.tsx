import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Coffee, Sparkles, Users, Download, Copy, Trophy, Search, Smartphone, Shield, HeartHandshake, Lock, GraduationCap, HelpCircle } from 'lucide-react';
import type { DB, Session, Slide, Team, Trainer } from '../lib/types';
import { Avatar, Badge, Button, cx, copyText, downloadText } from './ui';
import { durationLabel } from '../lib/time';
import { useStore } from '../lib/store';

export function trainerById(db: DB, id: string): Trainer | undefined { return db.trainers.find((t) => t.id === id); }

export function TrainerStack({ db, session, size = 28 }: { db: DB; session: Session; size?: number }) {
  const ts = session.trainerIds.map((id) => trainerById(db, id)).filter(Boolean) as Trainer[];
  if (!ts.length) return null;
  return (
    <div className="flex -space-x-2">
      {ts.slice(0, 3).map((t) => <Avatar key={t.id} name={t.name} color={t.color} size={size} ring />)}
    </div>
  );
}

export function KindIcon({ s, className }: { s: Session; className?: string }) {
  if (s.kind === 'break') return <Coffee className={className} size={18} />;
  if (s.kind === 'vendor') return <Sparkles className={className} size={18} />;
  return <span className={cx('font-mono text-sm font-bold', className)}>{s.code}</span>;
}

export function sessionTone(s: Session) {
  if (s.kind === 'break') return { bg: 'bg-ink/[.04]', chip: 'bg-white text-ink-3', bar: '#B4B0C4' };
  if (s.kind === 'vendor') return { bg: 'bg-amber-50', chip: 'bg-amber-100 text-amber-700', bar: '#F5A524' };
  return { bg: 'bg-white', chip: 'bg-bml-50 text-bml', bar: '#B50928' };
}

export function SessionMeta({ s }: { s: Session }) {
  return <span className="tabular-nums">{s.start}–{s.end} · {durationLabel(s.start, s.end)}</span>;
}

export function QR({ value, size = 220, className, dark = '#1B1530', light = '#FFFFFF' }: { value: string; size?: number; className?: string; dark?: string; light?: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark, light } }).then((s) => alive && setSvg(s)).catch(() => setSvg(''));
    return () => { alive = false; };
  }, [value, dark, light]);
  return <div role="img" aria-label="Attendance QR code" className={cx('[&>svg]:h-full [&>svg]:w-full', className)} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function WordCloud({ words, big = false }: { words: string[]; big?: boolean }) {
  const counts = useMemo(() => {
    const m = new Map<string, { w: string; n: number }>();
    words.forEach((w) => { const k = w.trim().toLowerCase(); if (!k) return; const cur = m.get(k); if (cur) cur.n++; else m.set(k, { w: w.trim(), n: 1 }); });
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 40);
  }, [words]);
  const max = Math.max(1, ...counts.map((c) => c.n));
  const colors = ['#B50928', '#5B3FD9', '#0E9384', '#E8502F', '#D98A0B', '#2563EB', '#9333EA'];
  // Interleave large and small words for a balanced cloud.
  const ordered = counts.map((c, i) => ({ ...c, i })).sort((a, b) => (a.i % 2) - (b.i % 2) || (a.i % 2 ? b.i - a.i : a.i - b.i));
  if (!counts.length) return <div className={cx('text-center text-ink-3', big && 'text-3xl text-white/60')}>Waiting for the first words…</div>;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {ordered.map((c) => {
        const scale = 0.35 + (c.n / max) * 0.65;
        return (
          <span key={c.w} className="anim-pop font-display font-extrabold leading-tight" style={{ fontSize: `${(big ? 5.2 : 2.3) * scale}rem`, color: colors[c.i % colors.length], opacity: 0.6 + scale * 0.4 }} title={`${c.w}: ${c.n}`}>
            {c.w}
          </span>
        );
      })}
    </div>
  );
}

const VISUALS: Record<string, React.ComponentType<any>> = { search: Search, smartphone: Smartphone, shield: Shield, 'heart-handshake': HeartHandshake, lock: Lock, 'graduation-cap': GraduationCap };
export function QuestionVisual({ name, size = 28, className }: { name?: string; size?: number; className?: string }) {
  const I = (name && VISUALS[name]) || HelpCircle;
  return <I size={size} className={className} />;
}

export function SlideView({ slide, index, total, className, compact }: { slide: Slide; index?: number; total?: number; className?: string; compact?: boolean }) {
  const a = slide.accent;
  return (
    <div className={cx('relative aspect-video w-full max-w-full overflow-hidden rounded-xl bg-white', className)} style={{ containerType: 'inline-size' } as React.CSSProperties}>
      {slide.image ? (
        <img src={slide.image} alt={slide.title} className="h-full w-full object-contain bg-black" />
      ) : (
        <div className="absolute inset-0 flex flex-col p-[6cqw]" style={{ background: slide.layout === 'title' || slide.layout === 'activity' ? `linear-gradient(135deg, ${a}, ${a}dd 55%, #1B1530)` : '#fff' }}>
          <div className="absolute right-[-8cqw] top-[-12cqw] h-[40cqw] w-[40cqw] rounded-full opacity-10" style={{ background: a }} />
          {slide.layout === 'title' && (
            <div className="my-auto text-white">
              <div className="mb-[1.5cqw] text-[1.6cqw] font-bold uppercase tracking-[.2em] opacity-80">BML Refresher · Learn. Connect. Transform.</div>
              <div className="font-display text-[5.6cqw] font-extrabold leading-[1.05] [text-wrap:balance]">{slide.title}</div>
              {slide.subtitle && <div className="mt-[2cqw] text-[2cqw] opacity-85">{slide.subtitle}</div>}
            </div>
          )}
          {slide.layout === 'bullets' && (
            <>
              <div className="font-display text-[4cqw] font-extrabold text-ink" style={{ color: a }}>{slide.title}</div>
              <ul className="mt-[3cqw] space-y-[1.6cqw]">
                {slide.bullets.map((b, i) => <li key={i} className="flex gap-[1.5cqw] text-[2.5cqw] text-ink"><span className="mt-[1cqw] h-[1.2cqw] w-[1.2cqw] shrink-0 rounded-full" style={{ background: a }} />{b}</li>)}
              </ul>
            </>
          )}
          {slide.layout === 'statement' && (
            <div className="my-auto">
              <div className="h-[0.8cqw] w-[10cqw] rounded-full" style={{ background: a }} />
              <div className="mt-[2.5cqw] font-display text-[5cqw] font-extrabold leading-tight text-ink [text-wrap:balance]">{slide.title}</div>
              {slide.subtitle && <div className="mt-[1.5cqw] text-[2.2cqw] text-ink-3">{slide.subtitle}</div>}
            </div>
          )}
          {slide.layout === 'activity' && (
            <div className="my-auto text-center text-white">
              <div className="mx-auto mb-[2cqw] flex h-[10cqw] w-[10cqw] items-center justify-center rounded-[2.5cqw] bg-white/15"><Sparkles style={{ width: '5cqw', height: '5cqw' }} /></div>
              <div className="font-display text-[5cqw] font-extrabold">{slide.title}</div>
              {slide.subtitle && <div className="mt-[1cqw] text-[2.2cqw] opacity-85">{slide.subtitle}</div>}
            </div>
          )}
          {typeof index === 'number' && <div className={cx('absolute bottom-[2.5cqw] right-[3cqw] font-mono text-[1.4cqw] font-bold', slide.layout === 'title' || slide.layout === 'activity' ? 'text-white/70' : 'text-ink-3')}>{index + 1}{total ? ` / ${total}` : ''}</div>}
        </div>
      )}
    </div>
  );
}

export function TeamChip({ team, className }: { team?: Team | null; className?: string }) {
  if (!team) return <Badge tone="ink">No team yet</Badge>;
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold', className)} style={{ background: team.tint, color: team.color }}><span className="h-2 w-2 rounded-full" style={{ background: team.color }} />{team.name}</span>;
}

export function Leaderboard({ rows, big = false }: { rows: (Team & { points: number })[]; big?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.points));
  return (
    <ol className={cx('space-y-2', big && 'space-y-4')}>
      {rows.map((t, i) => (
        <li key={t.id} className={cx('flex items-center gap-3', big && 'gap-6')}>
          <span className={cx('flex shrink-0 items-center justify-center rounded-full font-display font-extrabold', big ? 'h-16 w-16 text-3xl' : 'h-8 w-8 text-sm', i === 0 ? 'bg-amber-500 text-white' : big ? 'bg-white/10 text-white' : 'bg-ink/5 text-ink-2')}>{i === 0 ? <Trophy size={big ? 30 : 16} /> : i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className={cx('flex items-center justify-between gap-2 font-display font-bold', big ? 'text-4xl text-white' : 'text-sm text-ink')}>
              <span>{t.name}</span><span className="tabular-nums">{t.points.toLocaleString()}</span>
            </div>
            <div className={cx('mt-1 overflow-hidden rounded-full', big ? 'h-4 bg-white/10' : 'h-2 bg-ink/5')}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(t.points / max) * 100}%`, background: t.color }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Export control: tries a file download and always offers copy-to-clipboard, since some embedded viewers block downloads. */
export function ExportButtons({ filename, getText, label = 'Export CSV', mime }: { filename: string; getText: () => string; label?: string; mime?: string }) {
  const { toast } = useStore();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" icon={<Download size={15} />} onClick={() => { const ok = downloadText(filename, getText(), mime); toast(ok ? `Download started: ${filename}. If nothing appears, your viewer blocks downloads; use Copy.` : 'Download blocked here. Use Copy instead.', ok ? 'info' : 'warn'); }}>{label}</Button>
      <Button size="sm" variant="ghost" icon={<Copy size={15} />} onClick={async () => { const ok = await copyText(getText()); toast(ok ? 'Copied to clipboard' : 'Clipboard unavailable in this viewer', ok ? 'ok' : 'warn'); }}>Copy</Button>
    </div>
  );
}

export function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; c: string; d: number; r: number }[]>([]);
  useEffect(() => {
    if (!trigger) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#B50928', '#7C5CFA', '#14B8A6', '#F5A524', '#FF6B4A', '#3B82F6'];
    const ps = Array.from({ length: 70 }, (_, i) => ({ id: trigger * 1000 + i, x: Math.random() * 100, c: colors[i % colors.length], d: Math.random() * 0.6, r: Math.random() * 360 }));
    setPieces(ps);
    const t = setTimeout(() => setPieces([]), 2600);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!pieces.length) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {pieces.map((p) => <span key={p.id} className="confetti" style={{ left: `${p.x}%`, background: p.c, animationDelay: `${p.d}s`, transform: `rotate(${p.r}deg)` }} />)}
    </div>
  );
}

export function PhotoTile({ hue, dataUrl, caption, className }: { hue: number; dataUrl: string | null; caption: string; className?: string }) {
  return (
    <div className={cx('relative aspect-[4/3] overflow-hidden rounded-xl', className)} style={{ background: dataUrl ? '#000' : `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 50) % 360} 75% 45%))` }}>
      {dataUrl ? <img src={dataUrl} alt={caption} className="h-full w-full object-cover" /> : (
        <div className="absolute inset-0 flex items-center justify-center text-white/70"><Users size={36} /><span className="sr-only">Placeholder photo</span></div>
      )}
    </div>
  );
}

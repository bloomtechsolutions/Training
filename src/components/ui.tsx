import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Star, Inbox, AlertTriangle, Loader2 } from 'lucide-react';

export function cx(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(' '); }

type Tone = 'red' | 'lav' | 'teal' | 'amber' | 'coral' | 'sky' | 'ink' | 'green';
const TONES: Record<Tone, string> = {
  red: 'bg-bml-50 text-bml-700 ring-bml-100',
  lav: 'bg-lav-50 text-lav-700 ring-lav-100',
  teal: 'bg-teal-50 text-teal-700 ring-teal-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  coral: 'bg-coral-50 text-coral-600 ring-coral-100',
  sky: 'bg-sky2-50 text-sky2-600 ring-sky2-100',
  ink: 'bg-ink/5 text-ink-2 ring-ink/10',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

export function Badge({ tone = 'ink', children, className, icon }: { tone?: Tone; children: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', TONES[tone], className)}>{icon}{children}</span>;
}

export function DemoTag({ children = 'Demo data', className }: { children?: React.ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center rounded-md border border-dashed border-amber-500/70 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700', className)}>{children}</span>;
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'dark';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-bml text-white hover:bg-bml-700 shadow-sm shadow-bml/30',
  secondary: 'bg-white text-ink ring-1 ring-inset ring-ink/10 hover:bg-canvas',
  ghost: 'text-ink-2 hover:bg-ink/5',
  soft: 'bg-lav-50 text-lav-700 hover:bg-lav-100',
  danger: 'bg-white text-bml-700 ring-1 ring-inset ring-bml-200 hover:bg-bml-50',
  dark: 'bg-ink text-white hover:bg-ink-2',
};
export function Button({ variant = 'primary', size = 'md', className, icon, children, disabledReason, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: React.ReactNode; disabledReason?: string }) {
  const sz = size === 'sm' ? 'h-9 px-3 text-sm gap-1.5' : size === 'lg' ? 'h-13 min-h-[3.25rem] px-6 text-base gap-2' : 'h-11 px-4 text-sm gap-2';
  return (
    <button
      {...rest}
      title={rest.disabled && disabledReason ? disabledReason : rest.title}
      aria-disabled={rest.disabled || undefined}
      className={cx('inline-flex select-none items-center justify-center rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100', sz, BTN[variant], className)}
    >
      {icon}{children}
    </button>
  );
}

export function IconButton({ label, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} {...rest} className={cx('inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 transition hover:bg-ink/5 disabled:opacity-40', className)}>{children}</button>;
}

export function Card({ className, children, as: As = 'div', ...rest }: React.HTMLAttributes<HTMLDivElement> & { as?: any }) {
  return <As {...rest} className={cx('rounded-2xl bg-white shadow-card ring-1 ring-ink/[.05]', className)}>{children}</As>;
}

export function SectionTitle({ title, eyebrow, action, className }: { title: React.ReactNode; eyebrow?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-0.5 text-[11px] font-bold uppercase tracking-[.12em] text-ink-3">{eyebrow}</div>}
        <h2 className="font-display text-lg font-bold leading-tight text-ink [text-wrap:balance]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[11px] font-bold uppercase tracking-[.14em] text-bml">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-[1.9rem] [text-wrap:balance]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function initials(name: string) {
  const parts = name.replace(/[^A-Za-z\s/]/g, '').split(/[\s/]+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, color = '#5B3FD9', size = 40, className, ring }: { name: string; color?: string; size?: number; className?: string; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white', ring && 'ring-2 ring-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
    >
      {initials(name)}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,textarea,select,button:not([data-close])')?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button,input,textarea,select,a[href],[tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute('disabled'));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx('anim-sheet flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between gap-3 border-b border-ink/5 px-5 py-4">
          <h2 id={titleId} className="font-display text-lg font-bold text-ink">{title}</h2>
          <IconButton label="Close" data-close onClick={onClose}><X size={20} /></IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink/5 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className, size = 'md' }: { tabs: { id: T; label: React.ReactNode; badge?: React.ReactNode }[]; value: T; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="tablist" className={cx('inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-ink/[.05] p-1 no-scrollbar', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx('flex shrink-0 items-center gap-1.5 rounded-xl font-semibold transition', size === 'sm' ? 'h-9 px-3 text-xs' : 'h-10 px-4 text-sm', value === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-3 hover:text-ink')}
        >
          {t.label}{t.badge}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, action, className }: { icon?: React.ReactNode; title: string; body?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/10 px-6 py-10 text-center', className)}>
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-lav-50 text-lav-600">{icon ?? <Inbox size={26} />}</div>
      <div className="font-display text-base font-bold text-ink">{title}</div>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-3">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', body, action }: { title?: string; body?: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl bg-bml-50 px-6 py-8 text-center">
      <AlertTriangle className="mb-2 text-bml" />
      <div className="font-display font-bold text-ink">{title}</div>
      {body && <p className="mt-1 text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <span role="status" className="inline-flex items-center gap-2 text-sm text-ink-3"><Loader2 className="animate-spin" size={16} />{label}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-ink/[.06]', className)} />;
}

export function Stars({ value, onChange, label, size = 30 }: { value: number; onChange?: (v: number) => void; label: string; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role={onChange ? 'radiogroup' : 'img'} aria-label={onChange ? label : `${label}: ${value} of 5`} className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => onChange ? (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="rounded-lg p-1 transition hover:scale-110"
        >
          <Star size={size} className={n <= shown ? 'fill-amber-500 text-amber-500' : 'text-ink-4'} strokeWidth={1.6} />
        </button>
      ) : (
        <Star key={n} size={size} className={n <= Math.round(shown) ? 'fill-amber-500 text-amber-500' : 'text-ink-4'} strokeWidth={1.6} />
      ))}
    </div>
  );
}

export function Progress({ value, className, color = 'bg-bml', label }: { value: number; className?: string; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-ink/[.07]', className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = '#B50928', children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(27,21,48,.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-2">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-bml">{error}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border-0 bg-canvas px-3.5 py-2.5 text-sm text-ink ring-1 ring-inset ring-ink/10 placeholder:text-ink-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lav-500';

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl py-2 text-left">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-3">{description}</span>}
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-teal-500' : 'bg-ink/15')}>
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  );
}

export function Stat({ label, value, sub, icon, tone = 'lav', demo }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; tone?: Tone; demo?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-ink-3">{label}</div>
        {icon && <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset', TONES[tone])}>{icon}</span>}
      </div>
      <div className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink">{value}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">{sub}{demo && <DemoTag>Demo</DemoTag>}</div>
    </Card>
  );
}

export function Bars({ data, max, color = '#5B3FD9', suffix = '', height = 140 }: { data: { label: string; value: number; color?: string }[]; max?: number; color?: string; suffix?: string; height?: number }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="text-[11px] font-bold tabular-nums text-ink-2">{Number.isInteger(d.value) ? d.value : d.value.toFixed(1)}{suffix}</div>
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-lg transition-all duration-700" style={{ height: `${(d.value / m) * 100}%`, minHeight: 3, background: d.color ?? color }} />
          </div>
          <div className="w-full truncate text-center text-[10px] font-semibold text-ink-3" title={d.label}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function HBar({ label, value, max, color = '#5B3FD9', right }: { label: React.ReactNode; value: number; max: number; color?: string; right?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate font-medium text-ink">{label}</span><span className="shrink-0 font-semibold tabular-nums text-ink-2">{right ?? value}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink/[.06]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} /></div>
    </div>
  );
}

/** Download helper. Some embedded viewers block downloads; callers should also offer copy. */
export function downloadText(filename: string, text: string, mime = 'text/csv') {
  try {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch { return false; }
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows.map((r) => r.map((v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}

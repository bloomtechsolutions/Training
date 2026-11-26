import React, { useState } from 'react';
import { LogIn, CalendarDays, Monitor, Database, AlertTriangle, UserRound, Presentation, Crown, Loader2, ArrowLeft } from 'lucide-react';
import { useStore, api, type Actor } from '../lib/store';
import PublicAgenda from '../public/PublicAgenda';
import { Button, Field, inputCls, cx } from '../components/ui';

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl mesh font-display text-xl font-extrabold text-white shadow-lg shadow-bml/30">R</div>
      <div className="leading-tight">
        <div className={cx('font-display text-xl font-extrabold tracking-tight', dark ? 'text-white' : 'text-ink')}>BML Refresher</div>
        <div className={cx('text-[11px] font-semibold uppercase tracking-[.16em]', dark ? 'text-white/70' : 'text-ink-3')}>Learn. Connect. Transform.</div>
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative overflow-hidden mesh grain px-6 py-10 text-white lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:px-12 lg:py-14">
        <Brand dark />
        <div className="mt-10 hidden lg:block">
          <h1 className="font-display text-5xl font-extrabold leading-[1.02]">Two days to align, connect, learn and transform.</h1>
          <p className="mt-4 max-w-md text-white/80">Regional refresher training for a Digital-First, Sales-Driven and Customer-Centric team.</p>
        </div>
        <a href="/#agenda" className="mt-8 inline-flex w-fit items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"><CalendarDays size={18} /> View the programme</a>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

export function SignInForm({ card = false }: { card?: boolean }) {
  const { signIn, demoMode } = useStore();
  const [login, setLogin] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy('form');
    try { const r = await api<{ actor: Actor }>('auth/login', { login, code }); await signIn(r.actor); } catch (err) { setError((err as Error).message); } finally { setBusy(null); }
  };
  const demo = async (role: string, id?: string) => {
    setError(''); setBusy(role);
    try { const r = await api<{ actor: Actor }>('auth/demo', { role, id }); await signIn(r.actor); } catch (err) { setError((err as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className={cx(card && 'rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink/[.05]')}>
      <h2 className={cx('font-display font-extrabold tracking-tight text-ink', card ? 'text-2xl' : 'text-3xl')}>Sign in</h2>
      <p className="mt-1 text-sm text-ink-3">Use your staff ID and the access code from the event organisers.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field label="Staff ID or sign-in name" htmlFor="login"><input id="login" autoComplete="username" autoCapitalize="none" className={cx(inputCls, 'h-12 text-base')} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="e.g. D1001" required /></Field>
        <Field label="Access code" htmlFor="code"><input id="code" type="password" autoComplete="current-password" className={cx(inputCls, 'h-12 text-base tracking-widest')} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC-123" required /></Field>
        {error && <div role="alert" className="flex items-start gap-2 rounded-xl bg-bml-50 p-3 text-sm font-medium text-bml-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}
        <Button type="submit" size="lg" className="w-full" disabled={!!busy} icon={busy === 'form' ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}>Sign in</Button>
      </form>
      <p className="mt-3 text-xs text-ink-3">Lost your code? Ask an organiser to issue a new one. Corporate single sign-on is planned.</p>

      {demoMode && (
        <div className="mt-6 rounded-2xl border border-dashed border-amber-500/60 bg-amber-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Demo sign-in</div>
          <p className="mt-0.5 text-xs text-amber-800">Demo mode is on. Try the app as a fictional person. Organisers sign in with the admin password.</p>
          <div className={cx('mt-3 grid gap-2', card ? 'grid-cols-3 lg:grid-cols-1 xl:grid-cols-1' : 'sm:grid-cols-3')}>
            <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => demo('participant', 'u01')} icon={<UserRound size={15} />}>Participant</Button>
            <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => demo('trainer', 't-zima')} icon={<Presentation size={15} />}>Trainer</Button>
            <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => demo('leadership')} icon={<Crown size={15} />}>Leadership</Button>
          </div>
        </div>
      )}
      <a href="/#venue" className="mt-5 flex items-center gap-2 text-sm font-semibold text-lav-600 hover:text-lav-700"><Monitor size={16} /> Setting up the venue screen? Use a display code</a>
    </div>
  );
}

export function VenueLogin() {
  const { signIn } = useStore();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#12091F] px-4">
      <form className="w-full max-w-md rounded-3xl bg-white/[.06] p-8 text-white ring-1 ring-white/10" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try { const r = await api<{ actor: Actor }>('auth/venue', { code }); await signIn(r.actor); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
      }}>
        <Brand dark />
        <h1 className="mt-8 font-display text-3xl font-extrabold">Venue screen</h1>
        <p className="mt-1 text-sm text-white/70">Enter the display code from Refresher 360 → Venue screen. Organisers and trainers who are signed in on this computer can open the screen directly.</p>
        <label htmlFor="vcode" className="mt-6 block text-xs font-semibold text-white/70">Display code</label>
        <input id="vcode" className="mt-1 h-14 w-full rounded-xl bg-white/10 px-4 text-center font-mono text-2xl font-bold tracking-[.3em] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-lav-500" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC-123" autoFocus />
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-coral-500">{error}</p>}
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy || code.replace(/[^A-Z0-9]/gi, '').length < 6}>{busy ? 'Connecting…' : 'Show venue screen'}</Button>
        <a href="/" className="mt-4 flex items-center justify-center gap-1.5 text-sm text-white/60 hover:text-white"><ArrowLeft size={14} /> Back to sign-in</a>
      </form>
    </div>
  );
}

export function SetupScreen({ message, error }: { message: string; error?: boolean }) {
  return (
    <Frame>
      <span className={cx('mb-4 flex h-12 w-12 items-center justify-center rounded-2xl', error ? 'bg-bml-50 text-bml' : 'bg-lav-50 text-lav-600')}>{error ? <AlertTriangle /> : <Database />}</span>
      <h2 className="font-display text-2xl font-extrabold text-ink">{error ? 'We can’t reach the server' : 'Connect the database'}</h2>
      <p className="mt-2 text-sm text-ink-2">{message || 'The app is deployed but has no database yet.'}</p>
      {!error && (
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ink-2">
          <li>In Vercel, open this project and go to <b>Storage</b>.</li>
          <li>Create or connect a <b>Prisma Postgres</b> database (it adds <code>DATABASE_URL</code>).</li>
          <li>Add <code>ADMIN_PASSWORD</code> under Settings → Environment Variables.</li>
          <li>Redeploy. Tables and the November event are created automatically on first use.</li>
        </ol>
      )}
      <Button className="mt-6" onClick={() => window.location.reload()}>Try again</Button>
    </Frame>
  );
}

export function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4" aria-busy="true">
      <Brand />
      <Loader2 className="animate-spin text-ink-3" />
    </div>
  );
}

/** Signed-out home: the programme first, sign-in alongside (desktop) or below (phone). */
export function Landing() {
  return <PublicAgenda aside={<SignInForm card />} />;
}

/** Full-page sign-in (kept for direct use). */
export function Login() {
  return <Frame><SignInForm /></Frame>;
}

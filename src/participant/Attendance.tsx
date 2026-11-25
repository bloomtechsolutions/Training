import React, { useEffect, useState } from 'react';
import { QrCode, ScanLine, CheckCircle2, LogOut, AlertTriangle, Clock, WifiOff, Info, Keyboard } from 'lucide-react';
import { useStore, useNow, useEvent, useSessions, qrPayload, validateQr, uid, audit, useTick } from '../lib/store';
import { Badge, Button, Card, PageHeader, Modal, cx, EmptyState, inputCls, DemoTag } from '../components/ui';
import { QR, SessionMeta } from '../components/shared';
import { formatClock, sessionStart, sessionEnd, sessionStatus, formatDay } from '../lib/time';
import type { Session } from '../lib/types';

const LATE_AFTER_MIN = 10;
const OPENS_BEFORE_MIN = 15;

export default function Attendance() {
  const { db, me, update, toast, online, celebrate } = useStore();
  const ev = useEvent();
  const now = useNow();
  const real = useTick(1000);
  const sessions = useSessions().filter((s) => s.kind !== 'break');
  const [scan, setScan] = useState<Session | null>(null);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'aim' | 'reading' | 'done'>('aim');

  const windowOpen = (s: Session) => now >= sessionStart(ev, s) - OPENS_BEFORE_MIN * 60000 && now < sessionEnd(ev, s);
  const openNow = sessions.filter(windowOpen);
  const rec = (s: Session) => db.attendance.find((a) => a.userId === me.id && a.sessionId === s.id);

  useEffect(() => { if (!scan) { setPhase('aim'); setError(''); setManual(''); } }, [scan]);

  const checkIn = (s: Session, payload: string) => {
    const v = validateQr(payload, real);
    if (!v.ok) { setError(v.reason!); return; }
    if (v.sessionId !== s.id || v.eventId !== ev.id) { setError('This code belongs to a different session. Scan the code for the session in this room.'); return; }
    if (rec(s)) { setError('You are already checked in to this session.'); return; }
    const late = now > sessionStart(ev, s) + LATE_AFTER_MIN * 60000;
    update((d) => {
      // Duplicate protection: one record per user per session.
      if (d.attendance.some((a) => a.userId === me.id && a.sessionId === s.id)) return;
      d.attendance.push({ id: uid('att'), eventId: ev.id, sessionId: s.id, userId: me.id, checkIn: now, checkOut: null, late, method: online ? 'qr' : 'offline', status: late ? 'late' : 'present' });
      if (!online) audit(d, me.name, 'attendance.offline', `Offline check-in captured for ${s.title}; needs organiser validation`);
    });
    setPhase('done');
    celebrate();
    toast(late ? 'Checked in · marked late' : 'Checked in. Welcome!');
  };

  const simulate = (s: Session) => {
    setPhase('reading');
    setTimeout(() => checkIn(s, qrPayload(ev.id, s.id, Date.now())), 900);
  };

  return (
    <div>
      <PageHeader eyebrow="Attendance" title="Check in" subtitle="Scan the QR code on the venue screen at the start of each session. Codes refresh every 30 seconds." />
      <Card className="mb-5 flex items-start gap-3 bg-amber-50/60 p-4 ring-amber-100">
        <Info className="mt-0.5 shrink-0 text-amber-600" size={18} />
        <p className="text-sm text-ink-2"><b>Demo check-in.</b> This prototype cannot use your camera or a server, so scanning is simulated: it reads the code the venue screen is showing right now and validates it locally. In production, check-in uses corporate sign-in, server-side validation and organiser checks, because a QR code alone does not prove someone is in the room.</p>
      </Card>

      <h2 className="mb-3 font-display text-lg font-bold">Open for check-in</h2>
      {openNow.length === 0 ? (
        <EmptyState icon={<Clock />} title="No check-in window open" body={`Check-in opens ${OPENS_BEFORE_MIN} minutes before each session. Use the demo clock (top right) to jump to a live session.`} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {openNow.map((s) => {
            const r = rec(s);
            const st = sessionStatus(ev, s, now);
            return (
              <Card key={s.id} className={cx('p-5', !r && 'ring-2 ring-teal-500/30')}>
                <div className="mb-2 flex flex-wrap items-center gap-2">{s.code && <Badge tone="red">Session {s.code}</Badge>}{s.kind === 'vendor' && <Badge tone="amber">Vendor activity</Badge>}<Badge tone={st === 'live' ? 'red' : 'lav'}>{st === 'live' ? 'In progress' : 'Starting soon'}</Badge></div>
                <h3 className="font-display text-lg font-bold">{s.title}</h3>
                <div className="text-sm text-ink-3"><SessionMeta s={s} /></div>
                {r ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge tone="green" icon={<CheckCircle2 size={13} />} className="px-3 py-1.5 text-xs">Checked in {formatClock(r.checkIn)}{r.late ? ' · late' : ''}</Badge>
                    {s.kind === 'vendor' && !r.checkOut && <Button size="sm" variant="secondary" icon={<LogOut size={15} />} onClick={() => { update((d) => { const x = d.attendance.find((a) => a.id === r.id); if (x) x.checkOut = now; }); toast('Checked out'); }}>Check out</Button>}
                    {r.checkOut && <Badge tone="ink">Checked out {formatClock(r.checkOut)}</Badge>}
                  </div>
                ) : (
                  <Button className="mt-4 w-full" size="lg" onClick={() => setScan(s)} icon={<ScanLine size={20} />}>Scan QR to check in</Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-8 font-display text-lg font-bold">My attendance history</h2>
      <Card className="divide-y divide-ink/5">
        {sessions.map((s) => {
          const r = rec(s);
          const st = sessionStatus(ev, s, now);
          return (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold', s.kind === 'vendor' ? 'bg-amber-50 text-amber-700' : 'bg-bml-50 text-bml')}>{s.code ?? 'EA'}</span>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{s.title}</div><div className="text-xs text-ink-3">{formatDay(ev.days[s.day - 1].date)} · {s.start}–{s.end}</div></div>
              {r ? <Badge tone={r.late ? 'amber' : 'green'}>{r.late ? 'Late' : 'Present'} · {formatClock(r.checkIn)}{r.method === 'offline' ? ' · offline' : r.method === 'manual' ? ' · corrected' : ''}</Badge>
                : st === 'done' ? <Badge tone="ink">Not recorded</Badge> : <Badge tone="lav">Upcoming</Badge>}
            </div>
          );
        })}
      </Card>
      <p className="mt-2 text-xs text-ink-3">Missing a check-in? Ask an organiser. Corrections are recorded with a reason in the audit log.</p>

      <Modal open={!!scan} onClose={() => setScan(null)} title={phase === 'done' ? 'You’re checked in' : 'Scan attendance code'}>
        {scan && (phase === 'done' ? (
          <div className="py-4 text-center">
            <div className="anim-pop mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-teal-500 text-white"><CheckCircle2 size={44} /></div>
            <div className="font-display text-xl font-bold">{scan.title}</div>
            <p className="text-sm text-ink-3">Checked in at {formatClock(now)}. Enjoy the session!</p>
            <Button className="mt-5" onClick={() => setScan(null)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!online && <div className="flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white"><WifiOff size={14} /> Offline: your check-in will be stored as an exception for organisers to validate.</div>}
            <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-3xl bg-ink p-8">
              <div className={cx('transition', phase === 'reading' && 'scale-95 opacity-80')}><QR value={qrPayload(ev.id, scan.id, real)} size={236} className="mx-auto rounded-xl bg-white p-2" /></div>
              <div className="pointer-events-none absolute inset-6 rounded-2xl border-[3px] border-dashed border-teal-500/80" />
              {phase === 'reading' && <div className="absolute inset-x-6 top-1/2 h-1 animate-pulse rounded-full bg-teal-500 shadow-[0_0_20px_#14B8A6]" />}
              <div className="absolute bottom-2 left-0 right-0 text-center"><DemoTag>Simulated camera view</DemoTag></div>
            </div>
            <p className="text-center text-sm text-ink-3">The demo “camera” shows the code currently on the venue screen.</p>
            {error && <div role="alert" className="flex items-start gap-2 rounded-xl bg-bml-50 p-3 text-sm text-bml-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}
            <Button className="w-full" size="lg" disabled={phase === 'reading'} onClick={() => { setError(''); simulate(scan); }} icon={<ScanLine size={20} />}>{phase === 'reading' ? 'Reading code…' : 'Simulate scan'}</Button>
            <details className="rounded-xl bg-canvas p-3">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-2"><Keyboard size={15} /> Enter the code shown under the venue QR</summary>
              <div className="mt-3 flex gap-2">
                <label htmlFor="manual-code" className="sr-only">Code</label>
                <input id="manual-code" className={inputCls} value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="e.g. 4K2Q9ZA" maxLength={7} />
                <Button disabled={manual.length < 7} disabledReason="Codes are 7 characters" onClick={() => { setError(''); checkIn(scan, `BMLR1:${ev.id}:${scan.id}:${manual}`); }}>Check in</Button>
              </div>
              <p className="mt-2 text-xs text-ink-3">Try an old or wrong code to see expiry and duplicate protection.</p>
            </details>
          </div>
        ))}
      </Modal>
    </div>
  );
}

export { QrCode };

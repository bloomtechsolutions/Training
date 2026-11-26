import React, { useEffect, useState } from 'react';
import { ScanLine, CheckCircle2, LogOut, AlertTriangle, Clock, Info, Keyboard, Camera } from 'lucide-react';
import { useStore, useNow, useEvent, useSessions, api } from '../lib/store';
import { Badge, Button, Card, PageHeader, Modal, cx, EmptyState, inputCls, DemoTag } from '../components/ui';
import { SessionMeta } from '../components/shared';
import { formatClock, sessionStart, sessionEnd, sessionStatus, formatDay } from '../lib/time';
import type { AttendanceRecord, Session } from '../lib/types';

const OPENS_BEFORE_MIN = 15;

export default function Attendance() {
  const { db, me, update, toast, applyRemote, celebrate, demoMode } = useStore();
  const ev = useEvent();
  const now = useNow();
  const sessions = useSessions().filter((s) => s.kind !== 'break');
  const [scan, setScan] = useState<Session | null>(null);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'aim' | 'reading' | 'done'>('aim');
  const [result, setResult] = useState<AttendanceRecord | null>(null);

  const windowOpen = (s: Session) => now >= sessionStart(ev, s) - OPENS_BEFORE_MIN * 60000 && now < sessionEnd(ev, s);
  const openNow = sessions.filter(windowOpen);
  const rec = (s: Session) => db.attendance.find((a) => a.userId === me.id && a.sessionId === s.id);

  useEffect(() => { if (!scan) { setPhase('aim'); setError(''); setManual(''); setResult(null); } }, [scan]);

  const checkIn = async (s: Session, body: Record<string, unknown>) => {
    setError(''); setPhase('reading');
    try {
      const r = await api<{ record: AttendanceRecord; late: boolean }>('checkin', { eventId: ev.id, sessionId: s.id, ...body });
      applyRemote([{ c: 'attendance', k: r.record.id, v: r.record }]);
      setResult(r.record); setPhase('done'); celebrate();
      toast(r.late ? 'Checked in · marked late' : 'Checked in. Welcome!');
    } catch (e) { setError((e as Error).message); setPhase('aim'); }
  };

  return (
    <div>
      <PageHeader eyebrow="Attendance" title="Check in" subtitle="Scan the QR code on the venue screen with your phone camera at the start of each session, or type the code shown under it." />
      <Card className="mb-5 flex items-start gap-3 bg-lav-50/60 p-4 ring-lav-100">
        <Info className="mt-0.5 shrink-0 text-lav-600" size={18} />
        <p className="text-sm text-ink-2">Codes change every 30 seconds and are checked by the server, so each check-in is linked to your account and the session in the room. Organisers may also confirm attendance in person.</p>
      </Card>

      <h2 className="mb-3 font-display text-lg font-bold">Open for check-in</h2>
      {openNow.length === 0 ? (
        <EmptyState icon={<Clock />} title="No check-in window open" body={`Check-in opens ${OPENS_BEFORE_MIN} minutes before each session and closes when it ends.`} />
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
                    {s.kind === 'vendor' && !r.checkOut && <Button size="sm" variant="secondary" icon={<LogOut size={15} />} onClick={() => { update((d) => { const x = d.attendance.find((a) => a.id === r.id); if (x) x.checkOut = Date.now(); }); toast('Checked out'); }}>Check out</Button>}
                    {r.checkOut && <Badge tone="ink">Checked out {formatClock(r.checkOut)}</Badge>}
                  </div>
                ) : (
                  <Button className="mt-4 w-full" size="lg" onClick={() => setScan(s)} icon={<ScanLine size={20} />}>Check in</Button>
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
              {r ? <Badge tone={r.late ? 'amber' : 'green'}>{r.late ? 'Late' : 'Present'} · {formatClock(r.checkIn)}{r.method === 'manual' ? ' · confirmed' : ''}</Badge>
                : st === 'done' ? <Badge tone="ink">Not recorded</Badge> : <Badge tone="lav">Upcoming</Badge>}
            </div>
          );
        })}
      </Card>
      <p className="mt-2 text-xs text-ink-3">Missing a check-in? Ask an organiser. Corrections are recorded with a reason in the audit log.</p>

      <Modal open={!!scan} onClose={() => setScan(null)} title={phase === 'done' ? 'You’re checked in' : 'Check in'}>
        {scan && (phase === 'done' ? (
          <div className="py-4 text-center">
            <div className="anim-pop mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-teal-500 text-white"><CheckCircle2 size={44} /></div>
            <div className="font-display text-xl font-bold">{scan.title}</div>
            <p className="text-sm text-ink-3">Checked in at {result ? formatClock(result.checkIn) : ''}{result?.late ? ' · marked late' : ''}. Enjoy the session!</p>
            <Button className="mt-5" onClick={() => setScan(null)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-canvas p-4">
              <Camera className="mt-0.5 shrink-0 text-lav-600" size={20} />
              <div className="text-sm text-ink-2"><b>Fastest:</b> open your phone’s camera, point it at the QR code on the venue screen and tap the link. You’ll be checked in automatically.</div>
            </div>
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); checkIn(scan, { code: manual }); }}>
              <label htmlFor="manual-code" className="flex items-center gap-2 text-sm font-semibold text-ink-2"><Keyboard size={15} /> Or type the 7-character code under the QR</label>
              <div className="flex gap-2">
                <input id="manual-code" className={cx(inputCls, 'h-12 font-mono text-lg tracking-[.2em]')} value={manual} onChange={(e) => setManual(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="4K2Q9ZA" maxLength={7} autoComplete="off" />
                <Button type="submit" disabled={manual.length < 7 || phase === 'reading'} disabledReason="Codes are 7 characters">{phase === 'reading' ? 'Checking…' : 'Check in'}</Button>
              </div>
            </form>
            {error && <div role="alert" className="flex items-start gap-2 rounded-xl bg-bml-50 p-3 text-sm text-bml-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}
            {demoMode && (
              <div className="rounded-2xl border border-dashed border-amber-500/60 bg-amber-50 p-3">
                <div className="mb-2 flex items-center gap-2"><DemoTag>Demo mode</DemoTag><span className="text-xs text-amber-800">No venue screen nearby?</span></div>
                <Button size="sm" variant="secondary" disabled={phase === 'reading'} onClick={() => checkIn(scan, { demo: true })} icon={<ScanLine size={15} />}>Simulate a scan</Button>
              </div>
            )}
          </div>
        ))}
      </Modal>
    </div>
  );
}

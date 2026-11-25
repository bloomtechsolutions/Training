import React from 'react';
import { CalendarDays, QrCode, NotebookPen, Library, Star, Radio, ArrowRight, Megaphone, Trophy, Sparkles, Clock, MapPin, Rocket, Award, CheckCircle2 } from 'lucide-react';
import { useStore, useNow, useEvent, useSessions, eventPhase, currentAndNext, userPoints, teamPoints } from '../lib/store';
import { useNav } from '../lib/nav';
import { Badge, Button, Card, SectionTitle, Ring, cx, DemoTag, EmptyState } from '../components/ui';
import { KindIcon, SessionMeta, TeamChip, Leaderboard } from '../components/shared';
import { countdownParts, formatDay, sessionEnd, sessionStart, mvtParts, relTime } from '../lib/time';
import { computeBadges } from './badges';

export default function ParticipantHome() {
  const { db, me, update } = useStore();
  const now = useNow();
  const ev = useEvent();
  const sessions = useSessions();
  const { go } = useNav();
  const phase = eventPhase(ev, sessions, now);
  const { live, next } = currentAndNext(ev, sessions, now);
  const region = db.regions.find((r) => r.id === me.regionId);
  const sc = db.serviceCentres.find((s) => s.id === me.scId);
  const team = db.teams.find((t) => t.id === me.teamId);
  const pts = userPoints(db, me.id);
  const numbered = sessions.filter((s) => s.kind !== 'break');
  const attended = db.attendance.filter((a) => a.userId === me.id && a.eventId === ev.id).length;
  const progress = Math.round((attended / Math.max(1, numbered.length)) * 100);
  const hour = mvtParts(now).min / 60;
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const read = db.readAnnouncements[me.id] ?? [];
  const anns = db.announcements.filter((a) => a.eventId === ev.id && (a.audience === 'all' || a.audience === me.regionId)).sort((a, b) => b.ts - a.ts);
  const unread = anns.filter((a) => !read.includes(a.id));
  const checkedInLive = live && db.attendance.some((a) => a.userId === me.id && a.sessionId === live.id);
  const firstStart = sessions.length ? sessionStart(ev, sessions[0]) : now;
  const cd = countdownParts(firstStart - now);
  const dayIdx = Math.max(0, ev.days.findIndex((d) => d.date === mvtParts(now).date));
  const badges = computeBadges(db, me.id).filter((b) => b.earned);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] mesh grain p-5 text-white shadow-pop sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/80">
              <span className="rounded-full bg-white/15 px-2.5 py-1">{region?.name ?? 'Region'} · {sc?.name ?? 'Service centre'}</span>
              <TeamChip team={team} className="bg-white/90" />
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{greet}, {me.name.split(' ')[0]}</h1>
            <p className="mt-1 max-w-lg text-sm text-white/85">
              {phase === 'before' && <>Your refresher starts {formatDay(ev.days[0].date, { weekday: 'long', day: 'numeric', month: 'long' })}. Here’s everything you need to get ready.</>}
              {phase === 'during' && <>Day {dayIdx + 1} · <b>{ev.days[dayIdx]?.theme}</b>. Building a Digital-First, Sales-Driven and Customer-Centric Team.</>}
              {phase === 'after' && <>Thank you for taking part. Your learning continues in Beyond Refresher.</>}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/75"><MapPin size={13} /> {ev.venue || 'Venue to be confirmed'}{!ev.regionId && ' · Region to be confirmed'}</div>
          </div>
          {phase === 'before' && (
            <div className="flex gap-2" aria-label="Countdown to the event">
              {[['Days', cd.d], ['Hrs', cd.h], ['Min', cd.m], ['Sec', cd.s]].map(([l, v]) => (
                <div key={l as string} className="w-16 rounded-2xl bg-white/15 py-2 text-center backdrop-blur"><div className="font-display text-2xl font-extrabold tabular-nums">{String(v).padStart(2, '0')}</div><div className="text-[10px] font-bold uppercase tracking-wider text-white/70">{l}</div></div>
              ))}
            </div>
          )}
          {phase !== 'before' && (
            <div className="flex items-center gap-4 rounded-2xl bg-white/12 p-3 pr-5 backdrop-blur">
              <Ring value={progress} size={64} color="#FFFFFF"><span className="font-display text-sm font-extrabold">{progress}%</span></Ring>
              <div><div className="text-xs text-white/75">Sessions attended</div><div className="font-display text-xl font-extrabold tabular-nums">{attended}/{numbered.length}</div><div className="text-xs text-white/75"><b className="tabular-nums">{pts}</b> learning points</div></div>
            </div>
          )}
        </div>
      </section>

      {/* Live / next */}
      {phase !== 'after' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className={cx('relative overflow-hidden p-5', live && 'ring-2 ring-bml/30')}>
            <div className="mb-3 flex items-center gap-2">
              {live ? <Badge tone="red" icon={<span className="live-dot h-2 w-2 rounded-full bg-bml" />}>Live now</Badge> : <Badge tone="ink">No session live</Badge>}
              {live && <span className="text-xs font-semibold tabular-nums text-ink-3">ends in {Math.max(1, Math.ceil((sessionEnd(ev, live) - now) / 60000))} min</span>}
            </div>
            {live ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bml-50 text-bml"><KindIcon s={live} /></span>
                  <div className="min-w-0"><h3 className="font-display text-lg font-bold leading-snug text-ink">{live.title}</h3><div className="text-sm text-ink-3"><SessionMeta s={live} /></div></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {live.kind !== 'break' && <Button onClick={() => go('live')} icon={<Radio size={17} />}>Join live activity</Button>}
                  {live.kind !== 'break' && !checkedInLive && <Button variant="secondary" onClick={() => go('attendance')} icon={<QrCode size={17} />}>Check in</Button>}
                  {checkedInLive && <Badge tone="green" icon={<CheckCircle2 size={13} />} className="h-11 px-3 text-xs">Checked in</Badge>}
                </div>
              </>
            ) : <p className="text-sm text-ink-3">Nothing is running right now. {next ? 'Your next session is shown alongside.' : ''}</p>}
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2"><Badge tone="lav" icon={<Clock size={12} />}>Up next</Badge>{next && <span className="text-xs font-semibold text-ink-3">{formatDay(ev.days[next.day - 1].date)}</span>}</div>
            {next ? (
              <button className="flex w-full items-start gap-3 text-left" onClick={() => go('session', next.id)}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lav-50 text-lav-600"><KindIcon s={next} /></span>
                <div className="min-w-0 flex-1"><h3 className="font-display text-lg font-bold leading-snug text-ink">{next.title}</h3><div className="text-sm text-ink-3"><SessionMeta s={next} /></div><div className="mt-2 text-xs text-ink-3">{next.trainerLabel}</div></div>
                <ArrowRight className="mt-1 text-ink-4" size={18} />
              </button>
            ) : <p className="text-sm text-ink-3">That was the last session.</p>}
          </Card>
        </div>
      )}

      {phase === 'after' && (
        <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><Rocket /></span>
          <div className="min-w-0 flex-1"><h3 className="font-display text-lg font-bold">Keep the momentum going</h3><p className="text-sm text-ink-3">Track your 30/60/90-day commitments, revisit resources and download your certificate when it’s approved.</p></div>
          <div className="flex flex-wrap gap-2"><Button onClick={() => go('beyond')} icon={<Rocket size={16} />}>Beyond Refresher</Button><Button variant="secondary" onClick={() => go('feedback')} icon={<Star size={16} />}>Event feedback</Button></div>
        </Card>
      )}

      {/* Quick actions */}
      <section>
        <SectionTitle title="Quick actions" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { id: 'agenda', label: 'Agenda', icon: CalendarDays, c: 'bg-bml-50 text-bml' },
            { id: 'attendance', label: 'Check in', icon: QrCode, c: 'bg-teal-50 text-teal-600' },
            { id: 'live', label: 'Live', icon: Sparkles, c: 'bg-lav-50 text-lav-600' },
            { id: 'notebook', label: 'Notebook', icon: NotebookPen, c: 'bg-amber-50 text-amber-600' },
            { id: 'library', label: 'Resources', icon: Library, c: 'bg-sky2-50 text-sky2-600' },
            { id: 'feedback', label: 'Feedback', icon: Star, c: 'bg-coral-50 text-coral-600' },
          ].map((a) => (
            <button key={a.id} onClick={() => go(a.id)} className="group flex min-h-[92px] flex-col items-start justify-between rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-ink/[.05] transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-110', a.c)}><a.icon size={20} /></span>
              <span className="text-sm font-bold text-ink">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Announcements */}
        <section className="lg:col-span-3">
          <SectionTitle title={<span className="flex items-center gap-2">Announcements {unread.length > 0 && <Badge tone="red">{unread.length} new</Badge>}</span>} action={unread.length > 0 && <Button size="sm" variant="ghost" onClick={() => update((d) => { d.readAnnouncements[me.id] = anns.map((a) => a.id); })}>Mark all read</Button>} />
          {anns.length === 0 ? <EmptyState icon={<Megaphone />} title="No announcements yet" body="Organisers will post updates here." /> : (
            <div className="space-y-3">
              {anns.slice(0, 4).map((a) => {
                const isNew = !read.includes(a.id);
                return (
                  <Card key={a.id} className={cx('flex gap-3 p-4', isNew && 'ring-2 ring-lav-200')}>
                    <span className={cx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', a.kind === 'schedule' ? 'bg-amber-50 text-amber-600' : a.kind === 'urgent' ? 'bg-bml-50 text-bml' : 'bg-lav-50 text-lav-600')}>{a.kind === 'schedule' ? <CalendarDays size={18} /> : <Megaphone size={18} />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink">{a.title}</h3>{isNew && <Badge tone="lav">New</Badge>}{a.kind === 'schedule' && <Badge tone="amber">Schedule change</Badge>}</div>
                      <p className="mt-0.5 text-sm text-ink-2">{a.body}</p>
                      <div className="mt-1 text-xs text-ink-3">{a.author} · {relTime(a.ts)}</div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Team + badges */}
        <section className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <SectionTitle title="Team leaderboard" eyebrow="Live" action={<Trophy className="text-amber-500" size={20} />} />
            <Leaderboard rows={teamPoints(db)} />
            <p className="mt-3 text-xs text-ink-3">Points for quizzes, challenges, ideas and reflections. No points for attendance or trainer ratings.</p>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Your achievements" action={<Button size="sm" variant="ghost" onClick={() => go('profile')}>View all</Button>} />
            {badges.length ? (
              <div className="flex flex-wrap gap-2">{badges.map((b) => <span key={b.id} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"><Award size={14} />{b.name}</span>)}</div>
            ) : <p className="text-sm text-ink-3">Complete quizzes, scenarios and ideas to unlock badges like <b>Product Guru</b> and <b>Innovator</b>.</p>}
          </Card>
          <p className="flex items-center gap-2 text-xs text-ink-3"><DemoTag /> You are signed in as a demo participant.</p>
        </section>
      </div>
    </div>
  );
}


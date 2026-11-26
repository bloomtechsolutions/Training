import React, { useMemo, useState } from 'react';
import { Users, Shuffle, Timer, ThumbsUp, Send, Lightbulb, ClipboardCheck, ArrowRight, CheckCircle2, RotateCcw, Sparkles, TrendingUp, TrendingDown, Camera, Target } from 'lucide-react';
import { useStore, uid, useTick, teamPoints, useEvent } from '../lib/store';
import { Badge, Button, Card, cx, DemoTag, inputCls, Field, Progress, SectionTitle, EmptyState } from '../components/ui';
import { Leaderboard, TeamChip, PhotoTile } from '../components/shared';
import { SelfPacedActivity, LiveWordCloud } from './Quiz';
import { UpdateCards } from './Cards';
import { RUBRIC, ROLEPLAY_SCENARIOS, BRANCH_SCENARIOS, CUSTOMER_PROFILES, SOLUTION_CATEGORIES, SKILLS, PERFORMANCE_CARDS } from '../lib/content';
import { mmss } from '../lib/time';
import { useNav } from '../lib/nav';

function ActivityById({ id }: { id: string }) {
  const { db } = useStore();
  const a = db.activities.find((x) => x.id === id);
  if (!a) return null;
  if (a.type === 'wordcloud') return <LiveWordCloud activity={a} />;
  return <SelfPacedActivity activity={a} />;
}

export function IceBreaker() {
  const { db, me } = useStore();
  const team = db.teams.find((t) => t.id === me.teamId);
  const mates = db.users.filter((u) => u.teamId === me.teamId && u.id !== me.id);
  const prompts = ['Share one thing customers on your island love about your service centre.', 'What’s one digital service you’d teach your grandparents first?', 'Name a colleague who helped you this year and how.'];
  const [p, setP] = useState(0);
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="p-5" style={{ background: `linear-gradient(120deg, ${team?.tint}, #fff)` }}>
          <div className="text-xs font-bold uppercase tracking-wider text-ink-3">Your team for the two days</div>
          <div className="mt-1 font-display text-3xl font-extrabold" style={{ color: team?.color }}>{team?.name}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">{mates.slice(0, 8).map((m) => <span key={m.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-2 shadow-sm">{m.name}</span>)}</div>
        </div>
      </Card>
      <ActivityById id="a-ice" />
      <Card className="p-5">
        <SectionTitle title="Fun prompt" eyebrow="Talk to your table" action={<Button size="sm" variant="ghost" icon={<Shuffle size={15} />} onClick={() => setP((p + 1) % prompts.length)}>Shuffle</Button>} />
        <p key={p} className="anim-in font-display text-xl font-bold text-ink">“{prompts[p]}”</p>
      </Card>
    </div>
  );
}

export function Performance() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><h3 className="font-display text-lg font-bold">Service centre performance cards</h3><DemoTag>Demo figures only</DemoTag></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PERFORMANCE_CARDS.map((c) => {
          const good = c.metric.includes('wait') ? c.value <= c.target : c.value >= c.target;
          return (
            <Card key={c.sc} className="p-4">
              <div className="text-xs font-semibold text-ink-3">{c.sc} · {c.metric}</div>
              <div className="mt-1 flex items-end gap-2"><span className="font-display text-3xl font-extrabold tabular-nums">{c.value}</span><span className="pb-1 text-sm text-ink-3">target {c.target}</span></div>
              <div className={cx('mt-1 flex items-center gap-1 text-xs font-bold', good ? 'text-teal-600' : 'text-amber-600')}>{c.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {c.trend > 0 ? '+' : ''}{c.trend} vs last quarter</div>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-ink-3">Participants present their own centre’s figures in the room. These cards show the format with fictional numbers.</p>
      <ActivityById id="a-perf" />
    </div>
  );
}

export function Commercial() {
  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold">Product & process update cards</h3>
      <UpdateCards />
      <h3 className="pt-2 font-display text-lg font-bold">Knowledge check</h3>
      <ActivityById id="a-com" />
    </div>
  );
}

export function Development() {
  const { db, me, update, toast } = useStore();
  const existing = db.selfAssess.find((s) => s.userId === me.id);
  const [skills, setSkills] = useState<Record<string, number>>(existing?.skills ?? Object.fromEntries(SKILLS.map((s) => [s, 3])));
  const [goals, setGoals] = useState(existing?.goals ?? '');
  return (
    <Card className="p-5">
      <SectionTitle title="Skills self-assessment" eyebrow="Private to you" />
      <p className="mb-4 text-sm text-ink-3">Rate your confidence from 1 (just starting) to 5 (could coach others). Only you can see this.</p>
      <div className="space-y-4">
        {SKILLS.map((s) => (
          <div key={s}>
            <div className="mb-1 flex justify-between text-sm"><label htmlFor={`sk-${s}`} className="font-semibold text-ink">{s}</label><span className="font-bold tabular-nums text-lav-600">{skills[s]}/5</span></div>
            <input id={`sk-${s}`} type="range" min={1} max={5} step={1} value={skills[s]} onChange={(e) => setSkills({ ...skills, [s]: Number(e.target.value) })} className="w-full accent-[#7C5CFA]" />
          </div>
        ))}
      </div>
      <Field label="My development goals" htmlFor="dev-goals"><textarea id="dev-goals" className={inputCls} rows={3} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="In the next 90 days I want to…" /></Field>
      <div className="mt-3 flex justify-end"><Button onClick={() => { update((d) => { d.selfAssess = d.selfAssess.filter((x) => x.userId !== me.id); d.selfAssess.push({ userId: me.id, skills, goals, ts: Date.now() }); }); toast('Self-assessment saved privately'); }}>Save assessment</Button></div>
    </Card>
  );
}

export function Sprint() {
  const { db } = useStore();
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3"><ActivityById id="a-sprint" /></div>
      <Card className="h-fit p-5 lg:col-span-2"><SectionTitle title="Team leaderboard" eyebrow="Live" /><Leaderboard rows={teamPoints(db)} /></Card>
    </div>
  );
}

export function RolePlay() {
  const { db, me, update, toast } = useStore();
  const real = useTick(1000);
  const mine = db.roleplay.assignments.find((a) => a.teamId === me.teamId);
  const sc = ROLEPLAY_SCENARIOS.find((s) => s.id === mine?.scenarioId);
  const myRole = mine ? (mine.advisor === me.name ? 'Advisor' : mine.customer === me.name ? 'Customer' : 'Observer') : null;
  const prep = db.roleplay.prepDeadline ? db.roleplay.prepDeadline - real : 0;
  const [scores, setScores] = useState<Record<string, number>>({});
  const [advisor, setAdvisor] = useState('');
  const total = RUBRIC.reduce((a, r) => a + ((scores[r.key] ?? 0) / 5) * r.weight, 0);
  const complete = RUBRIC.every((r) => scores[r.key]);
  const advisors = db.roleplay.assignments.map((a) => a.advisor);
  return (
    <div className="space-y-4">
      {!mine ? <EmptyState icon={<Shuffle />} title="Roles not assigned yet" body="Your host will randomly assign scenarios and roles. You’ll see your brief here." /> : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-ink px-5 py-3 text-white">
            <span className="text-sm font-bold">Your role: <span className="text-amber-500">{myRole}</span></span>
            {prep > 0 && <span className="flex items-center gap-1 font-mono text-sm font-bold"><Timer size={15} /> Prep {mmss(prep)}</span>}
          </div>
          <div className="p-5">
            <Badge tone="coral">{sc?.tag}</Badge>
            <h3 className="mt-2 font-display text-xl font-bold">{sc?.title}</h3>
            <div className="mt-3 rounded-2xl bg-canvas p-4 text-sm text-ink-2">{myRole === 'Customer' ? sc?.customer : myRole === 'Advisor' ? sc?.advisor : <><b>Watch for:</b> {sc?.observe}</>}</div>
            <div className="mt-3 text-xs text-ink-3">Advisor: {mine.advisor} · Customer: {mine.customer} · Observer: {mine.observer} · All cases are fictional.</div>
          </div>
        </Card>
      )}
      <Card className="p-5">
        <SectionTitle title="Observer rubric" eyebrow="Score a role play" />
        <Field label="Advisor being observed" htmlFor="rb-adv">
          <select id="rb-adv" className={inputCls} value={advisor} onChange={(e) => setAdvisor(e.target.value)}>
            <option value="">Choose…</option>
            {(advisors.length ? advisors : db.users.slice(0, 10).map((u) => u.name)).map((n) => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <div className="mt-4 space-y-3">
          {RUBRIC.map((r) => (
            <div key={r.key} className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">{r.label} <span className="text-ink-3">({r.weight}%)</span></div>
              <div className="flex gap-1" role="radiogroup" aria-label={r.label}>
                {[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={scores[r.key] === n} onClick={() => setScores({ ...scores, [r.key]: n })} className={cx('h-10 w-10 rounded-xl text-sm font-bold transition', scores[r.key] === n ? 'bg-lav-600 text-white' : 'bg-canvas text-ink-2 hover:bg-lav-50')}>{n}</button>)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-lav-50 p-4">
          <div><div className="text-xs font-semibold text-lav-700">Weighted score</div><div className="font-display text-3xl font-extrabold tabular-nums text-lav-700">{Math.round(total)}%</div></div>
          <Button disabled={!complete || !advisor} disabledReason="Score every criterion and choose the advisor" icon={<ClipboardCheck size={16} />} onClick={() => {
            update((d) => { d.rubric.push({ id: uid('rb'), sessionId: 's-06', observerId: me.id, advisorName: advisor, scenarioId: mine?.scenarioId ?? '', scores, total: Math.round(total), ts: Date.now() }); });
            setScores({}); setAdvisor(''); toast('Rubric submitted to the host');
          }}>Submit rubric</Button>
        </div>
        <p className="mt-2 text-xs text-ink-3">Rubric scores go to the host for coaching and are not shown publicly.</p>
      </Card>
    </div>
  );
}

export function Communication() {
  return (
    <div className="space-y-4">
      <ActivityById id="a-wc" />
      <ActivityById id="a-comm" />
      <Card className="p-5">
        <SectionTitle title="Customer scenarios" eyebrow="Discuss at your table" />
        <div className="grid gap-3 sm:grid-cols-2">{ROLEPLAY_SCENARIOS.slice(1, 5).map((s) => <div key={s.id} className="rounded-2xl bg-canvas p-4"><Badge tone="coral">{s.tag}</Badge><div className="mt-1 font-bold">{s.title}</div><p className="mt-1 text-sm text-ink-2">{s.customer}</p></div>)}</div>
      </Card>
    </div>
  );
}

export function Challenges() {
  const { db, me, update, toast } = useStore();
  const ev = useEvent();
  const [t, setT] = useState('');
  const posts = db.challenges.filter((c) => c.eventId === ev.id && (c.status === 'approved' || c.userId === me.id)).sort((a, b) => b.votes.length - a.votes.length);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle title="Challenge wall" eyebrow="Moderated" />
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (t.trim().length < 5) return; update((d) => { d.challenges.push({ id: uid('c'), eventId: ev.id, userId: me.id, teamId: me.teamId, text: t.trim(), status: 'pending', votes: [], solution: '', ts: Date.now() }); }); setT(''); toast('Posted. It appears for everyone after moderation.'); }}>
          <label htmlFor="ch-in" className="sr-only">Challenge</label>
          <input id="ch-in" className={inputCls} maxLength={140} value={t} onChange={(e) => setT(e.target.value)} placeholder="A challenge you face at your service centre…" />
          <Button type="submit" disabled={t.trim().length < 5} disabledReason="Type at least 5 characters" icon={<Send size={15} />}>Post</Button>
        </form>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {posts.map((c, i) => {
          const voted = c.votes.includes(me.id);
          return (
            <div key={c.id} className={cx('relative rounded-2xl p-4 shadow-card', ['bg-amber-100', 'bg-lav-100', 'bg-teal-100', 'bg-coral-100', 'bg-sky2-100'][i % 5], i % 2 ? 'rotate-[0.6deg]' : '-rotate-[0.6deg]')}>
              <p className="font-display text-base font-bold text-ink">{c.text}</p>
              {c.solution && <p className="mt-2 rounded-xl bg-white/70 p-2 text-sm text-ink-2"><b>Solution:</b> {c.solution}</p>}
              <div className="mt-3 flex items-center justify-between">
                {c.status === 'pending' ? <Badge tone="amber">Awaiting moderation</Badge> : <TeamChip team={db.teams.find((x) => x.id === c.teamId)} className="bg-white/80" />}
                <button disabled={c.status !== 'approved'} onClick={() => update((d) => { const x = d.challenges.find((y) => y.id === c.id)!; x.votes = voted ? x.votes.filter((v) => v !== me.id) : [...x.votes, me.id]; })} aria-pressed={voted} className={cx('flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition', voted ? 'bg-ink text-white' : 'bg-white/80 text-ink hover:bg-white')}>
                  <ThumbsUp size={15} /> {c.votes.length}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BranchingScenario({ id }: { id: string }) {
  const { db, me, update, toast, celebrate } = useStore();
  const sc = BRANCH_SCENARIOS.find((s) => s.id === id)!;
  const prog = db.scenarioProgress.find((p) => p.userId === me.id && p.scenarioId === id);
  const [node, setNode] = useState(prog?.done ? 'end' : sc.start);
  const [fb, setFb] = useState<{ text: string; quality: string } | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const n = sc.nodes[node];
  const restart = () => { setNode(sc.start); setFb(null); setPath([]); };
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-lav-600 to-bml p-5 text-white">
        <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{sc.tag}</div>
        <h3 className="font-display text-xl font-extrabold">{sc.title}</h3>
        <p className="mt-1 text-sm opacity-90">{sc.persona}</p>
      </div>
      <div className="p-5">
        {node === sc.start && !fb && <p className="mb-4 rounded-2xl bg-canvas p-4 text-sm text-ink-2">{sc.intro}</p>}
        {node === 'end' ? (
          <div className="text-center">
            <div className="anim-pop mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500 text-white"><CheckCircle2 size={34} /></div>
            <p className="text-sm text-ink-2">{sc.ending}</p>
            <Button className="mt-4" variant="secondary" icon={<RotateCcw size={15} />} onClick={restart}>Play again</Button>
          </div>
        ) : (
          <>
            <p className="mb-3 font-display text-lg font-bold">{n.text}</p>
            <div className="space-y-2">
              {n.choices.map((c) => (
                <button key={c.label} onClick={() => {
                  setFb({ text: c.feedback, quality: c.quality });
                  setPath([...path, c.label]);
                  if (c.next === 'end') {
                    update((d) => {
                      d.scenarioProgress = d.scenarioProgress.filter((p) => !(p.userId === me.id && p.scenarioId === id));
                      d.scenarioProgress.push({ userId: me.id, scenarioId: id, path: [...path, c.label], done: true, ts: Date.now() });
                    });
                    setTimeout(() => { setNode('end'); setFb(null); celebrate(); toast('Case study complete · +100 points'); }, 1400);
                  } else if (c.next !== node) setTimeout(() => { setNode(c.next); setFb(null); }, 1400);
                }} className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left text-sm font-medium text-ink ring-1 ring-inset ring-ink/10 transition hover:ring-lav-500">
                  <ArrowRight size={16} className="mt-0.5 shrink-0 text-lav-600" />{c.label}
                </button>
              ))}
            </div>
            {fb && <div role="status" className={cx('anim-in mt-3 rounded-2xl p-3 text-sm font-semibold', fb.quality === 'best' ? 'bg-teal-50 text-teal-700' : fb.quality === 'ok' ? 'bg-amber-50 text-amber-700' : 'bg-bml-50 text-bml-700')}>{fb.text}</div>}
          </>
        )}
      </div>
    </Card>
  );
}

export function Advisory() {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">{BRANCH_SCENARIOS.map((s) => <BranchingScenario key={s.id} id={s.id} />)}</div>
      <Card className="p-5">
        <SectionTitle title="Customer profile matching" eyebrow="Fictional profiles · generic categories" />
        <div className="space-y-4">
          {CUSTOMER_PROFILES.map((p) => {
            const sel = picked[p.id] ?? [];
            const done = checked[p.id];
            return (
              <div key={p.id} className="rounded-2xl bg-canvas p-4">
                <div className="font-bold">{p.name}</div>
                <p className="text-sm text-ink-2">{p.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{p.needs.map((n) => <Badge key={n} tone="lav">{n}</Badge>)}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SOLUTION_CATEGORIES.map((c) => {
                    const on = sel.includes(c);
                    const good = p.best.includes(c);
                    return <button key={c} aria-pressed={on} onClick={() => !done && setPicked({ ...picked, [p.id]: on ? sel.filter((x) => x !== c) : [...sel, c] })} className={cx('rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-inset transition', done ? (good ? 'bg-teal-500 text-white ring-teal-500' : on ? 'bg-bml-50 text-bml ring-bml-200 line-through' : 'bg-white text-ink-3 ring-ink/10') : on ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-2 ring-ink/10 hover:ring-lav-500')}>{c}</button>;
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {!done ? <Button size="sm" disabled={!sel.length} disabledReason="Pick at least one" onClick={() => setChecked({ ...checked, [p.id]: true })}>Check match</Button> : <><Badge tone="teal">Suggested categories highlighted</Badge><Button size="sm" variant="ghost" onClick={() => { setChecked({ ...checked, [p.id]: false }); setPicked({ ...picked, [p.id]: [] }); }}>Try again</Button></>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-3">Categories are generic and for discussion. Always confirm suitability and eligibility using approved product information.</p>
      </Card>
    </div>
  );
}

export function Innovation() {
  const { db, me, update, toast, celebrate } = useStore();
  const ev = useEvent();
  const empty = { title: '', challenge: '', solution: '', customerBenefit: '', bankBenefit: '', requirements: '' };
  const [f, setF] = useState(empty);
  const [open, setOpen] = useState(false);
  const ideas = useMemo(() => db.ideas.filter((i) => i.eventId === ev.id).sort((a, b) => b.votes.length - a.votes.length), [db.ideas, ev.id]);
  const valid = f.title.trim() && f.challenge.trim() && f.solution.trim() && f.customerBenefit.trim();
  const fields: [keyof typeof empty, string, string][] = [['title', 'Idea title', 'A short, catchy name'], ['challenge', 'Current challenge', 'What problem do you see today?'], ['solution', 'Proposed solution', 'What would you change?'], ['customerBenefit', 'Customer benefit', 'How do customers gain?'], ['bankBenefit', 'Bank benefit', 'How does the bank gain?'], ['requirements', 'Implementation requirements', 'People, systems, approvals…']];
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-100 via-coral-50 to-lav-50 p-5">
          <div><div className="text-xs font-bold uppercase tracking-wider text-amber-700">Innovation Lab</div><h3 className="font-display text-xl font-extrabold">Pitch an idea</h3><p className="text-sm text-ink-2">+100 points per submission, +200 if shortlisted.</p></div>
          <Button onClick={() => setOpen(!open)} icon={<Lightbulb size={16} />}>{open ? 'Hide form' : 'Submit an idea'}</Button>
        </div>
        {open && (
          <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => {
            e.preventDefault(); if (!valid) return;
            const id = uid('idea');
            update((d) => { d.ideas.push({ id, eventId: ev.id, userId: me.id, teamId: me.teamId, ...f, votes: [], status: 'submitted', owner: '', due: '', progress: 0, ts: Date.now() }); });
            setF(empty); setOpen(false); celebrate(); toast('Idea submitted · +100 points');
          }}>
            {fields.map(([k, l, ph]) => (
              <Field key={k} label={`${l}${['title', 'challenge', 'solution', 'customerBenefit'].includes(k) ? ' *' : ''}`} htmlFor={`idea-${k}`}>
                {k === 'title' ? <input id={`idea-${k}`} className={inputCls} value={f[k]} maxLength={60} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} /> : <textarea id={`idea-${k}`} rows={2} className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} />}
              </Field>
            ))}
            <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={!valid} disabledReason="Fill the starred fields">Submit idea</Button></div>
          </form>
        )}
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {ideas.map((i) => {
          const voted = i.votes.includes(me.id);
          const own = i.userId === me.id;
          return (
            <Card key={i.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><div className="font-display text-base font-bold">{i.title}</div><div className="mt-0.5 flex flex-wrap gap-1.5"><TeamChip team={db.teams.find((t) => t.id === i.teamId)} />{i.status !== 'submitted' && <Badge tone="amber">{i.status === 'shortlisted' ? 'Shortlisted ⭐' : i.status}</Badge>}{own && <Badge tone="lav">Your idea</Badge>}</div></div>
                <button disabled={own} onClick={() => update((d) => { const x = d.ideas.find((y) => y.id === i.id)!; x.votes = voted ? x.votes.filter((v) => v !== me.id) : [...x.votes, me.id]; })} aria-pressed={voted} aria-label={own ? 'You cannot vote for your own idea' : voted ? 'Remove vote' : 'Vote'} title={own ? 'You cannot vote for your own idea' : undefined} className={cx('flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-xs font-bold transition disabled:opacity-50', voted ? 'bg-bml text-white' : 'bg-canvas text-ink hover:bg-bml-50')}>
                  <ThumbsUp size={16} />{i.votes.length}
                </button>
              </div>
              <p className="mt-2 text-sm text-ink-2"><b>Challenge:</b> {i.challenge}</p>
              <p className="mt-1 text-sm text-ink-2"><b>Solution:</b> {i.solution}</p>
              <p className="mt-1 text-sm text-ink-2"><b>For customers:</b> {i.customerBenefit}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function External() {
  const { db, me } = useStore();
  const { go } = useNav();
  const photos = db.photos.filter((p) => p.status === 'approved').slice(0, 4);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle title="Engagement activity" eyebrow="Run by the external vendor" />
        <ol className="space-y-2 text-sm text-ink-2">
          {['Gather with your team at the meeting point.', 'Listen to the facilitator’s instructions and safety briefing.', 'Complete challenges together. The vendor records team scores.', 'Share photos in the moderated gallery (optional).'].map((s, i) => <li key={s} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-mono text-xs font-bold text-amber-700">{i + 1}</span>{s}</li>)}
        </ol>
        <p className="mt-3 text-xs text-ink-3">Detailed activity instructions will be supplied by the vendor.</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5"><SectionTitle title="Team scores" /><Leaderboard rows={teamPoints(db)} /><div className="mt-3 text-xs text-ink-3">Your team: <TeamChip team={db.teams.find((t) => t.id === me.teamId)} /></div></Card>
        <Card className="p-5">
          <SectionTitle title="Gallery" action={<Button size="sm" variant="ghost" icon={<Camera size={15} />} onClick={() => go('gallery')}>Open</Button>} />
          <div className="grid grid-cols-2 gap-2">{photos.map((p) => <PhotoTile key={p.id} {...p} />)}</div>
        </Card>
      </div>
    </div>
  );
}

export const EXPERIENCES: Record<string, { title: string; icon: React.ComponentType<any>; el: React.ComponentType }> = {
  icebreaker: { title: 'Ice Breaker', icon: Users, el: IceBreaker },
  performance: { title: 'Performance', icon: TrendingUp, el: Performance },
  commercial: { title: 'Commercial Updates', icon: Sparkles, el: Commercial },
  development: { title: 'Staff Development', icon: Target, el: Development },
  sprint: { title: 'Product Sprint', icon: Timer, el: Sprint },
  roleplay: { title: 'Role Play Arena', icon: Users, el: RolePlay },
  communication: { title: 'Communication', icon: Sparkles, el: Communication },
  challenges: { title: 'Challenge Wall', icon: ThumbsUp, el: Challenges },
  advisory: { title: 'Advisory Role', icon: ClipboardCheck, el: Advisory },
  innovation: { title: 'Innovation Lab', icon: Lightbulb, el: Innovation },
  external: { title: 'Engagement Activity', icon: Camera, el: External },
};

export { Progress };

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Square, Eye, SkipForward, Plus, Trash2, Pencil, Users, Bot, Award, Shuffle, Timer, CheckCircle2, X, Cloud } from 'lucide-react';
import { useStore, uid, useTick, setLive, awardPoints, audit } from '../lib/store';
import { Badge, Button, Card, EmptyState, Modal, Tabs, cx, inputCls, Field, SectionTitle, Toggle, DemoTag } from '../components/ui';
import { WordCloud, Leaderboard } from '../components/shared';
import { TrainerBar } from './Header';
import { useTrainerContext } from './useTrainer';
import { launchActivity, openQuestion, pause, resume, closeVoting, reveal, endActivity } from './liveControl';
import { PollResults, recordAnswer } from '../engage/Quiz';
import type { Activity, Question } from '../lib/types';
import { mmss } from '../lib/time';
import { ROLEPLAY_SCENARIOS, SCORE_RULES } from '../lib/content';
import { teamPoints } from '../lib/store';

const SAMPLE_WORDS = ['Trust', 'Empathy', 'Listening', 'Honesty', 'Knowledge', 'Patience', 'Clarity', 'Respect', 'Care', 'Integrity'];

function QuestionEditor({ q, onChange, onDelete }: { q: Question; onChange: (q: Question) => void; onDelete: () => void }) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start gap-2">
        <Field label="Question" htmlFor={`q-${q.id}`}><textarea id={`q-${q.id}`} rows={2} className={inputCls} value={q.text} onChange={(e) => onChange({ ...q, text: e.target.value })} /></Field>
        <Button size="sm" variant="ghost" aria-label="Delete question" onClick={onDelete} icon={<Trash2 size={15} />} className="mt-5" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Type" htmlFor={`k-${q.id}`}>
          <select id={`k-${q.id}`} className={inputCls} value={q.kind} onChange={(e) => {
            const kind = e.target.value as Question['kind'];
            const options = kind === 'tf' ? [{ id: uid('o'), text: 'True' }, { id: uid('o'), text: 'False' }] : q.options;
            onChange({ ...q, kind, options, correct: kind === 'poll' ? undefined : options[0]?.id, points: kind === 'poll' ? 0 : q.points || 100 });
          }}>
            <option value="mc">Multiple choice</option><option value="tf">True / false</option><option value="poll">Poll (no right answer)</option>
          </select>
        </Field>
        <Field label="Time (seconds)" htmlFor={`t-${q.id}`}><input id={`t-${q.id}`} type="number" min={5} max={300} className={inputCls} value={q.seconds} onChange={(e) => onChange({ ...q, seconds: Math.max(5, Math.min(300, Number(e.target.value) || 20)) })} /></Field>
        <Field label="Points" htmlFor={`p-${q.id}`} hint={q.kind === 'poll' ? 'Polls are not scored' : undefined}><input id={`p-${q.id}`} type="number" min={0} max={500} step={50} disabled={q.kind === 'poll'} className={inputCls} value={q.points} onChange={(e) => onChange({ ...q, points: Math.max(0, Number(e.target.value) || 0) })} /></Field>
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold text-ink-2">Answer choices {q.kind !== 'poll' && <span className="font-normal text-ink-3">(select the correct one)</span>}</div>
        <div className="space-y-2">
          {q.options.map((o, i) => (
            <div key={o.id} className="flex items-center gap-2">
              {q.kind !== 'poll' && <input type="radio" name={`c-${q.id}`} aria-label={`Mark choice ${i + 1} correct`} checked={q.correct === o.id} onChange={() => onChange({ ...q, correct: o.id })} className="h-5 w-5 accent-[#0E9384]" />}
              <label htmlFor={`o-${o.id}`} className="sr-only">Choice {i + 1}</label>
              <input id={`o-${o.id}`} className={inputCls} value={o.text} disabled={q.kind === 'tf'} onChange={(e) => onChange({ ...q, options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} />
              {q.kind !== 'tf' && q.options.length > 2 && <Button size="sm" variant="ghost" aria-label="Remove choice" onClick={() => onChange({ ...q, options: q.options.filter((x) => x.id !== o.id), correct: q.correct === o.id ? undefined : q.correct })} icon={<X size={15} />} />}
            </div>
          ))}
        </div>
        {q.kind !== 'tf' && q.options.length < 6 && <Button size="sm" variant="ghost" className="mt-1" icon={<Plus size={14} />} onClick={() => onChange({ ...q, options: [...q.options, { id: uid('o'), text: `Option ${q.options.length + 1}` }] })}>Add choice</Button>}
      </div>
      {q.kind !== 'poll' && <Field label="Explanation shown after answering" htmlFor={`x-${q.id}`}><textarea id={`x-${q.id}`} rows={2} className={inputCls} value={q.explanation ?? ''} onChange={(e) => onChange({ ...q, explanation: e.target.value })} /></Field>}
    </Card>
  );
}

function validate(a: Activity) {
  const errs: string[] = [];
  if (!a.title.trim()) errs.push('Add a title');
  if (a.type === 'wordcloud' && !a.prompt?.trim()) errs.push('Add a prompt');
  if ((a.type === 'quiz' || a.type === 'poll') && !a.questions.length) errs.push('Add at least one question');
  a.questions.forEach((q, i) => {
    if (!q.text.trim()) errs.push(`Question ${i + 1} needs text`);
    if (q.options.some((o) => !o.text.trim())) errs.push(`Question ${i + 1} has an empty choice`);
    if (q.kind !== 'poll' && !q.correct) errs.push(`Question ${i + 1} needs a correct answer`);
  });
  return errs;
}

export default function ActivityStudio() {
  const { db, me, update, toast } = useStore();
  const { session, trainer } = useTrainerContext();
  const real = useTick(250);
  const [tab, setTab] = useState<'live' | 'build' | 'scoring'>('live');
  const [edit, setEdit] = useState<Activity | null>(null);
  const [preview, setPreview] = useState<Activity | null>(null);
  const [sim, setSim] = useState(false);
  const simRef = useRef(sim);
  simRef.current = sim;

  const live = db.live;
  const liveAct = db.activities.find((a) => a.id === live.activityId);
  const acts = session ? db.activities.filter((a) => a.sessionId === session.id) : [];

  // Simulated audience (demo only): adds a response from a random demo participant every ~0.7s.
  useEffect(() => {
    if (!sim) return;
    const i = setInterval(() => {
      if (!simRef.current) return;
      update((d) => {
        const a = d.activities.find((x) => x.id === d.live.activityId);
        if (!a || d.live.phase !== 'open') return;
        const pool = d.users.filter((u) => u.id !== 'u01' && u.status === 'confirmed');
        if (a.type === 'wordcloud') {
          const u = pool[Math.floor(Math.random() * pool.length)];
          d.words.push({ id: uid('w'), activityId: a.id, userId: u.id, word: SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)], ts: Date.now() });
          return;
        }
        const q = a.questions[d.live.questionIndex];
        if (!q) return;
        const remaining = pool.filter((u) => !d.responses.some((r) => r.activityId === a.id && r.questionId === q.id && r.userId === u.id));
        if (!remaining.length) return;
        const u = remaining[Math.floor(Math.random() * remaining.length)];
        // Bias towards the correct answer so results look realistic.
        const opt = q.correct && Math.random() < 0.62 ? q.correct : q.options[Math.floor(Math.random() * q.options.length)].id;
        recordAnswer(d, a, q, u.id, u.teamId, opt);
      });
    }, 700);
    return () => clearInterval(i);
  }, [sim, update]);

  if (!session) return <><TrainerBar title="Activities" /><EmptyState title="No sessions assigned" /></>;
  const q = liveAct?.questions[live.questionIndex];
  const remaining = live.phase === 'paused' ? live.pausedRemaining ?? 0 : live.deadline ? Math.max(0, live.deadline - real) : 0;
  const responses = liveAct && q ? db.responses.filter((r) => r.activityId === liveAct.id && r.questionId === q.id).length : 0;
  const audience = db.users.filter((u) => u.status === 'confirmed').length;
  const isOurs = liveAct && liveAct.sessionId === session.id;

  const newActivity = (type: Activity['type']) => setEdit({ id: uid('act'), sessionId: session.id, type, title: type === 'wordcloud' ? 'New word cloud' : type === 'quiz' ? 'New quiz' : 'New poll', prompt: type === 'wordcloud' ? '' : undefined, mode: 'individual', status: 'draft', questions: type === 'wordcloud' ? [] : [{ id: uid('q'), text: '', kind: type === 'poll' ? 'poll' : 'mc', options: [{ id: uid('o'), text: 'Option 1' }, { id: uid('o'), text: 'Option 2' }], points: type === 'poll' ? 0 : 100, seconds: 20 }] });

  return (
    <div>
      <TrainerBar title="Activities" subtitle="Build, launch and run live quizzes, polls and word clouds." />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'live', label: 'Live control' }, { id: 'build', label: `Activity builder (${acts.length})` }, { id: 'scoring', label: 'Teams & scoring' }]} />

      {tab === 'live' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="min-w-0 overflow-hidden">
            {!liveAct || live.phase === 'idle' ? (
              <div className="p-5">
                <SectionTitle title="Nothing live" eyebrow="Choose an activity to launch" />
                {acts.length === 0 ? <EmptyState title="No activities yet" body="Create one in the activity builder." action={<Button onClick={() => setTab('build')}>Open builder</Button>} /> : (
                  <div className="grid gap-2 sm:grid-cols-2">{acts.map((a) => (
                    <button key={a.id} disabled={validate(a).length > 0} onClick={() => { update((d) => launchActivity(d, a, trainer.name)); toast(`${a.title} launched`); }} className="flex items-center gap-3 rounded-2xl p-4 text-left ring-1 ring-inset ring-ink/10 transition hover:ring-bml disabled:opacity-50">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bml text-white"><Play size={18} /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{a.title}</span><span className="text-xs text-ink-3">{a.type}{a.questions.length ? ` · ${a.questions.length} questions` : ''}</span></span>
                    </button>
                  ))}</div>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 bg-ink px-5 py-3 text-white">
                  <span className="flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-bml live-dot" />{liveAct.title}{!isOurs && ' (another session)'}</span>
                  <span className="flex items-center gap-3 font-mono text-sm font-bold tabular-nums"><Badge tone="ink" className="bg-white/10 text-white ring-white/20">{live.phase}</Badge>{liveAct.type !== 'wordcloud' && <><Timer size={15} />{live.phase === 'open' || live.phase === 'paused' ? mmss(remaining) : '—'}</>}</span>
                </div>
                <div className="p-5">
                  {liveAct.type === 'wordcloud' ? (
                    <><div className="mb-3 font-display text-lg font-bold">{liveAct.prompt}</div><div className="min-h-[200px] rounded-2xl bg-canvas p-4"><WordCloud words={db.words.filter((w) => w.activityId === liveAct.id).map((w) => w.word)} /></div><div className="mt-2 text-xs text-ink-3">{db.words.filter((w) => w.activityId === liveAct.id).length} words</div></>
                  ) : q && (
                    <>
                      <div className="text-xs font-semibold text-ink-3">Question {live.questionIndex + 1} of {liveAct.questions.length} · {responses}/{audience} responded</div>
                      <div className="mb-4 mt-1 font-display text-lg font-bold">{q.text}</div>
                      <PollResults db={db} activityId={liveAct.id} q={live.phase === 'revealed' ? q : { ...q, correct: undefined }} />
                    </>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {live.phase === 'open' && <Button variant="secondary" onClick={() => update(pause)} icon={<Pause size={16} />}>Pause</Button>}
                    {live.phase === 'paused' && <Button variant="secondary" onClick={() => update(resume)} icon={<Play size={16} />}>Resume</Button>}
                    {(live.phase === 'open' || live.phase === 'paused') && <Button variant="secondary" onClick={() => update(closeVoting)} icon={<Square size={16} />}>Close voting</Button>}
                    {liveAct.type !== 'wordcloud' && live.phase !== 'revealed' && <Button onClick={() => update(reveal)} icon={<Eye size={16} />}>{q?.kind === 'poll' ? 'Show results' : 'Reveal answer'}</Button>}
                    {liveAct.type !== 'wordcloud' && live.questionIndex < liveAct.questions.length - 1 && <Button variant="dark" onClick={() => update((d) => openQuestion(d, liveAct, live.questionIndex + 1))} icon={<SkipForward size={16} />}>Next question</Button>}
                    {liveAct.type !== 'wordcloud' && live.questionIndex === liveAct.questions.length - 1 && live.phase === 'revealed' && <Button variant="soft" onClick={() => update((d) => setLive(d, { venueMode: 'leaderboard' }))} icon={<Award size={16} />}>Show leaderboard</Button>}
                    <Button variant="danger" onClick={() => { update(endActivity); setSim(false); }} icon={<X size={16} />}>End activity</Button>
                  </div>
                </div>
              </>
            )}
          </Card>
          <div className="space-y-4">
            <Card className="p-4">
              <Toggle checked={sim} onChange={setSim} label="Simulate audience responses" description="Adds sample answers from demo participants while voting is open." />
              <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-3"><Bot size={13} /> <DemoTag>Simulated</DemoTag> Real responses come from participants’ phones.</div>
            </Card>
            <Card className="p-4"><SectionTitle title="Team leaderboard" /><Leaderboard rows={teamPoints(db)} /></Card>
          </div>
        </div>
      )}

      {tab === 'build' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => newActivity('quiz')} icon={<Plus size={16} />}>New quiz</Button>
            <Button variant="secondary" onClick={() => newActivity('poll')} icon={<Plus size={16} />}>New poll</Button>
            <Button variant="secondary" onClick={() => newActivity('wordcloud')} icon={<Cloud size={16} />}>New word cloud</Button>
          </div>
          {acts.length === 0 ? <EmptyState title="No activities for this session" body="Create a quiz, poll or word cloud." /> : acts.map((a) => {
            const errs = validate(a);
            return (
              <Card key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                <Badge tone={a.type === 'quiz' ? 'red' : a.type === 'poll' ? 'sky' : 'teal'}>{a.type}</Badge>
                <div className="min-w-0 flex-1"><div className="font-semibold">{a.title}</div><div className="text-xs text-ink-3">{a.type === 'wordcloud' ? a.prompt : `${a.questions.length} question${a.questions.length === 1 ? '' : 's'} · ${a.mode}`}{errs.length ? ` · ${errs[0]}` : ''}</div></div>
                {errs.length ? <Badge tone="amber">Incomplete</Badge> : <Badge tone="teal" icon={<CheckCircle2 size={12} />}>Ready</Badge>}
                <Button size="sm" variant="ghost" onClick={() => setPreview(a)} icon={<Eye size={15} />}>Preview</Button>
                <Button size="sm" variant="secondary" onClick={() => setEdit(structuredClone(a))} icon={<Pencil size={15} />}>Edit</Button>
                <Button size="sm" variant="ghost" aria-label="Delete activity" onClick={() => { update((d) => { d.activities = d.activities.filter((x) => x.id !== a.id); }); toast('Activity deleted'); }} icon={<Trash2 size={15} />} disabled={live.activityId === a.id} disabledReason="End the live activity first" />
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'scoring' && <ScoringPanel />}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && db.activities.some((a) => a.id === edit.id) ? 'Edit activity' : 'New activity'} wide footer={edit && <>
        <span className="mr-auto text-xs text-bml">{validate(edit)[0] ?? ''}</span>
        <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
        <Button disabled={validate(edit).length > 0} disabledReason={validate(edit)[0]} onClick={() => { update((d) => { const i = d.activities.findIndex((a) => a.id === edit.id); const v = { ...edit, status: 'ready' as const }; if (i >= 0) d.activities[i] = v; else d.activities.push(v); audit(d, trainer.name, 'activity.save', `Saved “${edit.title}”`); }); setEdit(null); toast('Activity saved'); }}>Save activity</Button>
      </>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" htmlFor="act-title"><input id="act-title" className={inputCls} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
              <Field label="Mode" htmlFor="act-mode"><select id="act-mode" className={inputCls} value={edit.mode} onChange={(e) => setEdit({ ...edit, mode: e.target.value as Activity['mode'] })}><option value="individual">Individual (points go to the player’s team)</option><option value="team">Team</option></select></Field>
            </div>
            {edit.type === 'wordcloud' ? <Field label="Prompt" htmlFor="act-prompt"><input id="act-prompt" className={inputCls} value={edit.prompt ?? ''} onChange={(e) => setEdit({ ...edit, prompt: e.target.value })} /></Field> : (
              <>
                {edit.questions.map((q, i) => <QuestionEditor key={q.id} q={q} onChange={(nq) => setEdit({ ...edit, questions: edit.questions.map((x, j) => (j === i ? nq : x)) })} onDelete={() => setEdit({ ...edit, questions: edit.questions.filter((_, j) => j !== i) })} />)}
                <Button variant="soft" icon={<Plus size={16} />} onClick={() => { const o1 = uid('o'); setEdit({ ...edit, questions: [...edit.questions, { id: uid('q'), text: '', kind: edit.type === 'poll' ? 'poll' : 'mc', options: [{ id: o1, text: 'Option 1' }, { id: uid('o'), text: 'Option 2' }], correct: edit.type === 'poll' ? undefined : o1, points: edit.type === 'poll' ? 0 : 100, seconds: 20 }] }); }}>Add question</Button>
              </>
            )}
          </div>
        )}
      </Modal>
      <Modal open={!!preview} onClose={() => setPreview(null)} title={`Preview · ${preview?.title ?? ''}`}>
        {preview && (preview.type === 'wordcloud' ? <p className="font-display text-lg font-bold">{preview.prompt}</p> : (
          <ol className="space-y-4">{preview.questions.map((q, i) => (
            <li key={q.id}><div className="mb-2 font-semibold">{i + 1}. {q.text}</div><ul className="space-y-1">{q.options.map((o) => <li key={o.id} className={cx('rounded-xl px-3 py-2 text-sm', o.id === q.correct ? 'bg-teal-50 font-semibold text-teal-700' : 'bg-canvas')}>{o.text}{o.id === q.correct && ' ✓'}</li>)}</ul>{q.explanation && <p className="mt-1 text-xs text-ink-3">{q.explanation}</p>}<div className="mt-1 text-xs text-ink-3">{q.seconds}s · {q.points} pts</div></li>
          ))}</ol>
        ))}
      </Modal>
      <span className="hidden">{me.id}</span>
    </div>
  );
}

function ScoringPanel() {
  const { db, update, toast } = useStore();
  const { session, trainer } = useTrainerContext();
  const real = useTick(1000);
  const [team, setTeam] = useState(db.teams[0].id);
  const [rule, setRule] = useState('team');
  const r = SCORE_RULES.find((x) => x.key === rule)!;
  const isRolePlay = session?.engage === 'roleplay';
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <SectionTitle title="Manual scoring" eyebrow="Team challenges" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Team" htmlFor="sc-team"><select id="sc-team" className={inputCls} value={team} onChange={(e) => setTeam(e.target.value)}>{db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="Award" htmlFor="sc-rule"><select id="sc-rule" className={inputCls} value={rule} onChange={(e) => setRule(e.target.value)}>{SCORE_RULES.filter((x) => ['team', 'case'].includes(x.key)).map((x) => <option key={x.key} value={x.key}>{x.label} (+{x.points})</option>)}</select></Field>
        </div>
        <Button className="mt-3" icon={<Award size={16} />} onClick={() => {
          const key = `manual:${session?.id}:${rule}:${team}`;
          let ok = false;
          update((d) => { ok = awardPoints(d, key, null, team, r.points, `${r.label} · ${session?.title}`); if (ok) audit(d, trainer.name, 'score.award', `+${r.points} to ${team} for ${r.label}`); });
          setTimeout(() => toast(ok ? `+${r.points} to ${db.teams.find((t) => t.id === team)?.name}` : 'Already awarded for this session (duplicate blocked)', ok ? 'ok' : 'warn'), 0);
        }}>Award points</Button>
        <p className="mt-2 text-xs text-ink-3">Each award can be given once per team per session. Points are never given for attendance or trainer ratings.</p>
        <div className="mt-4"><Leaderboard rows={teamPoints(db)} /></div>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Role Play Arena" eyebrow={isRolePlay ? 'This session' : 'Session 06 only'} />
        {isRolePlay ? (
          <>
            <p className="mb-3 text-sm text-ink-2">Randomly assign a fictional scenario and advisor / customer / observer roles to each team, then start a preparation countdown.</p>
            <div className="flex flex-wrap gap-2">
              <Button icon={<Shuffle size={16} />} onClick={() => update((d) => {
                const scen = [...ROLEPLAY_SCENARIOS].sort(() => Math.random() - 0.5);
                d.roleplay.assignments = d.teams.map((t, i) => {
                  const members = d.users.filter((u) => u.teamId === t.id && u.status === 'confirmed').sort(() => Math.random() - 0.5);
                  return { teamId: t.id, scenarioId: scen[i % scen.length].id, advisor: members[0]?.name ?? '—', customer: members[1]?.name ?? '—', observer: members[2]?.name ?? '—' };
                });
                audit(d, trainer.name, 'roleplay.assign', 'Randomly assigned role-play scenarios');
              })}>Assign randomly</Button>
              <Button variant="secondary" icon={<Timer size={16} />} disabled={!db.roleplay.assignments.length} disabledReason="Assign roles first" onClick={() => update((d) => { d.roleplay.prepDeadline = Date.now() + 5 * 60000; setLive(d, { venueMode: 'timer', timerLabel: 'Role play preparation', deadline: Date.now() + 5 * 60000 }); })}>Start 5-min prep</Button>
            </div>
            {db.roleplay.prepDeadline && db.roleplay.prepDeadline > real && <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-bml">{mmss(db.roleplay.prepDeadline - real)}</div>}
            <ul className="mt-3 space-y-2">{db.roleplay.assignments.map((a) => { const t = db.teams.find((x) => x.id === a.teamId)!; const s = ROLEPLAY_SCENARIOS.find((x) => x.id === a.scenarioId)!; return (
              <li key={a.teamId} className="rounded-xl bg-canvas p-3 text-sm"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} /><b>{t.name}</b><Badge tone="coral">{s.tag}</Badge></div><div className="mt-1 text-xs text-ink-3">Advisor {a.advisor} · Customer {a.customer} · Observer {a.observer}</div></li>
            ); })}</ul>
            {db.rubric.length > 0 && <div className="mt-4"><div className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-3">Observer rubrics received</div>{db.rubric.map((x) => <div key={x.id} className="flex justify-between border-b border-ink/5 py-1.5 text-sm"><span>{x.advisorName}</span><b className="tabular-nums">{x.total}%</b></div>)}</div>}
          </>
        ) : <p className="flex items-center gap-2 text-sm text-ink-3"><Users size={16} /> Role-play allocation is available on Session 06 (hosted by Ibrahim Dhaws). Switch the demo trainer to try it.</p>}
      </Card>
    </div>
  );
}

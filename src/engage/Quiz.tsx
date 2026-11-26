import React, { useState } from 'react';
import { CheckCircle2, XCircle, Timer, Trophy, RotateCcw, Lock, Send } from 'lucide-react';
import { useStore, uid, useTick } from '../lib/store';
import { keys } from '../lib/collections';
import { Badge, Button, Card, cx, Progress, inputCls } from '../components/ui';
import { QuestionVisual, WordCloud } from '../components/shared';
import type { Activity, DB, Question } from '../lib/types';
import { mmss } from '../lib/time';

/** Adds an answer locally; the server checks it, marks it correct or not and awards points. */
export function recordAnswer(d: DB, a: Activity, q: Question, userId: string, _teamId: string | null, optionId: string) {
  if (d.responses.some((r) => r.activityId === a.id && r.questionId === q.id && r.userId === userId)) return { dup: true };
  d.responses.push({ id: keys.response(a.id, q.id, userId), activityId: a.id, questionId: q.id, userId, optionId, ts: Date.now() });
  return { dup: false };
}

export function PollResults({ db, activityId, q, dark }: { db: DB; activityId: string; q: Question; dark?: boolean }) {
  const rs = db.responses.filter((r) => r.activityId === activityId && r.questionId === q.id);
  const total = rs.length;
  const colors = ['#B50928', '#7C5CFA', '#14B8A6', '#F5A524', '#3B82F6', '#FF6B4A'];
  return (
    <div className={cx('space-y-2.5', dark && 'space-y-5')}>
      {q.options.map((o, i) => {
        const n = rs.filter((r) => r.optionId === o.id).length;
        const pct = total ? Math.round((n / total) * 100) : 0;
        const isCorrect = q.correct === o.id;
        return (
          <div key={o.id}>
            <div className={cx('mb-1 flex items-center justify-between gap-2', dark ? 'text-3xl font-bold text-white' : 'text-sm font-semibold text-ink')}>
              <span className="flex min-w-0 items-center gap-2">{isCorrect && <CheckCircle2 size={dark ? 30 : 16} className="shrink-0 text-teal-500" />}<span className="truncate">{o.text}</span></span>
              <span className="shrink-0 tabular-nums">{pct}%</span>
            </div>
            <div className={cx('overflow-hidden rounded-full', dark ? 'h-6 bg-white/10' : 'h-3 bg-ink/[.06]')}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[i % colors.length] }} /></div>
          </div>
        );
      })}
      <div className={dark ? 'text-xl text-white/60' : 'text-xs text-ink-3'}>{total} response{total === 1 ? '' : 's'}</div>
    </div>
  );
}

function OptionButton({ label, idx, state, onClick, disabled }: { label: string; idx: number; state: 'idle' | 'picked' | 'correct' | 'wrong' | 'dim'; onClick?: () => void; disabled?: boolean }) {
  const letters = 'ABCDEF';
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={state === 'picked'} className={cx('flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold ring-1 ring-inset transition',
      state === 'idle' && 'bg-white text-ink ring-ink/10 hover:-translate-y-0.5 hover:ring-lav-500 hover:shadow-md',
      state === 'picked' && 'bg-lav-600 text-white ring-lav-600',
      state === 'correct' && 'bg-teal-500 text-white ring-teal-500',
      state === 'wrong' && 'bg-bml text-white ring-bml',
      state === 'dim' && 'bg-white text-ink-3 ring-ink/5 opacity-70')}>
      <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold', state === 'idle' || state === 'dim' ? 'bg-ink/5 text-ink-2' : 'bg-white/20 text-white')}>{letters[idx]}</span>
      <span className="flex-1">{label}</span>
      {state === 'correct' && <CheckCircle2 size={20} />}
      {state === 'wrong' && <XCircle size={20} />}
    </button>
  );
}

/** Self-paced quiz or poll. Points are awarded once per correct question (duplicate-protected). */
export function SelfPacedActivity({ activity }: { activity: Activity }) {
  const { db, me, update, toast, celebrate } = useStore();
  const answered = (q: Question) => db.responses.find((r) => r.activityId === activity.id && r.questionId === q.id && r.userId === me.id);
  const firstOpen = activity.questions.findIndex((q) => !answered(q));
  const [idx, setIdx] = useState(firstOpen === -1 ? activity.questions.length : firstOpen);
  const done = idx >= activity.questions.length;
  const myCorrect = activity.questions.filter((q) => answered(q)?.correct).length;
  const isQuiz = activity.type === 'quiz';

  if (done) {
    return (
      <Card className="p-6 text-center">
        <div className="anim-pop mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500"><Trophy size={32} /></div>
        <h3 className="font-display text-xl font-bold">{isQuiz ? `You scored ${myCorrect}/${activity.questions.length}` : 'Thanks for voting!'}</h3>
        <p className="mt-1 text-sm text-ink-3">{isQuiz ? `+${myCorrect * 100} points for your team. Your individual result is private to you.` : 'Results are shown below.'}</p>
        {!isQuiz && <div className="mt-5 space-y-6 text-left">{activity.questions.map((q) => <div key={q.id}><div className="mb-2 text-sm font-bold">{q.text}</div><PollResults db={db} activityId={activity.id} q={q} /></div>)}</div>}
        {isQuiz && <Button className="mt-4" variant="secondary" icon={<RotateCcw size={15} />} onClick={() => setIdx(0)}>Review answers</Button>}
      </Card>
    );
  }

  const q = activity.questions[idx];
  const mine = answered(q);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge tone="lav">{isQuiz ? 'Quiz' : 'Poll'} · {idx + 1}/{activity.questions.length}</Badge>
        <span className="text-xs font-semibold text-ink-3">{isQuiz ? 'Self-paced' : 'Anonymous to the room'}</span>
      </div>
      <Progress value={((idx + (mine ? 1 : 0)) / activity.questions.length) * 100} color="bg-lav-500" className="mb-4" label="Progress" />
      <div className="mb-4 flex items-start gap-3">
        {q.visual && <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lav-50 text-lav-600"><QuestionVisual name={q.visual} /></span>}
        <h3 className="font-display text-lg font-bold leading-snug">{q.text}</h3>
      </div>
      <div className="grid gap-2">
        {q.options.map((o, i) => {
          let state: 'idle' | 'picked' | 'correct' | 'wrong' | 'dim' = 'idle';
          if (mine) {
            if (q.kind === 'poll') state = mine.optionId === o.id ? 'picked' : 'dim';
            else state = o.id === q.correct ? 'correct' : mine.optionId === o.id ? 'wrong' : 'dim';
          }
          return <OptionButton key={o.id} idx={i} label={o.text} state={state} disabled={!!mine} onClick={() => {
            update((d) => { recordAnswer(d, activity, q, me.id, me.teamId, o.id); }).then((res) => {
              if (!res || q.kind === 'poll') return;
              const saved = res.entities.find((e) => e.c === 'responses')?.v;
              if (saved?.correct) { toast(`Correct! +${q.points} points`); celebrate(); } else if (saved) toast('Not quite. See the explanation.', 'info');
            });
          }} />;
        })}
      </div>
      {mine && q.kind !== 'poll' && q.explanation && <div className="anim-in mt-4 rounded-2xl bg-teal-50 p-4 text-sm text-ink-2"><b className="text-teal-700">Why: </b>{q.explanation}</div>}
      {mine && q.kind === 'poll' && <div className="anim-in mt-4"><PollResults db={db} activityId={activity.id} q={q} /></div>}
      <div className="mt-4 flex justify-between gap-2">
        <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Back</Button>
        <Button size="sm" disabled={!mine} disabledReason="Answer to continue" onClick={() => setIdx(idx + 1)}>{idx === activity.questions.length - 1 ? 'Finish' : 'Next question'}</Button>
      </div>
    </Card>
  );
}

/** Follows the trainer-controlled live state (same-device demo sync). */
export function LiveQuestionCard() {
  const { db, me, update, toast, celebrate } = useStore();
  const real = useTick(250);
  const live = db.live;
  const a = db.activities.find((x) => x.id === live.activityId);
  if (!a || live.phase === 'idle') return null;
  if (a.type === 'wordcloud') return <LiveWordCloud activity={a} />;
  const q = a.questions[live.questionIndex];
  if (!q) return null;
  const mine = db.responses.find((r) => r.activityId === a.id && r.questionId === q.id && r.userId === me.id);
  const remaining = live.phase === 'paused' ? live.pausedRemaining ?? 0 : live.deadline ? live.deadline - real : 0;
  const canAnswer = live.phase === 'open' && remaining > 0 && !mine;
  const revealed = live.phase === 'revealed';
  return (
    <Card className="overflow-hidden ring-2 ring-bml/30">
      <div className="flex items-center justify-between gap-2 bg-bml px-5 py-2.5 text-white">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><span className="h-2 w-2 rounded-full bg-white live-dot" /> Live on screen · {a.title}</span>
        <span className="flex items-center gap-1 font-mono text-sm font-bold tabular-nums"><Timer size={15} />{live.phase === 'paused' ? 'Paused' : live.phase === 'open' ? mmss(remaining) : revealed ? 'Answer revealed' : 'Closed'}</span>
      </div>
      <div className="p-5">
        <div className="mb-1 text-xs font-semibold text-ink-3">Question {live.questionIndex + 1} of {a.questions.length}</div>
        <h3 className="mb-4 font-display text-lg font-bold leading-snug">{q.text}</h3>
        <div className="grid gap-2">
          {q.options.map((o, i) => {
            let state: 'idle' | 'picked' | 'correct' | 'wrong' | 'dim' = 'idle';
            if (revealed && q.kind !== 'poll') state = o.id === q.correct ? 'correct' : mine?.optionId === o.id ? 'wrong' : 'dim';
            else if (mine) state = mine.optionId === o.id ? 'picked' : 'dim';
            else if (!canAnswer) state = 'dim';
            return <OptionButton key={o.id} idx={i} label={o.text} state={state} disabled={!canAnswer} onClick={() => {
              update((d) => { recordAnswer(d, a, q, me.id, me.teamId, o.id); });
              toast('Answer locked in');
            }} />;
          })}
        </div>
        {mine && !revealed && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-lav-700"><Lock size={15} /> Answer locked in. Watch the screen for the reveal.</p>}
        {!mine && live.phase !== 'open' && !revealed && <p className="mt-3 text-sm text-ink-3">{live.phase === 'paused' ? 'The trainer paused this question.' : 'Voting is closed for this question.'}</p>}
        {revealed && q.kind !== 'poll' && (
          <div className="anim-in mt-4 rounded-2xl bg-teal-50 p-4 text-sm text-ink-2">
            <b className={mine?.correct ? 'text-teal-700' : 'text-bml'}>{mine ? (mine.correct ? `Correct! +${q.points} points. ` : 'Not this time. ') : 'You didn’t answer. '}</b>{q.explanation}
            {mine?.correct && <button className="sr-only" onClick={celebrate}>celebrate</button>}
          </div>
        )}
        {(revealed || (mine && q.kind === 'poll')) && q.kind === 'poll' && <div className="mt-4"><PollResults db={db} activityId={a.id} q={q} /></div>}
      </div>
    </Card>
  );
}

export function LiveWordCloud({ activity }: { activity: Activity }) {
  const { db, me, update, toast } = useStore();
  const [w, setW] = useState('');
  const mine = db.words.filter((x) => x.activityId === activity.id && x.userId === me.id);
  const all = db.words.filter((x) => x.activityId === activity.id).map((x) => x.word);
  const submit = () => {
    const word = w.trim().replace(/\s+/g, ' ');
    if (!word) return;
    if (mine.length >= 3) { toast('You can add up to three words', 'warn'); return; }
    if (mine.some((m) => m.word.toLowerCase() === word.toLowerCase())) { toast('You already added that word', 'warn'); return; }
    update((d) => { d.words.push({ id: uid('w'), activityId: activity.id, userId: me.id, word: word.slice(0, 24), ts: Date.now() }); });
    setW('');
  };
  return (
    <Card className="p-5">
      <Badge tone="lav">Word cloud</Badge>
      <h3 className="mt-2 font-display text-lg font-bold">{activity.prompt}</h3>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor="wc-input" className="sr-only">Your word</label>
        <input id="wc-input" className={inputCls} maxLength={24} value={w} onChange={(e) => setW(e.target.value)} placeholder={mine.length >= 3 ? 'Thanks! Three words added.' : 'One or two words'} disabled={mine.length >= 3} />
        <Button type="submit" disabled={!w.trim() || mine.length >= 3} disabledReason="Up to three words each" icon={<Send size={15} />}>Add</Button>
      </form>
      <div className="mt-1 text-xs text-ink-3">{mine.length}/3 words added · shown without names</div>
      <div className="mt-5 min-h-[160px] rounded-2xl bg-canvas p-4"><WordCloud words={all} /></div>
    </Card>
  );
}

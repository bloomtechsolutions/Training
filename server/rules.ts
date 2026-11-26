// Server-side authorisation, effects (scoring) and read redaction.
// Every change a client sends passes through authorise(); nothing the client says about
// roles, points or correctness is trusted.
import type { Actor } from './auth.js';
import { keys, SINGLE_KEY } from '../src/lib/collections.js';
import { HttpError } from './db.js';

export const DEMO_MODE = () => process.env.DEMO_MODE === 'true';

export interface Ctx {
  actor: Actor;
  get(c: string, k: string): Promise<any | null>;
  list(c: string, where?: { ownerId?: string }): Promise<{ k: string; v: any }[]>;
  write(c: string, k: string, v: any | null): void; // queue an extra (effect) write
  now: number;
}

const deny = (msg: string): never => { throw new HttpError(403, msg); };
const same = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

function toggleVotes(cur: any, v: any, me: string) {
  const want = Array.isArray(v?.votes) && v.votes.includes(me);
  const votes: string[] = (cur.votes ?? []).filter((x: string) => x !== me);
  if (want) votes.push(me);
  return { ...cur, votes };
}

async function award(ctx: Ctx, key: string, userId: string | null, teamId: string | null, points: number, reason: string) {
  if (await ctx.get('scores', key)) return;
  ctx.write('scores', key, { key, userId, teamId, points, reason, ts: ctx.now });
}

async function teamOf(ctx: Ctx, userId: string) {
  return (await ctx.get('users', userId))?.teamId ?? null;
}

async function assignedSession(ctx: Ctx, sessionId: string | undefined) {
  if (!sessionId) return false;
  const s = await ctx.get('sessions', sessionId);
  return !!s && Array.isArray(s.trainerIds) && s.trainerIds.includes(ctx.actor.trainerId);
}

/** Validate a quiz/poll answer against the live state and score it on the server. */
async function acceptResponse(ctx: Ctx, k: string, v: any, cur: any) {
  if (cur) deny('You have already answered this question.');
  const a = await ctx.get('activities', v.activityId);
  if (!a) deny('Activity not found.');
  const qi = (a.questions ?? []).findIndex((q: any) => q.id === v.questionId);
  if (qi < 0) deny('Question not found.');
  const q = a.questions[qi];
  if (!q.options.some((o: any) => o.id === v.optionId)) deny('Invalid answer.');
  if (k !== keys.response(v.activityId, v.questionId, v.userId)) deny('Invalid response key.');
  const live = await ctx.get('live', SINGLE_KEY);
  const L = live?.value;
  if (L && L.activityId === a.id && L.phase !== 'idle' && ctx.actor.role === 'participant') {
    if (L.questionIndex !== qi) deny('This question is not open right now.');
    if (L.phase !== 'open') deny('Voting is closed for this question.');
    if (L.deadline && ctx.now > L.deadline + 2000) deny('Time is up for this question.');
  }
  const correct = q.kind === 'poll' ? undefined : q.correct === v.optionId;
  const out = { id: k, activityId: a.id, questionId: q.id, userId: v.userId, optionId: v.optionId, correct, ts: ctx.now };
  if (correct) await award(ctx, `quiz:${a.id}:${q.id}:${v.userId}`, v.userId, await teamOf(ctx, v.userId), q.points ?? 100, `Correct answer · ${a.title}`);
  return out;
}

async function acceptWord(ctx: Ctx, v: any, cur: any) {
  if (cur) deny('Words cannot be edited.');
  const word = String(v.word ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!word) deny('Enter a word.');
  const mine = (await ctx.list('words', { ownerId: v.userId })).filter((w) => w.v.activityId === v.activityId);
  if (mine.length >= 3) deny('Up to three words each.');
  return { id: v.id, activityId: v.activityId, userId: v.userId, word, ts: ctx.now };
}

export async function authorise(ctx: Ctx, c: string, k: string, v: any | null): Promise<any | null> {
  const { actor } = ctx;
  const cur = await ctx.get(c, k);

  if (c === 'audit') {
    if (actor.role !== 'admin' && actor.role !== 'trainer') deny('Not allowed.');
    if (v === null || cur) deny('Audit entries cannot be changed.');
    return { ...v, actor: `${actor.name}${actor.role === 'trainer' ? ' (trainer)' : ''}`, ts: ctx.now };
  }

  if (actor.role === 'admin') {
    if (c === 'responses' && v) return acceptResponse(ctx, k, v, cur);
    if (c === 'users' && v && !cur) ctx.write('__account', v.id, v);
    return v;
  }

  if (actor.role === 'leadership' || actor.role === 'venue') deny('This role is read-only.');

  if (actor.role === 'trainer') {
    switch (c) {
      case 'live': {
        if (!v) deny('Not allowed.');
        return v;
      }
      case 'activities': {
        const sid = v?.sessionId ?? cur?.sessionId;
        if (!(await assignedSession(ctx, sid))) deny('You can only edit activities for your assigned sessions.');
        return v;
      }
      case 'blocks': {
        const sid = v?.sessionId ?? cur?.sessionId;
        if (!(await assignedSession(ctx, sid))) deny('You can only plan your assigned sessions.');
        return v;
      }
      case 'decks': {
        if (!(await assignedSession(ctx, k))) deny('You can only edit slides for your assigned sessions.');
        return v;
      }
      case 'qa': {
        if (!cur || !v) deny('Not allowed.');
        const next = { ...cur, onScreen: !!v.onScreen };
        if (v.status !== cur.status || v.answer !== cur.answer) {
          if (cur.channel !== 'session' || !(await assignedSession(ctx, cur.sessionId))) deny('You can only moderate questions for your sessions.');
          next.status = v.status; next.answer = String(v.answer ?? '').slice(0, 1000);
        }
        return next;
      }
      case 'scores': {
        if (cur || !v) deny('Points cannot be changed once awarded.');
        if (!String(k).startsWith('manual:') || v.userId || !v.teamId || v.points > 300 || v.points < 0) deny('Trainers can award team points only.');
        return { ...v, ts: ctx.now };
      }
      case 'roleplay':
        return v;
      case 'resources': {
        if (cur || !v) deny('Only organisers can change resources.');
        return { ...v, status: 'pending' };
      }
      case 'responses':
      case 'words': {
        if (!DEMO_MODE()) deny('Simulated responses are only available in demo mode.');
        if (!v) deny('Not allowed.');
        return c === 'responses' ? acceptResponse(ctx, k, v, cur) : acceptWord(ctx, v, cur);
      }
      default:
        deny('Trainers cannot change this.');
    }
  }

  // Participant
  if (!actor.userId) deny('No participant profile linked to this account.');
  const me = actor.userId as string;
  switch (c) {
    case 'notes': {
      if (!k.startsWith(`${me}:`)) deny('Not your notes.');
      if (v) {
        const done = (v.learned ?? []).filter((x: string) => String(x).trim()).length >= 3 && String(v.action ?? '').trim();
        if (done) await award(ctx, `reflection:${me}:${k.slice(me.length + 1)}`, me, await teamOf(ctx, me), 50, 'Reflection completed');
      }
      return v;
    }
    case 'bookmarks': case 'readAnnouncements': case 'prefs': {
      if (k !== me) deny('Not yours.');
      return v;
    }
    case 'selfAssess': {
      if (k !== me || (v && v.userId !== me)) deny('Not yours.');
      return v;
    }
    case 'scenarioProgress': {
      if (!v || v.userId !== me || !k.startsWith(`${me}:`)) deny('Not yours.');
      if (v.done) await award(ctx, `case:${v.scenarioId}:${me}`, me, await teamOf(ctx, me), 100, 'Case study completed');
      return v;
    }
    case 'responses': {
      if (!v || v.userId !== me) deny('Not yours.');
      return acceptResponse(ctx, k, v, cur);
    }
    case 'words': {
      if (!v || v.userId !== me) deny('Not yours.');
      return acceptWord(ctx, v, cur);
    }
    case 'feedback': {
      if (cur) deny('You have already submitted this feedback.');
      if (!v || v.userId !== me || k !== keys.feedback(v.eventId, v.sessionId, v.trainerId, me)) deny('Invalid feedback.');
      return { ...v, ts: ctx.now };
    }
    case 'qa': {
      if (!cur) {
        if (!v || v.userId !== me) deny('Not yours.');
        return { ...v, status: 'pending', votes: [], answer: '', onScreen: false, text: String(v.text).slice(0, 300), ts: ctx.now };
      }
      if (!v || cur.status === 'pending' || cur.status === 'rejected') deny('Not allowed.');
      return toggleVotes(cur, v, me);
    }
    case 'challenges': {
      if (!cur) {
        if (!v || v.userId !== me) deny('Not yours.');
        return { ...v, status: 'pending', votes: [], solution: '', text: String(v.text).slice(0, 140), ts: ctx.now };
      }
      if (!v || cur.status !== 'approved') deny('Not allowed.');
      return toggleVotes(cur, v, me);
    }
    case 'ideas': {
      if (!cur) {
        if (!v || v.userId !== me) deny('Not yours.');
        await award(ctx, `idea:${k}`, me, await teamOf(ctx, me), 100, 'Innovation submission');
        return { ...v, status: 'submitted', votes: [], owner: '', due: '', progress: 0, ts: ctx.now };
      }
      if (!v || cur.userId === me) deny('You cannot vote for your own idea.');
      return toggleVotes(cur, v, me);
    }
    case 'rubric': {
      if (cur || !v || v.observerId !== me) deny('Not allowed.');
      return { ...v, ts: ctx.now };
    }
    case 'photos': {
      if (cur || !v || v.userId !== me) deny('Not allowed.');
      return { ...v, status: 'pending', ts: ctx.now };
    }
    case 'commitments': {
      const owner = (v ?? cur)?.userId;
      if (owner !== me || (cur && cur.userId !== me)) deny('Not yours.');
      if (!v) return null;
      const next = { ...v, review: cur?.review ?? null };
      if (v.progress >= 100) {
        await award(ctx, `commitment:${k}`, me, await teamOf(ctx, me), 100, 'Completed commitment');
        if (!next.review) next.review = { status: 'pending', note: '', reviewer: '' };
      }
      return next;
    }
    case 'attendance': {
      if (!cur || cur.userId !== me || !v) deny('Use the check-in screen to record attendance.');
      if (cur.checkOut) deny('Already checked out.');
      return { ...cur, checkOut: ctx.now };
    }
    case 'trainers': {
      if (!cur || !v) deny('Not allowed.');
      const known = new Set((cur.questions ?? []).map((q: any) => q.id));
      const added = (v.questions ?? []).filter((q: any) => !known.has(q.id) && q.userId === me).map((q: any) => ({ id: q.id, userId: me, text: String(q.text).slice(0, 280), ts: ctx.now }));
      if (!added.length) deny('Not allowed.');
      return { ...cur, questions: [...(cur.questions ?? []), ...added] };
    }
    default:
      deny('Participants cannot change this.');
  }
  return null;
}

export function ownerOf(c: string, k: string, v: any): string | null {
  if (!v) return null;
  switch (c) {
    case 'notes': return k.split(':')[0];
    case 'bookmarks': case 'readAnnouncements': case 'prefs': return k;
    case 'rubric': return v.observerId ?? null;
    case 'users': return v.id;
    default: return typeof v.userId === 'string' ? v.userId : null;
  }
}
export const eventOf = (v: any) => (v && typeof v.eventId === 'string' ? v.eventId : null);

// ---------------- Read redaction ----------------

export interface ReadCtx { actor: Actor; live: any | null; answered: Set<string> }

const PRIVATE_OWN = new Set(['notes', 'bookmarks', 'readAnnouncements', 'prefs', 'selfAssess', 'scenarioProgress', 'commitments', 'certificates', 'rubric', 'attendance', 'feedback']);

function redactActivity(a: any, r: ReadCtx) {
  const L = r.live;
  return {
    ...a,
    questions: (a.questions ?? []).map((q: any, i: number) => {
      const revealed = L && L.activityId === a.id && L.questionIndex === i && L.phase === 'revealed';
      if (revealed || r.answered.has(`${a.id}:${q.id}`)) return q;
      const { correct, explanation, ...rest } = q;
      return rest;
    }),
  };
}

/** Returns what this actor may see of an entity, or null if hidden. */
export function redact(r: ReadCtx, c: string, k: string, v: any): any | null {
  if (v === null || v === undefined) return null;
  const role = r.actor.role;
  if (role === 'admin') return v;
  const me = r.actor.userId;

  if (c === 'audit') return null;
  if (c === 'users') {
    if (v.id === me) return v;
    const { email, staffId, ...rest } = v;
    return { ...rest, email: '', staffId: '' };
  }

  if (role === 'leadership') {
    if (['notes', 'bookmarks', 'readAnnouncements', 'prefs', 'selfAssess'].includes(c)) return null;
    if (c === 'feedback') return { ...v, userId: 'anon' };
    if (c === 'decks') return { ...v, slides: (v.slides ?? []).map((s: any) => ({ ...s, notes: '' })) };
    return v;
  }

  if (role === 'trainer') {
    if (['notes', 'bookmarks', 'readAnnouncements', 'prefs', 'selfAssess', 'feedback', 'commitments', 'certificates', 'scenarioProgress'].includes(c)) return null;
    if (c === 'trainers' && v.id !== r.actor.trainerId) return { ...v, questions: [] };
    return v;
  }

  // participant and venue display
  if (PRIVATE_OWN.has(c)) {
    if (c === 'notes') return k.startsWith(`${me}:`) ? v : null;
    if (['bookmarks', 'readAnnouncements', 'prefs'].includes(c)) return k === me ? v : null;
    if (c === 'rubric') return v.observerId === me ? v : null;
    return v.userId === me ? v : null;
  }
  switch (c) {
    case 'responses': return v.userId === me ? v : { ...v, userId: 'anon' };
    case 'words': return v.userId === me ? v : { ...v, userId: 'anon' };
    case 'scores': return v.userId === me ? v : { ...v, userId: null };
    case 'qa':
      if (v.userId === me) return v;
      if (v.status === 'pending' || v.status === 'rejected') return null;
      return v.anonymous ? { ...v, userId: 'anon' } : v;
    case 'challenges': case 'photos':
      if (v.userId === me) return v;
      return v.status === 'approved' ? v : null;
    case 'trainers': return { ...v, questions: (v.questions ?? []).filter((q: any) => q.userId === me) };
    case 'resources': return v.status === 'approved' && v.audience === 'participants' ? v : null;
    case 'decks': return { ...v, slides: (v.slides ?? []).map((s: any) => ({ ...s, notes: '' })) };
    case 'activities': return redactActivity(v, r);
    case 'roleplay': return v;
    default: return v;
  }
}

export { same };

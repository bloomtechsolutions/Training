// Seed data for the demo. Everything here is fictional demonstration data,
// except the 27–28 Nov 2026 agenda, trainer names and region names, which come
// from the programme brief. Designations, departments and biographies are left
// blank on purpose: they must be supplied by BML, not invented.
import type {
  Activity, AttendanceRecord, DB, Deck, Feedback, Idea, Photo, QAItem, Resource, ScoreEntry, Session,
  SessionBlock, Slide, Team, Trainer, User, WordEntry, ChallengePost, Commitment, Announcement,
} from './types.js';
import { mvtEpoch } from './time.js';

export const DB_VERSION = 4;
export const EVENT_ID = 'ev-2026-11';

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const REGIONS = [
  { id: 'north', name: 'North' },
  { id: 'north-central', name: 'North Central' },
  { id: 'central', name: 'Central' },
  { id: 'south-central', name: 'South Central' },
  { id: 'south', name: 'South' },
  { id: 'male', name: 'Malé' },
];

export const TEAMS: Team[] = [
  { id: 'ignite', name: 'Ignite', color: '#E11D48', tint: '#FFE4EA' },
  { id: 'elevate', name: 'Elevate', color: '#7C3AED', tint: '#EFE7FF' },
  { id: 'impact', name: 'Impact', color: '#0D9488', tint: '#D5F5F0' },
  { id: 'momentum', name: 'Momentum', color: '#D97706', tint: '#FFEFCF' },
  { id: 'aspire', name: 'Aspire', color: '#2563EB', tint: '#DDEAFF' },
];

const TRAINERS: Trainer[] = [
  { id: 't-nishwan', name: 'Abdulla Nishwan', kind: 'staff', color: '#B50928' },
  { id: 't-unaifath', name: 'Fathimath Unaifath Ahmed', kind: 'staff', color: '#7C5CFA' },
  { id: 't-zima', name: 'Hawwa Zima', kind: 'staff', color: '#0E9384' },
  { id: 't-shaig', name: 'Mohamed Shaig Ahmed', kind: 'staff', color: '#E8502F' },
  { id: 't-nasid', name: 'Mohamed Nasid', kind: 'staff', color: '#2563EB' },
  { id: 't-dhaws', name: 'Ibrahim Dhaws', kind: 'staff', color: '#D98A0B' },
  { id: 't-suhan', name: 'Mohamed Suhan', kind: 'staff', color: '#9333EA' },
  { id: 't-riza', name: 'Ahmed Riza', kind: 'staff', color: '#0F766E' },
  { id: 't-pdretail', name: 'PD / Retail', kind: 'group', color: '#4A4560' },
  { id: 't-vendor', name: 'External engagement vendor', kind: 'vendor', color: '#D97706' },
  { id: 't-participants', name: 'Participants', kind: 'participants', color: '#14B8A6' },
].map((t) => ({ ...t, designation: '', department: '', expertise: [], bio: '', questions: [] })) as Trainer[];

type S = Omit<Session, 'eventId' | 'order'>;
const SESSIONS: S[] = [
  { id: 's-v1', day: 1, start: '09:00', end: '11:00', code: null, title: 'Engagement Activity', description: 'Morning engagement programme run by the external engagement vendor.', kind: 'vendor', trainerIds: ['t-vendor'], trainerLabel: 'External vendor', objectives: [], engage: 'external' },
  { id: 's-01', day: 1, start: '14:00', end: '14:15', code: '01', title: 'Ice Breaker', description: 'Opening session to welcome participants, set the tone and form teams.', kind: 'session', trainerIds: ['t-pdretail'], trainerLabel: 'PD / Retail', objectives: ['Meet colleagues from other service centres', 'Join your team for the two days'], engage: 'icebreaker' },
  { id: 's-02', day: 1, start: '14:15', end: '15:00', code: '02', title: 'Performance – Strategy, Drive & Business Focus', description: 'Participants present their service centre performance and business priorities.', kind: 'session', trainerIds: ['t-participants'], trainerLabel: 'Participants', objectives: ['Share service centre performance and priorities', 'Learn from peers in other locations'], engage: 'performance' },
  { id: 's-b1', day: 1, start: '15:00', end: '15:30', code: null, title: 'Break / Prayer', description: 'Break and prayer time.', kind: 'break', trainerIds: [], trainerLabel: '—', objectives: [], engage: null },
  { id: 's-03', day: 1, start: '15:30', end: '16:30', code: '03', title: 'Commercial Updates', description: 'Product and process updates relevant to service centre staff.', kind: 'session', trainerIds: ['t-nishwan'], trainerLabel: 'Abdulla Nishwan', objectives: ['Understand recent product and process updates', 'Explain changes and customer benefits clearly'], engage: 'commercial' },
  { id: 's-04', day: 1, start: '16:30', end: '17:00', code: '04', title: 'Staff Development Training', description: 'Staff development opportunities and personal development planning.', kind: 'session', trainerIds: ['t-unaifath'], trainerLabel: 'Fathimath Unaifath Ahmed', objectives: ['Reflect on your current skills', 'Set personal development goals'], engage: 'development' },
  { id: 's-v2', day: 1, start: '20:00', end: '22:30', code: null, title: 'Engagement Activity', description: 'Evening engagement programme run by the external engagement vendor.', kind: 'vendor', trainerIds: ['t-vendor'], trainerLabel: 'External vendor', objectives: [], engage: 'external' },
  { id: 's-05', day: 2, start: '09:00', end: '09:30', code: '05', title: 'Rapid Questions – Do You Know Our Products?', description: 'A fast-paced product knowledge sprint with a live team leaderboard.', kind: 'session', trainerIds: ['t-zima', 't-shaig', 't-nasid'], trainerLabel: 'Hawwa Zima / Mohamed Shaig Ahmed / Mohamed Nasid', objectives: ['Test and refresh product knowledge', 'Learn from instant explanations'], engage: 'sprint' },
  { id: 's-06', day: 2, start: '09:30', end: '10:30', code: '06', title: 'Role Play', description: 'Participants practise customer conversations in assigned roles, with observers scoring against a rubric.', kind: 'session', trainerIds: ['t-participants', 't-dhaws'], trainerLabel: 'Participants (hosted by Ibrahim Dhaws)', objectives: ['Practise needs-based customer conversations', 'Give and receive structured feedback'], engage: 'roleplay' },
  { id: 's-07', day: 2, start: '10:30', end: '12:00', code: '07', title: 'Communication', description: 'Communication with customers and colleagues, using scenarios and live decisions.', kind: 'session', trainerIds: ['t-suhan'], trainerLabel: 'Mohamed Suhan', objectives: ['Recognise what makes communication effective', 'Apply it to real customer situations'], engage: 'communication' },
  { id: 's-b2', day: 2, start: '12:00', end: '13:00', code: null, title: 'Lunch Break', description: 'Lunch break.', kind: 'break', trainerIds: [], trainerLabel: '—', objectives: [], engage: null },
  { id: 's-08', day: 2, start: '13:00', end: '14:00', code: '08', title: 'Challenges', description: 'Participants raise day-to-day challenges and solve them in groups.', kind: 'session', trainerIds: ['t-participants', 't-nasid', 't-zima'], trainerLabel: 'Participants (hosted by Mohamed Nasid / Hawwa Zima)', objectives: ['Surface real challenges from service centres', 'Agree practical solutions together'], engage: 'challenges' },
  { id: 's-09', day: 2, start: '14:00', end: '15:30', code: '09', title: 'Advisory Role', description: 'The advisory role in practice: understanding customers and guiding them to suitable solutions.', kind: 'session', trainerIds: ['t-riza'], trainerLabel: 'Ahmed Riza', objectives: ['Identify genuine customer needs', 'Match needs to suitable solutions'], engage: 'advisory' },
  { id: 's-10', day: 2, start: '15:30', end: '16:00', code: '10', title: 'Innovation', description: 'Pitch, vote on and shortlist ideas that improve customer and staff experience.', kind: 'session', trainerIds: ['t-shaig', 't-nasid'], trainerLabel: 'Mohamed Shaig Ahmed / Mohamed Nasid', objectives: ['Turn everyday challenges into ideas', 'Shortlist ideas for follow-up'], engage: 'innovation' },
];

const NAMES = ['Aishath R.', 'Mohamed F.', 'Fathimath S.', 'Ahmed N.', 'Mariyam H.', 'Ibrahim A.', 'Hawwa M.', 'Hassan R.', 'Aminath L.', 'Ali S.', 'Khadeeja I.', 'Hussain Z.', 'Shifa A.', 'Yoosuf M.', 'Mariyam N.', 'Ismail H.', 'Zeenath A.', 'Abdulla K.', 'Raheema S.', 'Moosa J.', 'Nashiya M.', 'Adam S.', 'Sheena R.', 'Ahmed S.', 'Fazeela H.', 'Mohamed I.', 'Aishath N.', 'Ibrahim R.', 'Hawwa S.', 'Ali M.', 'Aminath F.', 'Hussain A.', 'Shaheema M.', 'Ismail N.', 'Mariyam A.', 'Yoosuf H.'];
const DESIGNATIONS = ['Customer Service Officer', 'Senior Customer Service Officer', 'Teller', 'Service Centre Officer'];

const q = (id: string, text: string, kind: 'mc' | 'tf' | 'poll', options: string[], correct: number | null = null, explanation = '', seconds = 20, points = 100, visual?: string) => ({
  id, text, kind, points: kind === 'poll' ? 0 : points, seconds, explanation, visual,
  options: options.map((t, i) => ({ id: `${id}-o${i}`, text: t })),
  correct: correct === null ? undefined : `${id}-o${correct}`,
});

export const SEED_ACTIVITIES: Activity[] = [
  { id: 'a-ice', sessionId: 's-01', type: 'poll', title: 'Ice breaker polls', mode: 'individual', status: 'ready', questions: [
    q('ice1', 'How are you arriving today?', 'poll', ['Energised', 'Curious', 'Tired but here', 'Ready to learn']),
    q('ice2', 'Which customer moment made you proudest this year?', 'poll', ['Solving a tricky problem', 'Helping someone go digital', 'A thank-you note', 'Winning a customer back']),
  ] },
  { id: 'a-perf', sessionId: 's-02', type: 'poll', title: 'Business priorities poll', mode: 'individual', status: 'ready', questions: [
    q('perf1', 'Which priority will most move your service centre next quarter?', 'poll', ['Digital adoption', 'Customer experience', 'Needs-based conversations', 'Team capability']),
  ] },
  { id: 'a-com', sessionId: 's-03', type: 'quiz', title: 'Commercial updates knowledge check', mode: 'individual', status: 'ready', questions: [
    q('com1', 'Before explaining a product change to a customer, where should you confirm the details?', 'mc', ['From memory of last year’s training', 'The latest approved internal communication or product guide', 'A colleague’s summary on chat', 'The customer’s understanding'], 1, 'Always rely on the latest approved source. Details change, and memory or second-hand summaries can be out of date.'),
    q('com2', 'It is fine to quote a rate you remember from a previous campaign if the customer is in a hurry.', 'tf', ['True', 'False'], 1, 'Never quote rates or terms from memory. Confirm the current approved figure first.'),
  ] },
  { id: 'a-sprint', sessionId: 's-05', type: 'quiz', title: 'Product Sprint', mode: 'team', status: 'ready', questions: [
    q('sp1', 'A customer asks which account is “best”. What should you do first?', 'mc', ['Recommend the account with the highest target this month', 'Ask questions to understand their needs and goals', 'Hand over every brochure', 'Suggest they check the website'], 1, 'Understanding needs comes before any recommendation. The “best” product depends on the customer’s goals.', 20, 100, 'search'),
    q('sp2', 'When helping a customer with digital banking, the aim is for them to use it independently and securely.', 'tf', ['True', 'False'], 0, 'Guide customers so they can complete tasks themselves, safely, on their own device.', 15, 100, 'smartphone'),
    q('sp3', 'A customer struggles to register for mobile banking. Which approach builds safe, independent use?', 'mc', ['Ask for their PIN and set it up for them', 'Guide them step by step while they enter their own details', 'Tell them to come back when they have time', 'Register them on your own phone first'], 1, 'Customers should always enter their own credentials. Your role is to guide, not to handle their secrets.', 20, 100, 'shield'),
    q('sp4', 'Which is the clearest sign of a genuine customer need?', 'mc', ['The product is part of this month’s campaign', 'The customer describes a goal the product helps achieve', 'The customer did not say no', 'A colleague sold it to a similar customer'], 1, 'Genuine needs come from the customer’s own goals and situation, not from targets.', 20, 100, 'heart-handshake'),
    q('sp5', 'Sharing a customer’s one-time password with a colleague is acceptable if it speeds up service.', 'tf', ['True', 'False'], 1, 'One-time passwords must never be shared. Remind customers never to share them with anyone, including bank staff.', 15, 100, 'lock'),
    q('sp6', 'A customer wants to save regularly for a child’s education. What is your best next step?', 'mc', ['Open the first savings product you think of', 'Explore their timeline, amount and preferences before suggesting options', 'Recommend a credit card for flexibility', 'Ask them to decide on their own'], 1, 'Explore the goal first: timeline, amount, preferences (for example, Shariah-compliant options) and then match.', 20, 100, 'graduation-cap'),
  ] },
  { id: 'a-wc', sessionId: 's-07', type: 'wordcloud', title: 'Exceptional advisor word cloud', prompt: 'What makes an exceptional financial advisor?', mode: 'individual', status: 'ready', questions: [] },
  { id: 'a-comm', sessionId: 's-07', type: 'poll', title: 'Communication decisions', mode: 'individual', status: 'ready', questions: [
    q('cm1', 'A customer is upset after a long wait. What do you do first?', 'poll', ['Explain the queue system', 'Acknowledge the wait and apologise sincerely', 'Ask them to fill a complaint form', 'Serve them quickly without comment']),
    q('cm2', 'A customer uses unfamiliar financial terms incorrectly. How do you respond?', 'poll', ['Correct them immediately', 'Use their words, then gently clarify with plain language', 'Ignore it', 'Give them a glossary']),
  ] },
];

export const SEED_WORDS = ['Trust', 'Listening', 'Empathy', 'Knowledge', 'Honesty', 'Patience', 'Trust', 'Clarity', 'Listening', 'Respect', 'Empathy', 'Trust', 'Follow-up', 'Curiosity', 'Listening', 'Integrity', 'Care', 'Knowledge'];

function deckFor(s: S): Deck {
  const acc = ['#B50928', '#5B3FD9', '#0E9384', '#E8502F', '#2563EB', '#D98A0B'][Number(s.code ?? 0) % 6];
  const slides: Slide[] = [
    { id: `${s.id}-sl1`, layout: 'title', title: s.title, subtitle: `Session ${s.code} · ${s.trainerLabel}`, bullets: [], notes: 'Welcome everyone. Introduce yourself and the session goals. (Sample speaker note — replace with your own.)', accent: acc },
    { id: `${s.id}-sl2`, layout: 'bullets', title: 'What we will cover', bullets: s.objectives.length ? s.objectives : ['Objectives to be confirmed by trainer'], notes: 'Walk through the objectives. Ask who has a question already.', accent: acc },
    { id: `${s.id}-sl3`, layout: 'statement', title: 'Customer first, digital first', subtitle: 'Sample slide · replace with the approved deck', bullets: [], notes: 'Pause here. Ask: what does customer first look like in your service centre?', accent: acc },
    { id: `${s.id}-sl4`, layout: 'bullets', title: 'Key points', bullets: ['Placeholder point one (content to be supplied)', 'Placeholder point two', 'Placeholder point three'], notes: 'Expand on each point with a local example.', accent: acc },
    { id: `${s.id}-sl5`, layout: 'activity', title: 'Your turn', subtitle: 'Join the live activity on your phone', bullets: [], notes: 'Launch the live activity from presenter controls.', accent: acc },
    { id: `${s.id}-sl6`, layout: 'statement', title: 'Questions & reflections', subtitle: 'Write one thing you will apply this week', bullets: [], notes: 'Invite questions. Remind participants to add notes in their notebook.', accent: acc },
  ];
  return { sessionId: s.id, name: `${s.title} – sample deck`, slides, source: 'sample', uploads: [] };
}

const BLOCK_PLAN: Record<string, [SessionBlock['type'], string, number][]> = {
  's-01': [['presentation', 'Welcome slides', 3], ['poll', 'Ice breaker polls', 7], ['team', 'Team allocation reveal', 5]],
  's-02': [['presentation', 'Service centre performance cards', 30], ['poll', 'Business priorities poll', 5], ['discussion', 'Peer questions', 10]],
  's-03': [['presentation', 'Commercial updates deck', 35], ['resource', 'Update cards (swipeable)', 10], ['quiz', 'Knowledge check', 10], ['feedback', 'Session feedback', 5]],
  's-04': [['presentation', 'Development pathways', 15], ['question', 'Skills self-assessment', 10], ['commitment', 'Personal development goal', 5]],
  's-05': [['quiz', 'Product Sprint', 25], ['feedback', 'Session feedback', 5]],
  's-06': [['case', 'Scenario allocation', 5], ['team', 'Role plays with observer rubric', 45], ['discussion', 'Debrief', 10]],
  's-07': [['presentation', 'Communication deck', 40], ['wordcloud', 'Exceptional advisor word cloud', 10], ['poll', 'Communication decisions', 15], ['case', 'Customer scenarios', 20], ['feedback', 'Session feedback', 5]],
  's-08': [['discussion', 'Challenge wall', 20], ['team', 'Group problem solving', 30], ['poll', 'Vote on solutions', 10]],
  's-09': [['presentation', 'Advisory role deck', 30], ['case', 'Branching advisory scenarios', 40], ['question', 'Customer profile matching', 15], ['feedback', 'Session feedback', 5]],
  's-10': [['presentation', 'Innovation brief', 5], ['team', 'Idea pitches', 15], ['poll', 'Vote & shortlist', 10]],
};

export function buildSeed(): DB {
  const r = rng(20261127);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const now = Date.now();

  const serviceCentres = REGIONS.flatMap((reg) => [1, 2, 3].map((n) => ({ id: `${reg.id}-sc${n}`, regionId: reg.id, name: `${reg.name} Service Centre ${n}` })));

  const users: User[] = NAMES.map((name, i) => {
    const reg = REGIONS[i % REGIONS.length];
    return {
      id: `u${String(i + 1).padStart(2, '0')}`,
      name,
      staffId: `D${String(1001 + i)}`,
      email: `demo.participant${i + 1}@example.test`,
      regionId: reg.id,
      scId: `${reg.id}-sc${(Math.floor(i / 6) % 3) + 1}`,
      designation: DESIGNATIONS[i % DESIGNATIONS.length],
      teamId: TEAMS[i % TEAMS.length].id,
      status: i === 35 ? 'registered' : 'confirmed',
      eventIds: [EVENT_ID],
      demo: true,
    };
  });

  const sessions: Session[] = SESSIONS.map((s, i) => ({ ...s, eventId: EVENT_ID, order: i }));
  const days = [{ date: '2026-11-27', theme: 'Align & Connect' }, { date: '2026-11-28', theme: 'Learn & Transform' }];

  // Attendance: Day 1 already happened in the default demo clock (Sat 28 Nov, 09:12).
  const attendance: AttendanceRecord[] = [];
  const day1 = sessions.filter((s) => s.day === 1 && s.kind !== 'break');
  users.forEach((u, ui) => {
    if (u.status !== 'confirmed') return;
    day1.forEach((s) => {
      if (ui === 7 && s.id === 's-v2') return; // one absence for exception demo
      const late = r() < 0.08;
      const start = mvtEpoch(days[0].date, s.start);
      attendance.push({ id: `att-${u.id}-${s.id}`, eventId: EVENT_ID, sessionId: s.id, userId: u.id, checkIn: start - 6 * 60000 + Math.floor(r() * 8 * 60000) + (late ? 14 * 60000 : 0), checkOut: null, late, method: 'qr', status: late ? 'late' : 'present' });
    });
    if (ui > 0 && ui < 24) {
      const start = mvtEpoch(days[1].date, '09:00');
      attendance.push({ id: `att-${u.id}-s-05`, eventId: EVENT_ID, sessionId: 's-05', userId: u.id, checkIn: start - 8 * 60000 + Math.floor(r() * 14 * 60000), checkOut: null, late: false, method: 'qr', status: 'present' });
    }
  });

  // Day 1 demo feedback (other participants only, so the demo user can submit their own).
  const feedback: Feedback[] = [];
  ['s-01', 's-02', 's-03', 's-04'].forEach((sid) => {
    const s = sessions.find((x) => x.id === sid)!;
    users.slice(1, 1 + 18 + Math.floor(r() * 8)).forEach((u) => {
      s.trainerIds.forEach((tid) => {
        const base = 3.6 + r() * 1.4;
        const v = () => Math.max(2, Math.min(5, Math.round(base + (r() - 0.5) * 1.4)));
        feedback.push({ id: `fb-${sid}-${tid}-${u.id}`, eventId: EVENT_ID, sessionId: sid, trainerId: tid, userId: u.id, ratings: { relevance: v(), knowledge: v(), clarity: v(), engagement: v(), usefulness: v() }, mood: pick(['great', 'good', 'good', 'okay']), comment: r() < 0.25 ? pick(['Very practical examples.', 'Would like more time for questions.', 'Great energy!', 'Helpful for my daily work.', 'Slides were hard to read from the back.']) : '', ts: now - 86400000, demo: true });
      });
    });
  });

  // Scores from Day 1 (seeded, unique keys).
  const scores: ScoreEntry[] = [];
  users.forEach((u, i) => {
    if (r() < 0.7) scores.push({ key: `seed:reflection:${u.id}`, userId: u.id, teamId: u.teamId, points: 50, reason: 'Day 1 reflection', ts: now - 80000000 });
    if (i !== 0 && r() < 0.55) scores.push({ key: `seed:com:${u.id}`, userId: u.id, teamId: u.teamId, points: 100, reason: 'Correct answer · Commercial updates check', ts: now - 80000000 });
  });
  scores.push({ key: 'seed:vendor:d1:momentum', userId: null, teamId: 'momentum', points: 300, reason: 'Winning team · Morning engagement challenge', ts: now - 90000000 });
  scores.push({ key: 'seed:vendor:d1:impact', userId: null, teamId: 'impact', points: 300, reason: 'Winning team · Evening engagement challenge', ts: now - 70000000 });
  scores.push({ key: 'seed:com:u01', userId: 'u01', teamId: 'ignite', points: 100, reason: 'Correct answer · Commercial updates check', ts: now - 80000000 });

  const words: WordEntry[] = SEED_WORDS.map((w, i) => ({ id: `w${i}`, activityId: 'a-wc', userId: users[(i % 30) + 2].id, word: w, ts: now - 1000 * i }));

  const ideas: Idea[] = [
    { id: 'i1', eventId: EVENT_ID, userId: 'u05', teamId: 'ignite', title: 'Digital help corner', challenge: 'Customers queue for simple tasks they could do on mobile.', solution: 'A small self-service corner with a staff “digital buddy” at peak hours.', customerBenefit: 'Shorter waits; confidence with digital services.', bankBenefit: 'More digital adoption, freeing counters for advice.', requirements: 'Space, a tablet, rota for a digital buddy.', votes: ['u02', 'u03', 'u08', 'u11', 'u14'], status: 'submitted', owner: '', due: '', progress: 0, ts: now - 3600000 },
    { id: 'i2', eventId: EVENT_ID, userId: 'u09', teamId: 'momentum', title: 'Island visit calendar', challenge: 'Customers on nearby islands miss service visits they did not know about.', solution: 'Publish a simple monthly visit calendar via community channels.', customerBenefit: 'Plan ahead; fewer wasted trips.', bankBenefit: 'Better attended visits.', requirements: 'Calendar owner and approved channels.', votes: ['u04', 'u12'], status: 'submitted', owner: '', due: '', progress: 0, ts: now - 3000000 },
    { id: 'i3', eventId: EVENT_ID, userId: 'u17', teamId: 'impact', title: 'Plain-language form guide', challenge: 'Customers find some forms confusing and return incomplete forms.', solution: 'One-page illustrated guides for the most common forms.', customerBenefit: 'Fewer repeat visits.', bankBenefit: 'Fewer errors and rework.', requirements: 'Content review and approval; printing.', votes: ['u01', 'u06', 'u10', 'u20'], status: 'submitted', owner: '', due: '', progress: 0, ts: now - 2000000 },
  ];

  const challenges: ChallengePost[] = [
    { id: 'c1', eventId: EVENT_ID, userId: 'u03', teamId: 'impact', text: 'Peak-hour queues after salary day', status: 'approved', votes: ['u01', 'u04', 'u07', 'u09'], solution: '', ts: now - 5000000 },
    { id: 'c2', eventId: EVENT_ID, userId: 'u10', teamId: 'aspire', text: 'Customers forget their mobile banking credentials', status: 'approved', votes: ['u02', 'u05'], solution: '', ts: now - 4000000 },
    { id: 'c3', eventId: EVENT_ID, userId: 'u15', teamId: 'ignite', text: 'Explaining product changes consistently across the team', status: 'approved', votes: ['u11'], solution: '', ts: now - 3000000 },
    { id: 'c4', eventId: EVENT_ID, userId: 'u22', teamId: 'elevate', text: 'Connectivity drops during busy periods', status: 'pending', votes: [], solution: '', ts: now - 1000000 },
  ];

  const qa: QAItem[] = [
    { id: 'q1', eventId: EVENT_ID, channel: 'leadership', sessionId: null, userId: 'u06', text: 'How will digital-first change the role of service centre staff over the next two years?', anonymous: false, status: 'approved', votes: ['u01', 'u02', 'u03', 'u08', 'u12', 'u15'], answer: '', onScreen: false, ts: now - 7200000 },
    { id: 'q2', eventId: EVENT_ID, channel: 'leadership', sessionId: null, userId: 'u13', text: 'What support is planned for staff development in the atolls?', anonymous: true, status: 'approved', votes: ['u04', 'u09', 'u21'], answer: '', onScreen: false, ts: now - 5400000 },
    { id: 'q3', eventId: EVENT_ID, channel: 'leadership', sessionId: null, userId: 'u19', text: 'Can we share ideas from this event with head office after the programme?', anonymous: false, status: 'pending', votes: [], answer: '', onScreen: false, ts: now - 1800000 },
    { id: 'q4', eventId: EVENT_ID, channel: 'session', sessionId: 's-05', userId: 'u11', text: 'Will the quiz explanations be shared afterwards?', anonymous: false, status: 'pending', votes: ['u02'], answer: '', onScreen: false, ts: now - 600000 },
  ];

  const announcements: Announcement[] = [
    { id: 'an1', eventId: EVENT_ID, title: 'Welcome to BML Refresher', body: 'Your agenda, teams and live activities are all here. Check in at each session using the QR code on the venue screen.', audience: 'all', kind: 'info', ts: now - 86400000 * 2, author: 'Event organisers' },
    { id: 'an2', eventId: EVENT_ID, title: 'Day 2 starts at 09:00 sharp', body: 'Rapid Questions opens the day. Have your phone charged and join your team table.', audience: 'all', kind: 'schedule', ts: now - 43200000, author: 'Event organisers' },
    { id: 'an3', eventId: EVENT_ID, title: 'Venue and region to be confirmed', body: 'The venue details will be published here once confirmed.', audience: 'all', kind: 'info', ts: now - 86400000 * 3, author: 'Event organisers' },
  ];

  const res = (id: string, title: string, kind: Resource['kind'], sessionId: string | null, description: string, status: Resource['status'] = 'approved', audience: Resource['audience'] = 'participants', tags: string[] = []): Resource => ({ id, eventId: EVENT_ID, sessionId, title, kind, description, version: 1, status, audience, size: kind === 'video' ? '—' : kind === 'pptx' ? '4.2 MB' : '1.1 MB', updated: now - 86400000, owner: 'Event organisers', tags });
  const resources: Resource[] = [
    res('r1', 'Programme overview (sample)', 'pdf', null, 'Agenda and housekeeping for the two days. Placeholder file for the demo.', 'approved', 'participants', ['agenda']),
    res('r2', 'Commercial updates – slides', 'pptx', 's-03', 'Approved deck to be uploaded by the trainer.', 'pending', 'participants', ['products']),
    res('r3', 'Product & process update cards', 'update', 's-03', 'Swipeable update cards. Content to be supplied by Retail; no rates shown in the demo.', 'approved', 'participants', ['products', 'process']),
    res('r4', 'Product Sprint flashcards', 'flashcards', 's-05', 'Revise the sprint questions with explanations.', 'approved', 'participants', ['quiz']),
    res('r5', 'Role play scenario pack (fictional)', 'doc', 's-06', 'Fictional scenarios and the observer rubric.', 'approved', 'participants', ['role play']),
    res('r6', 'Communication – session notes', 'pdf', 's-07', 'Notes to be supplied by the trainer.', 'draft', 'participants', ['communication']),
    res('r7', 'Advisory role – customer profiles (fictional)', 'doc', 's-09', 'Practice profiles used in the session.', 'approved', 'participants', ['advisory']),
    res('r8', 'Digital services walkthrough (video placeholder)', 'video', null, 'Video to be supplied. Playback will use the approved media platform.', 'pending', 'participants', ['digital']),
    res('r9', 'Trainer facilitation guide', 'doc', null, 'For trainers only.', 'restricted', 'trainers', ['trainers']),
    res('r10', 'Staff development pathways', 'pdf', 's-04', 'To be supplied by People Development.', 'pending', 'participants', ['development']),
  ];

  const photos: Photo[] = [
    { id: 'p1', eventId: EVENT_ID, userId: 'u04', caption: 'Team Momentum after the morning challenge', dataUrl: null, hue: 30, status: 'approved', ts: now - 80000000 },
    { id: 'p2', eventId: EVENT_ID, userId: 'u12', caption: 'Ice breaker energy', dataUrl: null, hue: 350, status: 'approved', ts: now - 70000000 },
    { id: 'p3', eventId: EVENT_ID, userId: 'u18', caption: 'Evening engagement – Team Impact', dataUrl: null, hue: 170, status: 'approved', ts: now - 60000000 },
    { id: 'p4', eventId: EVENT_ID, userId: 'u25', caption: 'Sunset group photo', dataUrl: null, hue: 260, status: 'pending', ts: now - 50000000 },
  ];

  const commitments: Commitment[] = [
    { id: 'cm1', userId: 'u03', eventId: EVENT_ID, horizon: 30, action: 'Help five customers register for digital banking themselves', measure: 'Five customers active on digital banking', due: '2026-12-28', progress: 40, status: 'in-progress', review: { status: 'pending', note: '', reviewer: '' }, ts: now },
    { id: 'cm2', userId: 'u08', eventId: EVENT_ID, horizon: 60, action: 'Start every advisory conversation with three open questions', measure: 'Peer observation twice a month', due: '2027-01-27', progress: 10, status: 'in-progress', review: null, ts: now },
    { id: 'cm3', userId: 'u14', eventId: EVENT_ID, horizon: 90, action: 'Share a monthly product update huddle with my team', measure: 'Three huddles held', due: '2027-02-26', progress: 0, status: 'not-started', review: null, ts: now },
  ];

  const decks: Record<string, Deck> = {};
  sessions.filter((s) => s.kind === 'session').forEach((s) => (decks[s.id] = deckFor(s)));

  const blocks: SessionBlock[] = Object.entries(BLOCK_PLAN).flatMap(([sid, list]) => list.map(([type, title, minutes], i) => ({ id: `b-${sid}-${i}`, sessionId: sid, type, title, minutes, ready: !(sid === 's-03' && type === 'presentation') && !(sid === 's-07' && i === 0) })));

  return {
    meta: { version: DB_VERSION, rev: 1, seededAt: now },
    demoClock: '2026-11-28T09:12:00+05:00',
    demoClockSetAt: now,
    currentEventId: EVENT_ID,
    regions: REGIONS,
    serviceCentres,
    users,
    trainers: TRAINERS,
    leaders: [
      { id: 'l1', role: 'Director of Retail & SME Banking', name: '' },
      { id: 'l2', role: 'Senior leadership guest', name: '' },
    ],
    events: [
      { id: EVENT_ID, name: 'Regional Refresher Training – November 2026', regionId: null, venue: '', days, status: 'published', revision: 1, publishedRevision: 1, publishedAt: now - 86400000 * 5, createdAt: now - 86400000 * 20 },
      { id: 'ev-template', name: 'Two-day Refresher – Programme Template', regionId: null, venue: '', days: [{ date: '2027-01-15', theme: 'Align & Connect' }, { date: '2027-01-16', theme: 'Learn & Transform' }], status: 'draft', revision: 1, publishedRevision: 0, publishedAt: null, isTemplate: true, createdAt: now - 86400000 * 30 },
    ],
    sessions,
    activities: SEED_ACTIVITIES,
    live: { eventId: EVENT_ID, sessionId: 's-05', slideIndex: 0, venueMode: 'welcome', activityId: null, questionIndex: 0, phase: 'idle', deadline: null, pausedRemaining: null, timerLabel: '', pointer: null, controller: null, rev: 1, updatedAt: now },
    responses: [],
    scores,
    teams: TEAMS,
    feedback,
    notes: {},
    bookmarks: { u01: ['s-07'] },
    announcements,
    readAnnouncements: {},
    qa,
    ideas,
    challenges,
    words,
    attendance,
    audit: [{ id: 'au1', ts: now - 86400000 * 5, actor: 'Event Organiser (demo)', action: 'event.publish', detail: 'Published “Regional Refresher Training – November 2026” (rev 1)' }],
    commitments,
    resources,
    photos,
    decks,
    blocks,
    rubric: [],
    selfAssess: [],
    scenarioProgress: [],
    certRules: { minAttendancePct: 80, requireFeedback: true, requireCommitment: true },
    certificates: [],
    prefs: {},
    roleplay: { assignments: [], prepDeadline: null },
    vendorScores: {},
    pendingAgendaChanges: false,
    publishedAgenda: { [EVENT_ID]: structuredClone(sessions) },
  };
}

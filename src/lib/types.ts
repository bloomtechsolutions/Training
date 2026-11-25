// Domain types for the BML Refresher prototype.
// These mirror the production data model documented in docs/ARCHITECTURE.md,
// simplified for a client-only demo.

export type Role = 'participant' | 'trainer' | 'admin' | 'leadership' | 'venue';

export interface Region { id: string; name: string }
export interface ServiceCentre { id: string; regionId: string; name: string }

export interface User {
  id: string;
  name: string;
  staffId: string;
  email: string;
  regionId: string;
  scId: string;
  designation: string;
  teamId: string | null;
  status: 'registered' | 'confirmed' | 'withdrawn';
  eventIds: string[];
  demo: true;
}

export interface Trainer {
  id: string;
  name: string;
  kind: 'staff' | 'vendor' | 'group' | 'participants';
  designation: string; // editable, never invented
  department: string; // editable, never invented
  expertise: string[];
  bio: string;
  color: string;
  questions: { id: string; userId: string; text: string; ts: number }[];
}

export interface Leader { id: string; role: string; name: string }

export interface EventDay { date: string; theme: string }

export interface TrainingEvent {
  id: string;
  name: string;
  regionId: string | null; // null = to be confirmed
  venue: string; // '' = to be confirmed
  days: EventDay[];
  status: 'draft' | 'published' | 'archived';
  revision: number;
  publishedRevision: number;
  publishedAt: number | null;
  isTemplate?: boolean;
  createdAt: number;
}

export type SessionKind = 'session' | 'break' | 'vendor';

export interface Session {
  id: string;
  eventId: string;
  day: number; // 1-based
  start: string; // HH:MM Maldives time
  end: string;
  code: string | null; // '01'..'10' for numbered sessions
  title: string;
  description: string;
  kind: SessionKind;
  trainerIds: string[];
  trainerLabel: string; // as printed on the agenda
  objectives: string[];
  engage: string | null; // key of the Engage Live experience
  order: number;
}

export type QuestionKind = 'mc' | 'tf' | 'poll';
export interface Option { id: string; text: string }
export interface Question {
  id: string;
  text: string;
  kind: QuestionKind;
  options: Option[];
  correct?: string;
  explanation?: string;
  points: number;
  seconds: number;
  visual?: string;
}

export type ActivityType = 'quiz' | 'poll' | 'wordcloud' | 'qa';
export interface Activity {
  id: string;
  sessionId: string;
  type: ActivityType;
  title: string;
  prompt?: string;
  mode: 'individual' | 'team';
  questions: Question[];
  status: 'draft' | 'ready';
}

export type VenueMode =
  | 'welcome' | 'qr' | 'agenda' | 'trainer' | 'presentation' | 'poll' | 'quiz' | 'wordcloud' | 'qa'
  | 'timer' | 'leaderboard' | 'break' | 'awards' | 'closing' | 'blackout' | 'offline';

export type Phase = 'idle' | 'open' | 'paused' | 'closed' | 'revealed';

export interface LiveState {
  eventId: string;
  sessionId: string | null;
  slideIndex: number;
  venueMode: VenueMode;
  activityId: string | null;
  questionIndex: number;
  phase: Phase;
  deadline: number | null; // epoch ms
  pausedRemaining: number | null; // ms
  timerLabel: string;
  pointer: { x: number; y: number } | null;
  controller: string | null; // trainer id currently presenting
  rev: number;
  updatedAt: number;
}

export interface Response {
  id: string;
  activityId: string;
  questionId: string;
  userId: string;
  optionId?: string;
  text?: string;
  correct?: boolean;
  ts: number;
}

export interface ScoreEntry { key: string; userId: string | null; teamId: string | null; points: number; reason: string; ts: number }

export interface Team { id: string; name: string; color: string; tint: string }

export interface SessionRatings { relevance: number; knowledge: number; clarity: number; engagement: number; usefulness: number }
export interface EventRatings { content: number; organisation: number; vendor: number; venue: number; facilities: number; duration: number }

export interface Feedback {
  id: string;
  eventId: string;
  sessionId: string | null; // null = overall event
  trainerId: string | null;
  userId: string;
  ratings: Partial<SessionRatings & EventRatings>;
  mood: string | null;
  comment: string;
  suggestions?: string;
  ts: number;
  demo?: boolean;
}

export interface Note {
  text: string;
  learned: [string, string, string];
  action: string;
  questions: string;
  application: string;
  slides: number[];
  updatedAt: number;
}

export interface Announcement { id: string; eventId: string; title: string; body: string; audience: string; kind: 'info' | 'schedule' | 'urgent'; ts: number; author: string }

export interface QAItem {
  id: string;
  eventId: string;
  channel: 'leadership' | 'session';
  sessionId: string | null;
  userId: string;
  text: string;
  anonymous: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'answered';
  votes: string[];
  answer: string;
  onScreen: boolean;
  ts: number;
}

export interface Idea {
  id: string;
  eventId: string;
  userId: string;
  teamId: string | null;
  title: string;
  challenge: string;
  solution: string;
  customerBenefit: string;
  bankBenefit: string;
  requirements: string;
  votes: string[];
  status: 'submitted' | 'shortlisted' | 'assigned' | 'in-progress' | 'implemented' | 'closed';
  owner: string;
  due: string;
  progress: number;
  ts: number;
}

export interface ChallengePost { id: string; eventId: string; userId: string; teamId: string | null; text: string; status: 'pending' | 'approved' | 'rejected'; votes: string[]; solution: string; ts: number }

export interface WordEntry { id: string; activityId: string; userId: string; word: string; ts: number }

export interface AttendanceRecord {
  id: string;
  eventId: string;
  sessionId: string;
  userId: string;
  checkIn: number;
  checkOut: number | null;
  late: boolean;
  method: 'qr' | 'manual' | 'offline';
  status: 'present' | 'late' | 'excused' | 'absent';
}

export interface AuditLog { id: string; ts: number; actor: string; action: string; detail: string; reason?: string }

export interface Commitment {
  id: string;
  userId: string;
  eventId: string;
  horizon: 30 | 60 | 90;
  action: string;
  measure: string;
  due: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'done';
  review: { status: 'pending' | 'reviewed'; note: string; reviewer: string } | null;
  ts: number;
}

export interface Resource {
  id: string;
  eventId: string | null; // null = permanent library
  sessionId: string | null;
  title: string;
  kind: 'pdf' | 'pptx' | 'video' | 'doc' | 'flashcards' | 'update';
  description: string;
  version: number;
  status: 'draft' | 'pending' | 'approved' | 'restricted';
  audience: 'participants' | 'trainers';
  size: string;
  updated: number;
  owner: string;
  tags: string[];
}

export interface Photo { id: string; eventId: string; userId: string; caption: string; dataUrl: string | null; hue: number; status: 'pending' | 'approved' | 'rejected'; ts: number }

export interface Slide { id: string; title: string; subtitle?: string; bullets: string[]; notes: string; accent: string; image?: string; layout: 'title' | 'bullets' | 'statement' | 'image' | 'activity' }

export interface Deck { sessionId: string; name: string; slides: Slide[]; source: 'sample' | 'images'; uploads: { name: string; size: number; kind: string; ts: number }[] }

export type BlockType = 'presentation' | 'video' | 'poll' | 'quiz' | 'wordcloud' | 'case' | 'team' | 'discussion' | 'feedback' | 'question' | 'resource' | 'commitment';
export interface SessionBlock { id: string; sessionId: string; type: BlockType; title: string; minutes: number; ready: boolean }

export interface RubricScore { id: string; sessionId: string; observerId: string; advisorName: string; scenarioId: string; scores: Record<string, number>; total: number; ts: number }

export interface SelfAssessment { userId: string; skills: Record<string, number>; goals: string; ts: number }

export interface ScenarioProgress { userId: string; scenarioId: string; path: string[]; done: boolean; ts: number }

export interface CertificateRules { minAttendancePct: number; requireFeedback: boolean; requireCommitment: boolean }
export interface Certificate { id: string; userId: string; eventId: string; serial: string; ts: number }

export interface NotificationPrefs { announcements: boolean; schedule: boolean; activities: boolean; reminders: boolean; quietHours: boolean }

export interface RoleplayAssignment { teamId: string; scenarioId: string; advisor: string; customer: string; observer: string }

export interface DB {
  meta: { version: number; rev: number; seededAt: number };
  demoClock: string | null; // ISO; null = real time
  demoClockSetAt: number; // real epoch when the demo clock was set
  currentEventId: string;
  regions: Region[];
  serviceCentres: ServiceCentre[];
  users: User[];
  trainers: Trainer[];
  leaders: Leader[];
  events: TrainingEvent[];
  sessions: Session[];
  activities: Activity[];
  live: LiveState;
  responses: Response[];
  scores: ScoreEntry[];
  teams: Team[];
  feedback: Feedback[];
  notes: Record<string, Note>; // `${userId}:${sessionId}`
  bookmarks: Record<string, string[]>; // userId -> sessionIds
  announcements: Announcement[];
  readAnnouncements: Record<string, string[]>;
  qa: QAItem[];
  ideas: Idea[];
  challenges: ChallengePost[];
  words: WordEntry[];
  attendance: AttendanceRecord[];
  audit: AuditLog[];
  commitments: Commitment[];
  resources: Resource[];
  photos: Photo[];
  decks: Record<string, Deck>;
  blocks: SessionBlock[];
  rubric: RubricScore[];
  selfAssess: SelfAssessment[];
  scenarioProgress: ScenarioProgress[];
  certRules: CertificateRules;
  certificates: Certificate[];
  prefs: Record<string, NotificationPrefs>;
  roleplay: { assignments: RoleplayAssignment[]; prepDeadline: number | null };
  vendorScores: Record<string, number>; // teamId -> points awarded for external engagement
  pendingAgendaChanges: boolean;
  publishedAgenda: Record<string, Session[]>; // what participants, trainers and the venue screen see
}

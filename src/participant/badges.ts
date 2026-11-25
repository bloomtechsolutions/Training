import type { DB } from '../lib/types';

export interface BadgeDef { id: string; name: string; desc: string; earned: boolean; progress: string }

/** Digital achievements, computed from the user's own activity. Results stay private to the participant. */
export function computeBadges(db: DB, userId: string): BadgeDef[] {
  const correct = db.responses.filter((r) => r.userId === userId && r.correct).length + db.scores.filter((s) => s.userId === userId && s.key.startsWith('seed:com')).length;
  const digitalQs = ['sp2', 'sp3', 'sp5'];
  const digital = db.responses.filter((r) => r.userId === userId && r.correct && digitalQs.includes(r.questionId)).length;
  const scenarios = db.scenarioProgress.filter((p) => p.userId === userId && p.done).length;
  const ideas = db.ideas.filter((i) => i.userId === userId).length;
  const teamActs = db.challenges.filter((c) => c.userId === userId).length + db.words.filter((w) => w.userId === userId).length + db.responses.filter((r) => r.userId === userId).length;
  const rubric = db.rubric.filter((r) => r.advisorName === db.users.find((u) => u.id === userId)?.name && r.total >= 80).length;
  return [
    { id: 'guru', name: 'Product Guru', desc: 'Answer 3 product questions correctly', earned: correct >= 3, progress: `${Math.min(correct, 3)}/3` },
    { id: 'digital', name: 'Digital Champion', desc: 'Get every digital-safety question right', earned: digital >= 3, progress: `${digital}/3` },
    { id: 'hero', name: 'Customer Hero', desc: 'Complete an advisory scenario', earned: scenarios >= 1, progress: `${Math.min(scenarios, 1)}/1` },
    { id: 'team', name: 'Team Player', desc: 'Take part in 5 live activities', earned: teamActs >= 5, progress: `${Math.min(teamActs, 5)}/5` },
    { id: 'innovator', name: 'Innovator', desc: 'Submit an innovation idea', earned: ideas >= 1, progress: `${Math.min(ideas, 1)}/1` },
    { id: 'advisory', name: 'Advisory Star', desc: 'Score 80%+ as advisor in a role play', earned: rubric >= 1, progress: `${Math.min(rubric, 1)}/1` },
  ];
}

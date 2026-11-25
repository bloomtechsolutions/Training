// Static learning content for Engage Live. All customers and situations are fictional.
// Nothing here describes an approved BML procedure, product term or rate.

export const RUBRIC = [
  { key: 'engagement', label: 'Customer engagement', weight: 20 },
  { key: 'listening', label: 'Active listening', weight: 20 },
  { key: 'needs', label: 'Needs identification', weight: 20 },
  { key: 'recommendation', label: 'Appropriate recommendation', weight: 20 },
  { key: 'objections', label: 'Objection handling', weight: 10 },
  { key: 'closing', label: 'Professionalism & closing', weight: 10 },
] as const;

export interface RoleplayScenario { id: string; title: string; tag: string; customer: string; advisor: string; observe: string }
export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  { id: 'rp-winback', tag: 'Salary win-back', title: 'The resort employee’s statement', customer: 'You work at a resort and used to receive your USD salary into your BML account. A few months ago you moved it elsewhere. Today you only came in for an account statement and want to be quick.', advisor: 'A customer has asked for an account statement. You notice their regular salary credits stopped some months ago. Open a meaningful conversation and understand the reason, without pressure.', observe: 'Does the advisor notice the change, ask permission to talk, and listen for the real reason before suggesting anything?' },
  { id: 'rp-difficult', tag: 'Difficult customer', title: 'The long wait', customer: 'You waited 40 minutes and you are frustrated. You raise your voice a little and say the bank never values your time.', advisor: 'An upset customer reaches your counter after a long wait. Calm the situation and help them.', observe: 'Does the advisor acknowledge feelings first, stay calm, and agree a clear next step?' },
  { id: 'rp-digital', tag: 'Digital onboarding', title: 'First time on mobile banking', customer: 'You are in your 60s and nervous about using banking apps. Your grandson usually helps you, but he has moved to Malé.', advisor: 'Help the customer start using digital banking confidently and securely, on their own device.', observe: 'Does the advisor build confidence, keep the customer in control of their own credentials, and check understanding?' },
  { id: 'rp-islamic', tag: 'Islamic financing', title: 'Shariah-compliant options', customer: 'You want financing but only if it is Shariah-compliant. You are unsure how it differs from conventional financing.', advisor: 'Explore the customer’s needs and values. Explain in general terms and refer to the approved product information for specifics.', observe: 'Does the advisor respect the customer’s values, avoid guessing terms, and offer to confirm details from approved sources?' },
  { id: 'rp-card', tag: 'Credit card', title: 'A card for travel', customer: 'You travel to Malé and abroad for medical visits and want “a card that works everywhere”.', advisor: 'Understand how the customer plans to use a card and what matters to them before discussing any option.', observe: 'Does the advisor explore usage, budgeting and security before mentioning products?' },
  { id: 'rp-home', tag: 'Home financing', title: 'Building on the island', customer: 'You and your spouse want to build a house on your home island and have heard different stories about financing.', advisor: 'Help the customer clarify their plans and what information they will need, and arrange a follow-up with the right team.', observe: 'Does the advisor clarify goals and timeline and set a clear, honest follow-up?' },
  { id: 'rp-objection', tag: 'Objections', title: '“I don’t need anything”', customer: 'You came to deposit cash. When offered anything else you say you do not need it and are in a hurry.', advisor: 'Respect the customer’s time while leaving the door open for a future conversation.', observe: 'Does the advisor accept the objection gracefully and avoid pushing?' },
  { id: 'rp-recovery', tag: 'Service recovery', title: 'The missed callback', customer: 'You were promised a callback about a problem last week and nobody called. You are disappointed.', advisor: 'Recover the relationship: acknowledge, own the miss, fix what you can and confirm the next step.', observe: 'Does the advisor take ownership without blaming others, and confirm a realistic follow-up?' },
];

export interface ScenarioNode { id: string; text: string; choices: { label: string; next: string; quality: 'best' | 'ok' | 'poor'; feedback: string }[] }
export interface BranchScenario { id: string; title: string; tag: string; intro: string; persona: string; nodes: Record<string, ScenarioNode>; start: string; ending: string }

export const BRANCH_SCENARIOS: BranchScenario[] = [
  {
    id: 'bs-winback', title: 'Salary win-back', tag: 'Advisory · fictional case', persona: 'Ahmed (fictional), 34, works at a resort',
    intro: 'Ahmed visits your service centre to request an account statement. His USD salary used to be credited to his BML account, but the credits stopped four months ago.',
    start: 'n1', ending: 'Well done. The goal is a genuine conversation: notice, ask, listen, then agree a next step that fits his needs. Confirm any offer details from approved sources before sharing them.',
    nodes: {
      n1: { id: 'n1', text: 'You print the statement. How do you open the conversation?', choices: [
        { label: 'Hand over the statement and say goodbye.', next: 'n1', quality: 'poor', feedback: 'You missed an opportunity to understand a change in his banking. Try again.' },
        { label: '“Here’s your statement. I noticed your salary credits stopped a few months ago. Is everything okay with the account? Do you have a couple of minutes?”', next: 'n2', quality: 'best', feedback: 'Good. You noticed, showed care and asked permission.' },
        { label: '“You need to move your salary back to us.”', next: 'n1', quality: 'poor', feedback: 'This puts pressure on the customer before you understand anything. Try again.' },
      ] },
      n2: { id: 'n2', text: 'Ahmed says: “Another bank opened an account for us at the resort. It was just easier.” What do you do next?', choices: [
        { label: 'Explain everything BML offers.', next: 'n2', quality: 'ok', feedback: 'Too early. You still do not know what “easier” means to him.' },
        { label: '“That makes sense. What made it easier for you? Is there anything you miss from banking with us?”', next: 'n3', quality: 'best', feedback: 'Open questions uncover the real reason.' },
        { label: '“Our service is better, you should come back.”', next: 'n2', quality: 'poor', feedback: 'Dismisses his experience. Try again.' },
      ] },
      n3: { id: 'n3', text: 'He explains that he sends money to his family every month and wants a simple way to do it from his phone. How do you respond?', choices: [
        { label: 'Summarise his need, and offer to show him how he can do this himself with BML digital services, then check approved options for his situation.', next: 'end', quality: 'best', feedback: 'You confirmed the need and offered something genuinely useful, in a way that builds his independence.' },
        { label: 'Promise him a special rate if he moves his salary back today.', next: 'n3', quality: 'poor', feedback: 'Never promise rates or offers that are not approved for you to make.' },
        { label: 'Tell him to call the hotline.', next: 'n3', quality: 'ok', feedback: 'Passing him on misses the chance to help him now.' },
      ] },
    },
  },
  {
    id: 'bs-needs', title: 'Needs before products', tag: 'Advisory · fictional case', persona: 'Shareefa (fictional), 41, runs a small guesthouse',
    intro: 'Shareefa asks about “the new financing” her neighbour mentioned. She wants to renovate two guest rooms before the season.',
    start: 'm1', ending: 'You let the customer’s goals lead the conversation, and you were honest about what needs confirming. That is the advisory role.',
    nodes: {
      m1: { id: 'm1', text: 'Where do you start?', choices: [
        { label: 'Give her the application form.', next: 'm1', quality: 'poor', feedback: 'Too early. You do not yet know her plans or needs.' },
        { label: 'Ask about the renovation: timing, budget, how the guesthouse earns, and what matters to her.', next: 'm2', quality: 'best', feedback: 'Exploring her goals first is the right foundation.' },
        { label: 'Tell her what her neighbour got.', next: 'm1', quality: 'poor', feedback: 'Other customers’ details are confidential.' },
      ] },
      m2: { id: 'm2', text: 'She mentions she would prefer a Shariah-compliant option and that cash flow is seasonal. What now?', choices: [
        { label: 'Note both needs and explain you will match them against the approved options, confirming details with the financing team.', next: 'end', quality: 'best', feedback: 'You captured the needs and set an honest next step.' },
        { label: 'Guess the profit rate to keep her interested.', next: 'm2', quality: 'poor', feedback: 'Never guess terms. Confirm from approved sources.' },
        { label: 'Say seasonal income is a problem and end the conversation.', next: 'm2', quality: 'poor', feedback: 'Do not prejudge eligibility. Refer to the right team.' },
      ] },
    },
  },
];

export interface CustomerProfile { id: string; name: string; summary: string; needs: string[]; best: string[] }
export const SOLUTION_CATEGORIES = ['Everyday account', 'Savings', 'Digital banking', 'Card', 'Financing (refer to specialist)', 'Shariah-compliant option', 'Remittance / transfers', 'Refer to another team'];
export const CUSTOMER_PROFILES: CustomerProfile[] = [
  { id: 'cp1', name: 'Fathimath, 22 (fictional)', summary: 'First job at a resort, wants to start saving and stop carrying cash.', needs: ['Receive salary safely', 'Build a savings habit', 'Pay without cash'], best: ['Everyday account', 'Savings', 'Digital banking'] },
  { id: 'cp2', name: 'Ibrahim, 58 (fictional)', summary: 'Fisherman, prefers in-person service, wants to send money to a son studying abroad.', needs: ['Send money abroad regularly', 'Simple, trusted process'], best: ['Remittance / transfers', 'Digital banking'] },
  { id: 'cp3', name: 'Aminath, 36 (fictional)', summary: 'Owns a small café, asks about expanding and only wants Shariah-compliant products.', needs: ['Business growth funding', 'Values-aligned products'], best: ['Shariah-compliant option', 'Financing (refer to specialist)'] },
];

export interface UpdateCard { id: string; title: string; category: string; before: string; after: string; benefit: string; check: string }
export const UPDATE_CARDS: UpdateCard[] = [
  { id: 'uc1', category: 'Process update · placeholder', title: 'Example: simpler account servicing request', before: 'Placeholder: describe how the process worked before.', after: 'Placeholder: describe the approved new process.', benefit: 'Placeholder: what improves for the customer.', check: 'Content to be supplied and approved by Retail before the event.' },
  { id: 'uc2', category: 'Digital update · placeholder', title: 'Example: a new self-service feature', before: 'Placeholder: what customers had to do in person.', after: 'Placeholder: what they can now do themselves.', benefit: 'Placeholder: time saved, convenience, security.', check: 'Do not quote features until the approved update is published.' },
  { id: 'uc3', category: 'Product update · placeholder', title: 'Example: product feature change', before: 'Placeholder: previous feature.', after: 'Placeholder: updated feature (no rates shown in demo).', benefit: 'Placeholder: why it matters to customers.', check: 'Rates and terms are deliberately not shown. Use approved sources.' },
];

export const SKILLS = ['Product knowledge', 'Needs-based conversations', 'Digital guidance', 'Handling objections', 'Service recovery', 'Teamwork', 'Time management'];

export const MOODS = [
  { key: 'great', label: 'Inspired', emoji: '🤩' },
  { key: 'good', label: 'Good', emoji: '🙂' },
  { key: 'okay', label: 'Okay', emoji: '😐' },
  { key: 'tired', label: 'Tired', emoji: '🥱' },
];

export const SESSION_CRITERIA = [
  { key: 'relevance', label: 'Relevance to my role' },
  { key: 'knowledge', label: 'Trainer knowledge' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'usefulness', label: 'Practical usefulness' },
] as const;

export const EVENT_CRITERIA = [
  { key: 'content', label: 'Content' },
  { key: 'organisation', label: 'Organisation' },
  { key: 'vendor', label: 'Vendor engagement activities' },
  { key: 'venue', label: 'Venue' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'duration', label: 'Programme duration' },
] as const;

export const SCORE_RULES = [
  { key: 'quiz', label: 'Correct quiz answer', points: 100 },
  { key: 'case', label: 'Case study completed', points: 100 },
  { key: 'team', label: 'Winning team challenge', points: 300 },
  { key: 'idea', label: 'Innovation submission', points: 100 },
  { key: 'shortlist', label: 'Shortlisted idea', points: 200 },
  { key: 'reflection', label: 'Reflection', points: 50 },
  { key: 'commitment', label: 'Completed commitment', points: 100 },
];

export const PERFORMANCE_CARDS = [
  { sc: 'Service Centre A', metric: 'Digital registrations', value: 128, target: 150, trend: +12 },
  { sc: 'Service Centre B', metric: 'Customer satisfaction', value: 4.4, target: 4.5, trend: +0.2 },
  { sc: 'Service Centre C', metric: 'Needs-based conversations', value: 86, target: 80, trend: +9 },
  { sc: 'Service Centre D', metric: 'Average wait (mins)', value: 14, target: 10, trend: -3 },
];

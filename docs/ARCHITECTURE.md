# BML Refresher – Production architecture

This describes how the prototype should be built for production. The prototype in `src/` runs entirely in the browser; everything below the “Prototype vs production” line is a recommendation that still needs BML information security and architecture review.

## Recommended stack

| Layer | Recommendation |
|---|---|
| Web app | Next.js (App Router) + TypeScript, Tailwind CSS, accessible headless components, Motion for animation |
| Auth | Microsoft Entra ID (OIDC) corporate SSO; group or app-role claims mapped to platform roles |
| API | Next.js route handlers or a separate service; every request authorised server-side, scoped to event |
| Database | PostgreSQL (with row-level security as defence in depth) |
| Files | BML-approved enterprise storage; file-type validation and malware scanning before review |
| Realtime | WebSockets or an approved managed realtime service, one channel per event |
| Slides | Server-side PPTX/PDF → image conversion worker (e.g. LibreOffice headless in an isolated container) |
| Notifications | In-app first; email and Microsoft Teams as approved integrations later |
| Client | PWA install, offline caching of approved non-sensitive resources only |
| Hosting | BML-approved hosting with encryption in transit and at rest, central logging |

## Roles and scoping

| Role | Scope |
|---|---|
| Participant | Own data; published agenda and approved resources of events they are registered for |
| Trainer | Sessions they are assigned to (session_trainers); other sessions only with explicit grant |
| Event organiser | Events they are assigned to |
| Central Retail admin | All events, templates, regions |
| Leadership | Read-only aggregated reporting; no individual feedback or personal results |
| Manager | Commitments of their direct reports only |
| Venue display | A display token bound to one event; receives public live state only |
| Vendor (optional) | Event-limited, approved access to its own activity scoring |

The prototype role switcher is a demonstration. Production must never trust a role sent by the client.

## Data model

All tables carry `id uuid`, `created_at`, `updated_at`; event-owned tables carry `event_id` and are queried only through event-scoped policies. See `schema.sql` for a fuller sketch.

```
regions 1─* service_centres 1─* users
users *─* roles (user_roles, optionally scoped to event_id)
events 1─* sessions 1─* session_trainers *─1 trainers(users or external)
events 1─* event_participants *─1 users        (status: registered|confirmed|withdrawn)
sessions 1─* session_blocks, slides(deck versions), resources
sessions 1─* attendance_windows 1─* attendance_records (unique user_id+session_id)
events 1─* teams 1─* team_members (unique event_id+user_id)
sessions 1─* activities 1─* questions 1─* options
activities 1─* responses (unique activity_id+question_id+user_id)
scores (unique award_key) → user_id?, team_id?
feedback (session/trainer or event level; identity separable)
notes, bookmarks (private to owner)
announcements, qa_items(+votes), innovation_ideas(+votes), challenge_posts(+votes), photos
commitments (+manager_reviews), certificates, audit_logs, live_event_state (1 per event)
```

Key constraints:

- `responses`: unique `(activity_id, question_id, user_id)` prevents double answers.
- `scores`: unique `award_key` such as `quiz:{activity}:{question}:{user}` or `vendor:{event}:{day}:{team}` prevents duplicate awards. No award source exists for attendance or trainer ratings.
- `attendance_records`: unique `(session_id, user_id)`; corrections write `audit_logs` with a mandatory reason.
- `event duplication` copies sessions, session_blocks, activities, questions, options, resources links and decks; it never copies event_participants, attendance, responses, scores, feedback, notes, commitments or photos.
- Agenda edits change a draft; publishing writes an immutable `agenda_revision` that participants read, and optionally creates a `schedule` announcement.

## Live event state

One row per event, versioned:

```ts
interface LiveEventState {
  eventId: string;
  sessionId: string | null;
  venueMode: 'welcome'|'qr'|'agenda'|'trainer'|'presentation'|'poll'|'quiz'|'wordcloud'|'qa'
           |'timer'|'leaderboard'|'break'|'awards'|'closing'|'blackout'|'offline';
  slideIndex: number;
  activityId: string | null;
  questionIndex: number;
  phase: 'idle'|'open'|'paused'|'closed'|'revealed';
  deadline: string | null;          // server time (ISO); clients compute remaining = deadline - serverNow
  pausedRemainingMs: number | null;
  timerLabel: string;
  controllerUserId: string | null;  // who may drive the screen right now
  revision: number;                 // monotonic; clients ignore older revisions
}
```

Transitions (server-validated):

```
idle ──launch──▶ open ──pause──▶ paused ──resume──▶ open
open/paused ──close──▶ closed ──reveal──▶ revealed ──next──▶ open (questionIndex+1)
any ──end──▶ idle
```

- Only the current `controllerUserId` (or an organiser) may mutate; handover changes it and is audited.
- Responses are accepted only when `phase = open` and server time < `deadline`.
- The server broadcasts the full state with its `revision` on every change.
- **Reconnect**: on (re)connect a client fetches the current state and `serverNow`, discards any message with a lower revision, and the venue screen shows the *connection lost* mode after a missed heartbeat window, recovering automatically.
- The public venue channel never includes speaker notes, individual responses, feedback or personal data.

The prototype implements the same shape in `src/lib/types.ts` (`LiveState`) and synchronises it between tabs on one device with BroadcastChannel.

## Attendance

- Attendance windows per session (e.g. opens 15 min before start, late after 10 min, closes at end).
- The venue screen shows a QR containing a short-lived, server-signed token (HMAC or JWT) bound to event, session and window; rotate every 30 seconds.
- Check-in requires an authenticated participant; the server verifies the token, the window and uniqueness.
- A QR scan alone does not prove presence. Combine with organiser validation (spot checks, roll call for exceptions) and approved safeguards.
- Offline: capture check-ins locally as *exceptions* with device time, sync later, and require organiser validation.

## Feedback confidentiality

- Store feedback with a pseudonymous respondent key where approved, so duplicates can be prevented without exposing identity in reports.
- Report only aggregates, with a minimum group size (the prototype uses 3).
- Never publish trainer ratings on public screens or leaderboards.
- Do not describe feedback as anonymous unless identity separation is actually implemented and approved.

## Security checklist (summary)

- BML information security and architecture review before any pilot with real data.
- Least-privilege, server-side authorisation; event scoping on every query.
- Encryption in transit and at rest; secrets in an approved vault.
- Audit logs for publishing, attendance corrections, moderation, scoring, certificate issue and role changes.
- Data retention rules for responses, photos, feedback and audit logs.
- File validation and malware scanning; moderation for user-generated content and photos.
- No real customer data in scenarios, ever.
- Offline cache restricted to approved non-sensitive resources; protect any locally stored data.
- Design for intermittent atoll connectivity: small payloads, retries with back-off, graceful degradation.

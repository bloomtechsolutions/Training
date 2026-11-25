# BML Refresher – Learning & Engagement Hub

**Learn. Connect. Transform.**

An interactive, runnable prototype of the platform for Bank of Maldives regional refresher training. It covers four connected role experiences (Participant Hub, Trainer Studio, Refresher 360 admin, Venue Live Screen), plus Engage Live activities and Beyond Refresher. It comes preloaded with the tentative **27–28 November 2026** agenda.

> This is a prototype. All participants, figures, feedback and scenarios are fictional demonstration data. The role switcher is a demo, not authentication. Features marked as simulated below are not production-ready.

## Run it

Requires Node 18+.

```bash
npm install
```

```bash
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks and builds a static site into `dist/` |
| `npm run build:single` | Builds one self-contained `dist-single/index.html` (used for the hosted demo) |
| `npm run preview` | Serves the `dist/` build locally |
| `npm run typecheck` | TypeScript check only |

The build is a static site; host it on any approved static host.

## Demo walkthrough

Use the **role switcher** (top bar) and the **demo clock** (amber button, top right). The clock starts at *Sat 28 Nov, 09:12*, during Session 05, and keeps running. Pick another moment (before the event, a break, after the event) to see the app adapt.

**Participant** (demo user “Aishath R.”)
1. Agenda → switch Day 1 / Day 2 → expand a session → *Open session* → *My notes* → write and save.
2. Open a trainer from the session page.
3. Check in → *Scan QR to check in* → *Simulate scan* (or type the 7-character code shown on the venue screen).
4. Live → Product Sprint → answer the quiz; explanations appear immediately and team points are awarded once.
5. Feedback → rate a session (each trainer rated separately) → confirmation.
6. Also: Notebook export, Resources, Ask Leadership, Gallery upload, Beyond Refresher (30/60/90 actions, certificate, AI companion placeholder).

**Trainer** (choose a demo trainer, e.g. Hawwa Zima)
1. Present → *Send to venue screen* → next/previous/jump, speaker notes, blackout, pointer, full screen, handover, *Launch activity*.
2. Activities → launch Product Sprint → turn on *Simulate audience responses* → pause / close / reveal / next question → leaderboard.
3. Session builder: add, reorder (drag or arrows) and time content blocks. Q&A: moderate and push a question to the screen.
4. Switch to Ibrahim Dhaws → Activities → Teams & scoring → assign role plays randomly and start the prep timer.

**Admin (Refresher 360)**
1. Agenda builder → edit a time (overlaps are flagged) → *Publish changes* with a schedule-change alert (participants see it on Home).
2. Events → create, duplicate (agenda and content only), publish, archive, *Show in apps*.
3. Participants → *Import CSV* → *Load sample with errors* to see validation → import valid rows.
4. Attendance monitor and audited corrections, Teams (auto-balance, moderation, Ask Leadership), Feedback (confidential aggregates), Innovation, Commitments (manager review), Certificates (rules + issue), Reports (CSV/print), Access & audit.

**Leadership** sees read-only aggregated dashboards.

**Venue screen**: Admin or Trainer → *Venue screen* → choose a mode. *Open screen in new window* opens `#venue` in a separate tab that follows the controls. You can also open `/#venue` directly.

Use the settings icon → **Reset demo data** to start over.

## What is real and what is simulated

| Area | In this prototype | Production approach |
|---|---|---|
| Navigation, forms, notes, quizzes, polls, word cloud, feedback, ideas, commitments | Working | Same UI, server persistence |
| Persistence | `localStorage` in this browser (falls back to memory if blocked) | PostgreSQL via authenticated API |
| Venue screen sync | **Local demo sync** via BroadcastChannel: tabs in the same browser on the same device only | Authenticated WebSocket / approved realtime service |
| QR attendance | **Simulated** scan; rotating codes validated locally | Server-signed, time-limited tokens, Entra ID identity, organiser validation |
| Audience responses in trainer view | **Simulated** generator (toggle, labelled) | Real participant devices |
| Slides | Built-in sample deck, or upload PNG/JPG/WebP slide images | Server converts PPTX/PDF to slide images; embedded media and animations handled separately |
| PPTX/PDF/content uploads | Metadata recorded for approval; file not stored | Approved storage, file validation, malware scanning |
| Sign-in and roles | Demo role switcher | Microsoft Entra ID SSO, server-side authorisation |
| Email / Teams notifications | Disabled with reason | Future approved integrations |
| Exports | CSV download + copy; browser print | Add `.xlsx` and server-rendered PDF if required |
| Certificates | Rules evaluated; organiser issues; printable preview | Approved template, signatory and verification |
| AI learning companion | Placeholder (disabled) | Future: grounded in approved content with citations |
| Pre/post knowledge by region | **Demo values**, labelled | Real assessment data |

## Project structure

```
src/
  App.tsx                 Shell: role switcher, demo clock, sidebar / bottom nav, routing
  lib/                    Types, seed data, store (persistence + tab sync), time helpers, content
  components/             Design system (ui.tsx) and shared widgets (QR, slides, word cloud…)
  participant/            Participant Hub screens
  engage/                 Engage Live activities (quiz, polls, word cloud, role play, scenarios…)
  trainer/                Trainer Studio (studio, builder, presenter, activities, Q&A)
  admin/                  Refresher 360 modules
  venue/                  Venue Live Screen and its controller
docs/
  ARCHITECTURE.md         Production architecture, data model, live state, security
  schema.sql              PostgreSQL schema sketch
  INTEGRATION_CHECKLIST.md
```

## Content rules followed

- The seed agenda is copied exactly from the brief, including gaps, breaks and vendor activities. Region and venue are “to be confirmed” and editable.
- Trainers use initials; designations, departments and biographies are blank until supplied. Leadership names are not invented.
- No BML product names, rates or procedures are stated. Scenarios and customers are fictional.
- Personal quiz results stay private; trainer ratings never appear on public screens or leaderboards.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/INTEGRATION_CHECKLIST.md](docs/INTEGRATION_CHECKLIST.md) for production guidance and remaining limitations.

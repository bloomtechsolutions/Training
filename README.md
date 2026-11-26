# BML Refresher – Learning & Engagement Hub

**Learn. Connect. Transform.**

The full-stack app for Bank of Maldives regional refresher training: Participant Hub, Trainer Studio, Refresher 360 (admin), Venue Live Screen, Engage Live activities and Beyond Refresher. It ships with the tentative **27–28 November 2026** agenda.

- **Frontend:** React + TypeScript + Tailwind (Vite), mobile-first
- **API:** one Vercel Function (`api/handler.ts` → `server/`)
- **Database:** Prisma Postgres on Vercel, through Prisma Client
- **Sync:** every device polls for changes every ~2 s (about 1 s on the venue screen), so phones, trainer devices, the projector and organisers stay in step
- **Sign-in:** personal access codes; permissions are checked on the server

## Deploy on Vercel

1. **Import** the GitHub repository in Vercel. The settings come from `vercel.json`: framework Vite, build `npm run vercel-build`, output `dist`.
2. **Connect the database:** Project → **Storage** → **Create Database** → **Prisma Postgres** → connect it to this project. This adds `DATABASE_URL`.
3. **Environment variables** (Settings → Environment Variables):

   | Variable | Required | Purpose |
   |---|---|---|
   | `DATABASE_URL` | yes | Added by the Prisma Postgres integration |
   | `ADMIN_PASSWORD` | yes | Password for the built-in `admin` sign-in |
   | `DEMO_MODE` | no | `true` adds one-tap demo sign-in (participant, trainer, leadership) and the admin demo clock. **Set to `false` for a real event.** |
   | `SEED_DEMO_DATA` | no | `false` starts with only the event, agenda and content (no fictional participants). Default `true`. |
   | `BLOB_READ_WRITE_TOKEN` | no | Vercel Blob store for photo and slide uploads; without it, images are stored in the database at reduced size |
   | `SESSION_SECRET`, `QR_SECRET` | no | Fixed secrets; otherwise generated once and kept in the database |

4. **Redeploy.** On the first request the app creates its tables and loads the November event. No manual migration step is needed. `prisma/migrations/` contains the same SQL if you prefer `npm run db:migrate`.

## First steps after deploying

1. Sign in with ID `admin` and your `ADMIN_PASSWORD`.
2. **Events:** set the region and venue for the November event.
3. **Participants:** import your staff with a CSV (`staff_id, name, email, region, service_centre, designation`). Each person gets an account automatically.
4. **Sign-in & codes:** issue access codes to participants and trainers, then share them privately. A code is shown once; issuing a new one replaces the old one.
5. **Venue screen:** on the projector computer, open `https://<your-app>/#venue` and enter the display code from *Venue screen → Get display code*.
6. Before going live with real staff: set `DEMO_MODE=false`. You can also use *Reset all data → Reset without demo people* to remove the fictional participants.

## How check-in works

The venue screen shows a QR code that changes every 30 seconds. It is signed with a server secret and tied to the event and session. Participants scan it with their phone camera, which opens the app and checks them in. They can also type the 7-character code shown under it. The server checks the code, the check-in window (opens 15 minutes before the session, late after 10 minutes) and duplicates. Organisers can correct attendance; every correction needs a reason and is recorded in the audit log.

## Security model

- Every change is sent to `/api/mutate` and authorised per collection and role in `server/rules.ts`:
  - Participants can only write their own data.
  - Trainers can only change their assigned sessions.
  - Leadership and venue displays are read-only.
- Quiz correctness and all participant points are decided on the server. Point awards use unique keys, so nothing is counted twice. No points are given for attendance or trainer ratings.
- What each role can read is filtered on the server:
  - Other people's notes, feedback, attendance and commitments are never sent to them.
  - Speaker notes are removed for participants and the venue screen.
  - Quiz answers stay hidden until the person answers or the trainer reveals them.
  - Anonymous questions lose the author's identity.
- Access codes are stored as scrypt hashes. Sessions are HMAC-signed HTTP-only cookies, valid for 14 days. Sign-in attempts are throttled.

## Local development

You need Node 20+ and PostgreSQL (or a Prisma Postgres connection string).

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` and `ADMIN_PASSWORD`, and set `DEMO_MODE=true` if you want demo sign-in.

```bash
npm run dev
```

`npm run dev` serves both the app and the API (through a Vite middleware) at http://localhost:5173.

| Command | What it does |
|---|---|
| `npm run build` | Prisma generate, type-check, production build |
| `npm run db:migrate` | Apply `prisma/migrations` (optional; the app also creates tables itself) |
| `npm run db:studio` | Browse the database with Prisma Studio |
| `npm run build:single` | The earlier offline, single-file demo (no server) |

## Project structure

```
api/handler.ts            Vercel Function entry (all /api/* routes)
server/
  app.ts                  Routes: session, sign-in, bootstrap, changes, mutate, check-in, QR, admin
  rules.ts                Authorisation, server-side scoring, read redaction
  auth.ts                 Access codes, signed sessions, rotating QR tokens
  db.ts, ddl.ts, seed.ts  Prisma client, schema bootstrap, seeding and reset
prisma/                   Prisma schema and SQL migration
src/
  lib/store.tsx           Client sync: optimistic updates, diff → /api/mutate, polling /api/changes
  lib/collections.ts      Shared client/server entity mapping and keys
  auth/                   Sign-in, venue display sign-in, setup screen
  participant/ trainer/ admin/ venue/ engage/   The four experiences and live activities
docs/                     Architecture, data model sketch, integration checklist
```

## Known limits

- Updates arrive by polling (about 1–2 s), not push. That's comfortable for a 40–60 person event. For much larger audiences, add an approved realtime service.
- Sign-in uses access codes. Microsoft Entra ID single sign-on is the recommended next step.
- PPTX/PDF files are stored for approval but not converted. To present, upload slide images exported from PowerPoint.
- Email/Teams notifications, `.xlsx` export and the AI learning companion are not built.
- The data model stores each record as a JSON document with a deterministic key in a single `entity` table, with a global revision for change streaming. A fully normalised schema is sketched in `docs/schema.sql` for a later enterprise build.
- Security review by BML information security is still needed before use with real staff data.

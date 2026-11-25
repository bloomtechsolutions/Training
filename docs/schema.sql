-- BML Refresher – PostgreSQL schema sketch (for design review, not a migration).
-- Every event-owned table is scoped by event_id; enforce access in the API and with RLS.

create table regions (id uuid primary key, name text not null unique);
create table service_centres (id uuid primary key, region_id uuid not null references regions, name text not null, unique (region_id, name));

create table users (
  id uuid primary key, entra_object_id text unique not null, staff_id text unique not null,
  name text not null, email text not null, region_id uuid references regions, service_centre_id uuid references service_centres,
  designation text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table roles (id text primary key); -- participant, trainer, organiser, central_admin, leadership, manager, venue_display, vendor
create table user_roles (user_id uuid references users, role_id text references roles, event_id uuid null, primary key (user_id, role_id, coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid)));
create table manager_assignments (manager_id uuid references users, report_id uuid references users, primary key (manager_id, report_id));

create table events (
  id uuid primary key, name text not null, region_id uuid references regions, venue text,
  status text not null check (status in ('draft','published','archived')), is_template boolean default false,
  revision int not null default 1, published_revision int not null default 0, published_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table event_days (event_id uuid references events on delete cascade, day_no int, date date not null, theme text, primary key (event_id, day_no));
create table event_participants (event_id uuid references events, user_id uuid references users, status text check (status in ('registered','confirmed','withdrawn')), primary key (event_id, user_id));

create table trainers (id uuid primary key, user_id uuid references users, display_name text not null, kind text check (kind in ('staff','vendor','group','participants')), designation text, department text, bio text, expertise text[]);
create table sessions (
  id uuid primary key, event_id uuid not null references events on delete cascade, day_no int not null,
  start_time time not null, end_time time not null check (end_time > start_time),
  code text, title text not null, description text, kind text check (kind in ('session','break','vendor')),
  trainer_label text, objectives text[], engage_key text, sort_order int
);
create table session_trainers (session_id uuid references sessions on delete cascade, trainer_id uuid references trainers, primary key (session_id, trainer_id));
create table agenda_revisions (event_id uuid references events, revision int, snapshot jsonb not null, published_by uuid references users, published_at timestamptz default now(), primary key (event_id, revision));

create table resources (id uuid primary key, event_id uuid references events, session_id uuid references sessions, title text, kind text, storage_key text, version int, status text check (status in ('draft','pending','approved','restricted')), audience text, scanned_at timestamptz, approved_by uuid references users);
create table slides (id uuid primary key, session_id uuid references sessions, deck_version int, position int, image_key text, speaker_notes text); -- notes never exposed to venue/participants
create table session_blocks (id uuid primary key, session_id uuid references sessions, type text, title text, minutes int, ready boolean, position int);

create table attendance_windows (id uuid primary key, session_id uuid references sessions, opens_at timestamptz, late_after timestamptz, closes_at timestamptz);
create table attendance_records (
  id uuid primary key, event_id uuid references events, session_id uuid references sessions, user_id uuid references users,
  check_in timestamptz, check_out timestamptz, late boolean, method text check (method in ('qr','manual','offline')),
  status text check (status in ('present','late','excused','absent')), validated_by uuid references users,
  unique (session_id, user_id)
);

create table teams (id uuid primary key, event_id uuid references events, name text, color text, unique (event_id, name));
create table team_members (event_id uuid references events, team_id uuid references teams, user_id uuid references users, primary key (event_id, user_id));

create table activities (id uuid primary key, session_id uuid references sessions, type text, title text, prompt text, mode text, status text);
create table questions (id uuid primary key, activity_id uuid references activities on delete cascade, position int, text text, kind text, correct_option_id uuid, explanation text, points int, seconds int);
create table options (id uuid primary key, question_id uuid references questions on delete cascade, position int, text text);
create table responses (id uuid primary key, activity_id uuid, question_id uuid, user_id uuid references users, option_id uuid, text text, is_correct boolean, created_at timestamptz default now(), unique (activity_id, question_id, user_id));
create table scores (id uuid primary key, event_id uuid references events, award_key text unique not null, user_id uuid, team_id uuid, points int not null, reason text, awarded_by uuid, created_at timestamptz default now());

create table feedback (id uuid primary key, event_id uuid references events, session_id uuid, trainer_id uuid, respondent_key text not null, ratings jsonb, mood text, comment text, suggestions text, created_at timestamptz default now(), unique (event_id, session_id, trainer_id, respondent_key));
create table notes (user_id uuid references users, session_id uuid references sessions, body jsonb, updated_at timestamptz, primary key (user_id, session_id));
create table bookmarks (user_id uuid, session_id uuid, slide_id uuid, primary key (user_id, session_id, slide_id));

create table announcements (id uuid primary key, event_id uuid references events, title text, body text, audience jsonb, kind text, author_id uuid, created_at timestamptz default now());
create table qa_items (id uuid primary key, event_id uuid, channel text, session_id uuid, user_id uuid, text text, show_name boolean, status text, answer text, on_screen boolean, created_at timestamptz default now());
create table qa_votes (qa_id uuid references qa_items, user_id uuid, primary key (qa_id, user_id));
create table innovation_ideas (id uuid primary key, event_id uuid, user_id uuid, team_id uuid, title text, challenge text, solution text, customer_benefit text, bank_benefit text, requirements text, status text, owner text, due_date date, progress int);
create table votes (idea_id uuid references innovation_ideas, user_id uuid, primary key (idea_id, user_id));
create table challenge_posts (id uuid primary key, event_id uuid, user_id uuid, team_id uuid, text text, status text, solution text);
create table photos (id uuid primary key, event_id uuid, user_id uuid, storage_key text, caption text, status text, moderated_by uuid);

create table commitments (id uuid primary key, event_id uuid, user_id uuid, horizon int check (horizon in (30,60,90)), action text, measure text, due_date date, progress int, status text);
create table commitment_reviews (commitment_id uuid references commitments, manager_id uuid references users, note text, reviewed_at timestamptz, primary key (commitment_id, manager_id));
create table certificate_rules (event_id uuid primary key references events, min_attendance_pct int, require_feedback boolean, require_commitment boolean, approved_by uuid);
create table certificates (id uuid primary key, event_id uuid, user_id uuid, serial text unique, issued_by uuid, issued_at timestamptz, unique (event_id, user_id));

create table audit_logs (id bigserial primary key, at timestamptz default now(), actor_id uuid, action text, entity text, entity_id uuid, detail jsonb, reason text);
create table live_event_state (event_id uuid primary key references events, state jsonb not null, revision bigint not null, updated_at timestamptz default now());

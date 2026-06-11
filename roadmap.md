# Marketing Calendar PoC — Roadmap

Reference document for building the NorCal marketing calendar proof of concept with coding agents. Read this before planning any work. Repo, Supabase, Cloudflare, and CI/CD setup live in `structure.md`.

## Purpose

Build a marketing calendar for a youth rowing club. Marketing activity is organized around four rowing event categories: recruiting, retention, regatta, and fundraising. The calendar coordinates events and the emails attached to them.

## The load-bearing claim (do not trivialize this)

This is a PoC, not a polished prototype. The single technical claim it exists to prove is:

> Scheduling an email for a calendar event routes through a Supabase Edge Function. The function holds the sending secret, validates the request, persists the email job to Supabase, and records the send result.

The browser can write calendar events to Supabase directly through the JS client. It cannot send email, because the provider key must not live in the browser. That asymmetry is the entire reason the edge function exists. If email jobs ever get written directly from the client, the PoC has failed its purpose even if it looks finished.

## Scope

In scope:
- Real Supabase persistence (no mocked database).
- Real edge function performing validation, persistence, and send orchestration.
- Real Row Level Security policies (not "allow all").

Out of scope for the PoC:
- Multi-tenant or club-scoped authorization beyond a single authenticated team.
- Audience segments and recipient lists (single recipient per email is enough).
- Email analytics (open and click tracking).
- Recurring events.

## Features (5)

1. Month calendar view, events color-coded by category (recruiting, retention, regatta, fundraising).
2. Create and edit an event (title, description, category, date, owner, status).
3. Attach and schedule an email to an event. This call goes through the edge function. Status lifecycle (draft, scheduled, sent, failed) is an attribute of the email job, handled here, not a separate feature.
4. Filter or list events by category.
5. Upcoming sends panel: lists email jobs with status `scheduled`, ordered by send time. Reads only, cheap. Cut this first if time runs short.

Build rule: feature 3 is the only hard one. Build it first and most carefully. The other four are low risk and exist to make the calendar legible.

## Data model

Postgres on Supabase. Two tables, three enums.

### Enums

```sql
create type event_category as enum ('recruiting', 'retention', 'regatta', 'fundraising');
create type event_status   as enum ('planned', 'confirmed', 'done');
create type email_status   as enum ('draft', 'scheduled', 'sent', 'failed');
```

### Tables

```sql
create table events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    event_category not null,
  event_date  date not null,
  owner       text,                       -- PoC: free text. Production: FK to a profiles table.
  status      event_status not null default 'planned',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table email_jobs (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references events(id) on delete cascade,
  subject             text not null,
  body                text not null,
  recipient           text not null,       -- PoC: single address. Production: audience reference.
  scheduled_for       timestamptz,         -- null means send immediately
  status              email_status not null default 'draft',
  provider_message_id text,                -- ID returned by the email provider, proves the send happened
  error               text,                -- failure reason when status = 'failed'
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index events_event_date_idx     on events (event_date);
create index events_category_idx        on events (category);
create index email_jobs_event_id_idx    on email_jobs (event_id);
create index email_jobs_status_sched_idx on email_jobs (status, scheduled_for);
```

### Relationships

One event has many email jobs. Deleting an event cascades to its email jobs.

### Write ownership (the core design decision)

- `events`: client does direct create, read, update, delete through the JS client, governed by RLS.
- `email_jobs`: client reads only. All writes (insert and every status transition) go through the edge function using the service role, which bypasses RLS. This is what makes the function load-bearing.

### RLS

```sql
alter table events enable row level security;
alter table email_jobs enable row level security;

-- events: authenticated team can do everything (PoC simplification)
create policy events_authenticated_all on events
  for all to authenticated using (true) with check (true);

-- email_jobs: authenticated team can read; no client write policy exists,
-- so client inserts and updates are denied. The edge function writes with the service role.
create policy email_jobs_read on email_jobs
  for select to authenticated using (true);
```

Note for the agent: the absence of an insert/update/delete policy on `email_jobs` is intentional, not an oversight. Do not add one.

### Grants (required — RLS sits on top of these)

RLS policies only take effect on top of Postgres table GRANTs. Hosted Supabase
projects do **not** auto-grant table privileges to roles for tables created by
migrations, so the grants are explicit (in separate migrations because they were
added after `0001` was already applied):

```sql
-- 0002_grants.sql — the client (authenticated; anonymous sign-in uses this role)
grant select, insert, update, delete on table public.events to authenticated;
grant select on table public.email_jobs to authenticated;

-- 0003_grants_service_role.sql — the edge function
grant all on table public.events to service_role;
grant all on table public.email_jobs to service_role;
```

Only `authenticated` and `service_role` are granted; `anon` is never used (the
client always signs in anonymously, which *is* the `authenticated` role). A missing
grant surfaces as `permission denied for table ...` before RLS is even evaluated.

### Auth

The client authenticates with `supabase.auth.signInAnonymously()` (no login UI),
which yields the `authenticated` role so the RLS policies above apply. "Allow
anonymous sign-ins" must be enabled in the Supabase dashboard (and in
`supabase/config.toml` for the local stack).

## Edge function contract

Function name: `schedule-email`.

Request body:
```json
{
  "event_id": "uuid",
  "subject": "string",
  "body": "string",
  "recipient": "email string",
  "scheduled_for": "ISO timestamp or null"
}
```

Behavior (as built):
1. Validate the body with Zod. Reject with 400 on missing or malformed fields.
2. Enforce the recipient allowlist: compare `recipient` (normalized) to
   `ALLOWED_RECIPIENT_EMAIL`. Reject 403 on mismatch; 500 (fail closed) if the
   secret is unset.
3. Confirm the `event_id` exists, using the service role. 404 if not.
4. If `scheduled_for` is in the future, insert the `email_jobs` row as `scheduled`
   and return it — no send. There is no worker, so scheduled jobs are **not**
   auto-delivered later; that is out of scope for the PoC.
5. Otherwise insert, then send via Resend (shared test sender
   `onboarding@resend.dev`, which delivers only to the allowlisted address). Update
   the row to `sent` (+ `sent_at`, `provider_message_id`) or `failed` (+ `error`).
   If `RESEND_API_KEY` is unset the row is persisted as `failed` rather than crashing.
6. Return the resulting `email_jobs` row.

The function reads `RESEND_API_KEY` and `ALLOWED_RECIPIENT_EMAIL` from edge function
secrets via `Deno.env.get`, and the Supabase service role key from the auto-injected
`SUPABASE_SERVICE_ROLE_KEY`. None of these are ever sent to the client.

## Open decision — settled

Real send or stubbed send for the PoC. Real sending through a provider needs a verified sending domain, which is friction inside a two-day window. Defensible PoC scope: the function does the real work (validate, access secret, write to Supabase) and either calls the provider if a key is configured, or records the job as `scheduled`/`queued` without delivering.

Current choice: real send, test sender, own email only

Status: **implemented.** The function calls Resend with the shared test sender and delivers only to the `ALLOWED_RECIPIENT_EMAIL` address (no verified domain needed). See the edge function contract above.

## Build order

Do not build the five features in parallel or in list order. Build the riskiest end-to-end slice first so that an early stop still leaves a working PoC.

**Phase 0 — Setup.** Follow `structure.md`. Done when a trivial edge function deploys and is callable, and the two tables exist in Supabase. — **Status: done.**

**Phase 1 — Vertical slice (the PoC). — Status: done, verified end-to-end on the linked project.**
- Create-event form writes a row to `events`.
- Calendar renders rows from `events`.
- Attaching an email to an event calls `schedule-email`, which validates, writes to `email_jobs`, and records the result.
- Acceptance: from the UI, create an event, schedule an email for it, and see a correctly persisted `email_jobs` row with a coherent status. When this round trip works, the PoC claim is proven.

**Phase 2 — Breadth (low risk, cuttable). — Status: done.**
- Category color-coding on the calendar. — done (in `CalendarMonth`).
- Filter or list by category. — done (feature 4; `CategoryFilter` toggles `activeCategories` in the UI store, which `CalendarMonth` already filters by).
- Upcoming sends panel. — done (feature 5; `UpcomingSends` renders `useUpcomingSends`, read-only, with explicit "not auto-delivered" copy).
- Acceptance per feature: the feature reads or writes the right table and reflects state accurately. — verified headless (Playwright) against the local stack: filters hide/show events; the panel lists `scheduled` jobs and refreshes after scheduling through the function.

**Deployed.** The PoC is complete and live at https://marketing-calendar-e7w.pages.dev
as of 2026-06-11, with CI/CD green end-to-end (migrations → edge function → frontend);
the production deploy was smoke-tested headless (auth, calendar, filter, panel).

## Working agreement for agents

- Work in plan mode. Produce a plan and wait for approval before writing or changing files.
- Explain every non-trivial block of code you author. The owner reviews each one.
- When a design or implementation choice originated from the agent rather than the owner, say so explicitly in the summary. Do not present agent decisions as the owner's.
- Keep RLS real. "Allow all" on `email_jobs` writes defeats the PoC.

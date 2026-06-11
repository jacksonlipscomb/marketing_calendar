# Marketing Calendar — Roadmap (campaign/deliverable rewrite)

Reference document for the fuller implementation that replaces the events PoC. Read this before planning any work. Repo, Supabase, Cloudflare, and CI/CD setup live in `structure.md`. Feature sequencing, acceptance criteria, and cut lines live in `features.md`.

The PoC this grows out of proved its claim and shipped (see git history of this file). Its single-day `events` model is being replaced, not extended.

## Purpose

Marketing planning for a youth rowing club, organized around **campaigns**: multi-week or multi-month efforts (a fundraising push, a recruiting season) with a goal, an audience segmentation, a date range, and one or more owners. Campaigns break down into **deliverables**: dated, owned, statused pieces of work (photos for the newsletter, the announcement email, the thank-you mailer). The calendar and lists coordinate deliverables; the timeline shows campaign concurrency at a glance.

The four categories carry over from the PoC and now live on campaigns: recruiting, retention, regatta, fundraising. They drive color-coding on the calendar and the timeline bars.

## The load-bearing claim (do not trivialize this)

The edge function remains the backbone of everything email, now proven two ways instead of one:

> 1. **Manual sends**: scheduling an email for a deliverable routes through the `schedule-email` edge function. The function holds the sending secret, validates the request, persists the email job, and records the send result.
> 2. **Scheduled sends**: a daily `pg_cron` job invokes the `send-reminders` edge function, which finds deliverables coming due, sends reminder emails through the same provider path, and records each send as an email job.

The browser writes campaigns and deliverables directly through the JS client under RLS. It never writes `email_jobs` — it reads them only. If email jobs ever get written from the client, or the reminder path routes around the function, the project has failed its purpose even if it looks finished.

## Scope

In scope:
- Real Supabase persistence, real RLS (no "allow all" on `email_jobs` writes).
- Campaign/deliverable model with multi-owner `text[]` fields.
- Range-filtered campaign lists (day/week/month/quarter/year/all) with overlap semantics, plus status filters on campaigns and deliverables.
- Derived campaign completion percentage.
- Timeline view, reminder emails via pg_cron, campaign templates (in that priority order — see `features.md`).

Out of scope:
- Multi-tenant or per-user authorization; the team remains a single anonymous-authenticated unit.
- Owners as real accounts. `owners` are display names (`text[]`), not email addresses or FKs. Owners-as-validated-emails is the production upgrade path, not built here.
- Recipient lists / audience delivery. Every email still goes only to `ALLOWED_RECIPIENT_EMAIL`.
- Email analytics, recurring campaigns.

## Data model

Postgres on Supabase. The transition from the PoC schema is a **reset, not a migration**: PoC data is throwaway (owner-confirmed).

### Reset migration — destructive, read this

A new migration (next number in `supabase/migrations/`) drops the PoC tables and rebuilds:

1. Drop `email_jobs` first (it holds the FK to `events`), then `events`, then the old enums `event_category` and `event_status` (`email_status` is kept and reused).
2. Create the new enums and tables below, recreating `email_jobs` with `deliverable_id`.

**Warning:** this destroys every row in `events` and `email_jobs` on the live project. `deploy.yml` runs `supabase db push` on every merge to main, so **merging the reset migration applies the drop to production**. The owner reviews and approves that PR knowing this; the PR description must say it in plain words.

### Enums

```sql
-- new
create type campaign_category  as enum ('recruiting', 'retention', 'regatta', 'fundraising');
create type campaign_status    as enum ('planned', 'in_progress', 'done');
create type deliverable_status as enum ('backlog', 'in_progress', 'complete');

-- carried over from the PoC unchanged
-- email_status: ('draft', 'scheduled', 'sent', 'failed')
```

### Tables

```sql
create table campaigns (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  goal              text,                          -- free text: "raise $500k", "recruit 50 new athletes"
  category          campaign_category not null,
  start_date        date not null,
  end_date          date not null,
  segmentation      text,                          -- free-text audience label: "donors only", "current + alumni athletes"
  owners            text[] not null default '{}',  -- display names, not emails (see Scope)
  status            campaign_status not null default 'planned',
  reminders_enabled boolean not null default true, -- per-campaign toggle for the reminder job
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint campaigns_dates_check check (end_date >= start_date)
);

create table deliverables (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  title       text not null,
  details     text,                                -- the product / end result expected
  due_date    date not null,
  owners      text[] not null default '{}',
  status      deliverable_status not null default 'backlog',
  reminded_at timestamptz,                         -- reminder dedupe: set only after a successful reminder send
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table email_jobs (
  id                  uuid primary key default gen_random_uuid(),
  deliverable_id      uuid not null references deliverables(id) on delete cascade,
  subject             text not null,
  body                text not null,
  recipient           text not null,
  scheduled_for       timestamptz,          -- null means send immediately
  status              email_status not null default 'draft',
  provider_message_id text,
  error               text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index campaigns_start_date_idx on campaigns (start_date);
create index campaigns_end_date_idx   on campaigns (end_date);
create index campaigns_category_idx   on campaigns (category);
create index campaigns_status_idx     on campaigns (status);

create index deliverables_campaign_id_idx on deliverables (campaign_id);
create index deliverables_due_date_idx    on deliverables (due_date);
create index deliverables_status_idx      on deliverables (status);
-- the reminder job's exact query shape: due soon, not yet reminded
create index deliverables_reminder_idx    on deliverables (due_date) where reminded_at is null;

create index email_jobs_deliverable_id_idx on email_jobs (deliverable_id);
create index email_jobs_status_sched_idx   on email_jobs (status, scheduled_for);
```

### Templates (schema arrives in Phase 5, not in the reset)

Templates are stored as data, in their own later migration, so the foundation phase carries no unused tables. Template deliverables carry a day-offset from campaign start so "create from template" can compute real due dates. Created campaigns are fully editable afterward — the template is a starting point, not a lock.

```sql
create table templates (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,             -- "Recruiting season", "Fundraising push"
  category              campaign_category not null,
  goal                  text,
  segmentation          text,
  default_duration_days int not null default 28,
  created_at            timestamptz not null default now()
);

create table template_deliverables (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  title       text not null,
  details     text,
  offset_days int not null default 0,              -- due_date = campaign start_date + offset_days
  created_at  timestamptz not null default now()
);
```

### Relationships and derived values

- One campaign has many deliverables; one deliverable has many email jobs. Deletes cascade down both levels.
- **Completion percentage is derived, never stored**: `complete` deliverables ÷ total deliverables, computed in a client hook from the deliverables already fetched for a campaign. (If it ever needs to be queryable in lists at scale, the upgrade path is a SQL view — not a column.)
- Campaign `status` is manual (the owner sets planned/in_progress/done); the derived percentage sits alongside it, it does not drive it.

### Overlap query semantics (range filters)

A campaign belongs to a time range when it **overlaps** the range, not when it is contained by it:

```
start_date <= range_end AND end_date >= range_start      -- bounds inclusive
```

This is the rule for every range filter (day/week/month/quarter/year). A campaign running Feb 15 – Apr 10 appears in the February, March, and April month filters and in Q1 and Q2. The b-tree indexes on `start_date`/`end_date` are enough at this scale; a GiST index over `daterange(start_date, end_date, '[]')` is the upgrade path if overlap queries ever get hot, and is not built now.

### Write ownership (the core design decision, unchanged)

- `campaigns`, `deliverables`, `templates`: client does direct CRUD through the JS client, governed by RLS.
- `email_jobs`: client reads only. All writes (insert and every status transition) go through the edge functions using the service role. Both `schedule-email` and `send-reminders` write; nothing else does.

### RLS

```sql
alter table campaigns    enable row level security;
alter table deliverables enable row level security;
alter table email_jobs   enable row level security;
-- (templates + template_deliverables: same pattern as campaigns, in the Phase 5 migration)

create policy campaigns_authenticated_all on campaigns
  for all to authenticated using (true) with check (true);

create policy deliverables_authenticated_all on deliverables
  for all to authenticated using (true) with check (true);

-- email_jobs: read only; no client write policy exists, intentionally.
create policy email_jobs_read on email_jobs
  for select to authenticated using (true);
```

The absence of an insert/update/delete policy on `email_jobs` is intentional, not an oversight. Do not add one.

### Grants (required — RLS sits on top of these)

Hosted Supabase does not auto-grant table privileges for migration-created tables; a missing grant surfaces as `permission denied for table ...` before RLS is evaluated. Every migration that creates a table includes its grants:

```sql
grant select, insert, update, delete on table public.campaigns    to authenticated;
grant select, insert, update, delete on table public.deliverables to authenticated;
grant select                         on table public.email_jobs   to authenticated;

grant all on table public.campaigns    to service_role;
grant all on table public.deliverables to service_role;
grant all on table public.email_jobs   to service_role;
-- (templates tables: same pattern in the Phase 5 migration)
```

Only `authenticated` and `service_role`; never `anon` (the client signs in anonymously, which *is* the `authenticated` role).

### Auth

Unchanged from the PoC: `supabase.auth.signInAnonymously()` in `src/lib/auth.ts`, no login UI. "Allow anonymous sign-ins" must stay enabled in the dashboard and in `supabase/config.toml` for the local stack.

## Edge function contracts

### `schedule-email` (re-pointed, otherwise unchanged)

Request body:
```json
{
  "deliverable_id": "uuid",
  "subject": "string",
  "body": "string",
  "recipient": "email string",
  "scheduled_for": "ISO timestamp or null"
}
```

Behavior is the PoC contract with `deliverable_id` replacing `event_id`:
1. Validate with Zod; 400 on malformed input.
2. Enforce the recipient allowlist against `ALLOWED_RECIPIENT_EMAIL`: 403 on mismatch, 500 (fail closed) if the secret is unset.
3. Confirm the `deliverable_id` exists (service role); 404 if not.
4. Future `scheduled_for`: persist as `scheduled`, no send (still no worker; not auto-delivered).
5. Otherwise insert, send via Resend (shared test sender `onboarding@resend.dev`), update to `sent` (+ `sent_at`, `provider_message_id`) or `failed` (+ `error`). Unset `RESEND_API_KEY` persists the row as `failed` rather than crashing.
6. Return the resulting `email_jobs` row.

### `send-reminders` (new)

Invoked once daily by pg_cron via `pg_net` (setup in `structure.md`). No request body; behavior:

1. **Authenticate the caller.** The cron call carries a shared secret in an `x-cron-secret` header. The function compares it to its `CRON_SECRET` function secret: 401 on mismatch, 500 (fail closed) if `CRON_SECRET` is unset. The function deploys with `verify_jwt` disabled (per-function config) — the caller is Postgres, not a user session, so the header check replaces the JWT check. The same secret value lives in **two homes by design**: Vault, where the cron SQL reads it (`vault.decrypted_secrets`), and function secrets, where the function reads it. This is the case Vault actually exists for (a Postgres-side caller needing a secret) — unlike `RESEND_API_KEY`, which stays in function secrets only.
2. **Find due deliverables** (service role): `due_date` within the lead window (`REMINDER_LEAD_DAYS` function secret, default 3 days), `reminded_at is null`, and the parent campaign has `reminders_enabled = true`.
3. **Send one reminder per deliverable** through the same Resend path. Recipient rule: `owners` are display names, so every reminder delivers **only to `ALLOWED_RECIPIENT_EMAIL`**, with the owners named in the subject/body ("Reminder for Jackson, Sam: Newsletter photos due Jun 14"). This is forced by the existing constraints — the shared test sender only delivers to the account owner's address, and the server-side allowlist remains the single recipient guard.
4. **Record every send as an `email_jobs` row** (`deliverable_id` set), using the existing `sent`/`failed` + `error` pattern.
5. **Dedupe**: set `reminded_at` on the deliverable only after a successful send. A failed send leaves it null, so the next daily run retries it naturally. Never send when `reminded_at` is already set.
6. Return a summary (counts of sent/failed/skipped) for the logs.

**Failure visibility:** `pg_net` is fire-and-forget — cron does not retry, and HTTP failures land in `net._http_response` and the function's logs. That is acceptable because the retry story is structural (step 5), not transport-level.

**Secret rotation:** the dual-homed `CRON_SECRET` is rotated by updating function secrets and Vault back-to-back, between daily runs. The function does a single-value comparison (no old+new overlap), so a run that hits the gap fails with a 401 in `net._http_response`; nothing is lost — `reminded_at` stays unset and the next run catches up.

Both functions read their secrets via `Deno.env.get` and the service role key from the auto-injected `SUPABASE_SERVICE_ROLE_KEY`. None of these ever reach the client.

## Build order

Sequencing, acceptance criteria, and cut lines live in `features.md`. The one rule that belongs here: **Phase 1 (reset schema + re-pointed `schedule-email` + minimal campaign/deliverable CRUD) ships before any breadth feature.** An early stop must still leave a working system whose email path runs through the function.

## Working agreement for agents

- Work in plan mode. Produce a plan and wait for approval before writing or changing files.
- Explain every non-trivial block of code you author. The owner reviews each one.
- When a design or implementation choice originated from the agent rather than the owner, say so explicitly. Do not present agent decisions as the owner's.
- Keep RLS real. "Allow all" on `email_jobs` writes defeats the project.

-- 0001_init.sql — enums, tables, indexes, and RLS for the marketing calendar PoC.
-- Schema is taken verbatim from roadmap.md. Do not relax RLS here.

-- Enums
create type event_category as enum ('recruiting', 'retention', 'regatta', 'fundraising');
create type event_status   as enum ('planned', 'confirmed', 'done');
create type email_status   as enum ('draft', 'scheduled', 'sent', 'failed');

-- Tables
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

-- Indexes
create index events_event_date_idx      on events (event_date);
create index events_category_idx        on events (category);
create index email_jobs_event_id_idx    on email_jobs (event_id);
create index email_jobs_status_sched_idx on email_jobs (status, scheduled_for);

-- RLS
alter table events enable row level security;
alter table email_jobs enable row level security;

-- events: authenticated team can do everything (PoC simplification)
create policy events_authenticated_all on events
  for all to authenticated using (true) with check (true);

-- email_jobs: authenticated team can read; no client write policy exists,
-- so client inserts and updates are denied. The edge function writes with the service role.
--
-- The absence of an insert/update/delete policy on email_jobs is INTENTIONAL
-- (roadmap.md + CLAUDE.md invariant 3). Do not add one.
create policy email_jobs_read on email_jobs
  for select to authenticated using (true);

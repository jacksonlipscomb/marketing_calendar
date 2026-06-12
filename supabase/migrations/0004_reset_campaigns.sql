-- 0004_reset_campaigns.sql — DESTRUCTIVE reset: events PoC → campaign/deliverable model.
-- Schema is taken verbatim from roadmap.md. Do not relax RLS here.
--
-- ⚠️  This migration DROPS `events` and `email_jobs` and every row in them.
-- PoC data is throwaway (owner-confirmed, roadmap.md → Reset migration). Because
-- deploy.yml runs `supabase db push` on merge to main, merging this applies the
-- drop to the live project. The PR carrying this file must say so in plain words.

-- 1. Drop the PoC schema. email_jobs first (it holds the FK to events), then
--    events, then the enums only they used. email_status is kept and reused.
drop table email_jobs;
drop table events;
drop type event_category;
drop type event_status;

-- 2. New enums
create type campaign_category  as enum ('recruiting', 'retention', 'regatta', 'fundraising');
create type campaign_status    as enum ('planned', 'in_progress', 'done');
create type deliverable_status as enum ('backlog', 'in_progress', 'complete');

-- 3. Tables
create table campaigns (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  goal              text,                          -- free text: "raise $500k", "recruit 50 new athletes"
  category          campaign_category not null,
  start_date        date not null,
  end_date          date not null,
  segmentation      text,                          -- free-text audience label: "donors only", "current + alumni athletes"
  owners            text[] not null default '{}',  -- display names, not emails (roadmap.md → Scope)
  status            campaign_status not null default 'planned',
  reminders_enabled boolean not null default true, -- per-campaign toggle for the Phase 4 reminder job
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
  provider_message_id text,                 -- ID returned by the email provider, proves the send happened
  error               text,                 -- failure reason when status = 'failed'
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

-- 4. Indexes
create index campaigns_start_date_idx on campaigns (start_date);
create index campaigns_end_date_idx   on campaigns (end_date);
create index campaigns_category_idx   on campaigns (category);
create index campaigns_status_idx     on campaigns (status);

create index deliverables_campaign_id_idx on deliverables (campaign_id);
create index deliverables_due_date_idx    on deliverables (due_date);
create index deliverables_status_idx      on deliverables (status);
-- the Phase 4 reminder job's exact query shape: due soon, not yet reminded
create index deliverables_reminder_idx    on deliverables (due_date) where reminded_at is null;

create index email_jobs_deliverable_id_idx on email_jobs (deliverable_id);
create index email_jobs_status_sched_idx   on email_jobs (status, scheduled_for);

-- 5. RLS
alter table campaigns    enable row level security;
alter table deliverables enable row level security;
alter table email_jobs   enable row level security;

create policy campaigns_authenticated_all on campaigns
  for all to authenticated using (true) with check (true);

create policy deliverables_authenticated_all on deliverables
  for all to authenticated using (true) with check (true);

-- email_jobs: authenticated team can read; no client write policy exists,
-- so client inserts and updates are denied. The edge functions write with the
-- service role. The absence of an insert/update/delete policy on email_jobs is
-- INTENTIONAL (roadmap.md + CLAUDE.md invariant 3). Do not add one.
create policy email_jobs_read on email_jobs
  for select to authenticated using (true);

-- 6. Grants — required; hosted Supabase does not auto-grant for migration-created
--    tables, and RLS only filters on top of grants. authenticated + service_role
--    only; never anon (CLAUDE.md → Traps).
grant select, insert, update, delete on table public.campaigns    to authenticated;
grant select, insert, update, delete on table public.deliverables to authenticated;
grant select                         on table public.email_jobs   to authenticated;

grant all on table public.campaigns    to service_role;
grant all on table public.deliverables to service_role;
grant all on table public.email_jobs   to service_role;

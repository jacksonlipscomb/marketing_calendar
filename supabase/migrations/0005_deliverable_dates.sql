-- 0005_deliverable_dates.sql — deliverables become dated SPANS: replace the single
-- `due_date` column with `start_date` + `end_date`, bounded by the parent campaign.
--
-- ⚠️  DESTRUCTIVE-ish: this DROPS `deliverables.due_date`. No row is deleted —
-- existing deliverables are backfilled to single-day spans (start = end = due_date)
-- before the drop — but the `due_date` column and its indexes are gone for good.
-- deploy.yml runs `supabase db push` on merge to main, so merging this applies the
-- column drop to the live project. The PR carrying this file must say so plainly.
--
-- Cross-table integrity (the point of this migration): a deliverable's span must
-- sit inside its campaign's window. That bound spans two tables, so a CHECK can't
-- express it — both client-written paths (deliverables AND campaigns) are guarded
-- by triggers below, and the atomic clamp RPC handles the campaign-shrink cascade.

-- 1. Add the new columns nullable, backfill from due_date, then lock them down.
alter table deliverables add column start_date date;
alter table deliverables add column end_date   date;

update deliverables set start_date = due_date, end_date = due_date;

alter table deliverables alter column start_date set not null;
alter table deliverables alter column end_date   set not null;
alter table deliverables
  add constraint deliverables_dates_check check (end_date >= start_date);

-- 2. Drop due_date and the indexes that key off it (the partial reminder index and
--    the plain due_date index). Explicit drops before the column for clarity.
drop index deliverables_reminder_idx;
drop index deliverables_due_date_idx;
alter table deliverables drop column due_date;

-- 3. New indexes mirroring campaigns(start/end), plus the rebuilt reminder partial
--    index keyed on END date — the deliverable's deadline is what a reminder fires
--    on once send-reminders un-parks (see docs/archive/phase4-reminders.md).
create index deliverables_start_date_idx on deliverables (start_date);
create index deliverables_end_date_idx   on deliverables (end_date);
create index deliverables_reminder_idx   on deliverables (end_date) where reminded_at is null;

-- 4. Deliverable bounds trigger — rejects a deliverable whose span falls outside its
--    campaign's window. References `campaigns`, so it cannot be a CHECK constraint.
--    Fires on the columns that can break the bound (the dates and the FK).
create or replace function deliverables_enforce_bounds()
returns trigger
language plpgsql
as $$
declare
  c_start date;
  c_end   date;
begin
  select start_date, end_date into c_start, c_end
  from campaigns
  where id = new.campaign_id;

  if new.start_date < c_start or new.end_date > c_end then
    raise exception
      'Deliverable dates % – % fall outside the campaign window % – %',
      new.start_date, new.end_date, c_start, c_end
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger deliverables_bounds_trg
  before insert or update of start_date, end_date, campaign_id on deliverables
  for each row execute function deliverables_enforce_bounds();

-- 5. Campaign shrink guard — rejects a campaign date change that would orphan an
--    existing deliverable (push it outside the new window). Protects the plain
--    `update campaigns ...` path (useUpdateCampaign); the clamp RPC below is the
--    only sanctioned way to shrink past a deliverable, and it clamps first so this
--    guard sees no orphans when it runs inside the RPC's transaction.
create or replace function campaigns_guard_deliverable_bounds()
returns trigger
language plpgsql
as $$
declare
  orphan_count int;
begin
  -- Dates unchanged → nothing to guard (the trigger still fires for the field set,
  -- but a name/status edit that leaves the dates alone must not be blocked).
  if new.start_date = old.start_date and new.end_date = old.end_date then
    return new;
  end if;

  select count(*) into orphan_count
  from deliverables
  where campaign_id = new.id
    and (start_date < new.start_date or end_date > new.end_date);

  if orphan_count > 0 then
    raise exception
      '% deliverable(s) fall outside the new campaign window % – %',
      orphan_count, new.start_date, new.end_date
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger campaigns_bounds_guard_trg
  before update of start_date, end_date on campaigns
  for each row execute function campaigns_guard_deliverable_bounds();

-- 6. Atomic clamp RPC — the sanctioned campaign-shrink-with-cascade path. Updates the
--    campaign AND clamps overflowing children to the new window in ONE transaction,
--    so a partial apply can never leave orphaned children. Parameters mirror the
--    campaign update payload (campaignPayload on the client). security invoker (the
--    default) — runs as the authenticated caller under the same RLS/grants.
--
--    Order matters: (a) refuse if any child is UN-clampable (lies entirely outside
--    the new window, so greatest(start) > least(end) — clamping can't make a valid
--    span); (b) clamp clampable children FIRST — clamping into a sub-window of the
--    campaign's CURRENT (still-old, wider) window passes the deliverable bounds
--    trigger; (c) update the campaign last, by which point the shrink guard finds
--    no orphans.
create or replace function update_campaign_clamp(
  p_id                uuid,
  p_name              text,
  p_goal              text,
  p_category          campaign_category,
  p_start             date,
  p_end               date,
  p_segmentation      text,
  p_owners            text[],
  p_status            campaign_status,
  p_reminders_enabled boolean
)
returns campaigns
language plpgsql
as $$
declare
  unclampable int;
  result campaigns;
begin
  select count(*) into unclampable
  from deliverables
  where campaign_id = p_id
    and greatest(start_date, p_start) > least(end_date, p_end);

  if unclampable > 0 then
    raise exception
      '% deliverable(s) fall entirely outside % – % and cannot be auto-clamped; fix or delete them first',
      unclampable, p_start, p_end
      using errcode = 'check_violation';
  end if;

  update deliverables
  set start_date = greatest(start_date, p_start),
      end_date   = least(end_date, p_end),
      updated_at = now()
  where campaign_id = p_id
    and (start_date < p_start or end_date > p_end);

  update campaigns
  set name              = p_name,
      goal              = p_goal,
      category          = p_category,
      start_date        = p_start,
      end_date          = p_end,
      segmentation      = p_segmentation,
      owners            = p_owners,
      status            = p_status,
      reminders_enabled = p_reminders_enabled,
      updated_at        = now()
  where id = p_id
  returning * into result;

  return result;
end;
$$;

grant execute on function update_campaign_clamp(
  uuid, text, text, campaign_category, date, date, text, text[], campaign_status, boolean
) to authenticated;

-- 0007_categories.sql — campaign categories move from a fixed ENUM to a managed TABLE
-- so the team can create / rename+recolor / delete them.
--
-- ⚠️  SCHEMA-ALTERING: this DROPS campaigns.category (the campaign_category enum
-- column) and the campaign_category TYPE, and RECREATES the update_campaign_clamp
-- RPC (0005) with a category_id parameter. No campaign row is lost — category_id is
-- backfilled from the old enum by name before the column is dropped, and a backfill
-- assertion fails the migration loudly if any row is left unmapped. deploy.yml runs
-- `supabase db push` on merge to main, so merging this applies the change to prod.
-- The PR carrying this file must say so plainly.

-- 1. Categories table. Clients write it directly (like campaigns), so the DB carries
--    the real validation, not just the form: non-empty / untrimmed name, a hex color
--    matching <input type="color"> output, and case-insensitive name uniqueness.
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null,
  created_at timestamptz not null default now(),
  constraint categories_name_nonblank check (btrim(name) = name and length(name) > 0),
  constraint categories_color_hex     check (color ~* '^#[0-9a-f]{6}$')
);

-- Case-insensitive uniqueness so "Regatta" can't shadow "regatta".
create unique index categories_name_lower_idx on categories (lower(name));

-- 2. RLS — authenticated team has full access; never anon (mirrors campaigns, 0004).
alter table categories enable row level security;

create policy categories_authenticated_all on categories
  for all to authenticated using (true) with check (true);

-- 3. Grants — required; hosted Supabase does not auto-grant migration-created tables
--    (CLAUDE.md → Traps). authenticated + service_role only.
grant select, insert, update, delete on table public.categories to authenticated;
grant all                            on table public.categories to service_role;

-- 4. Seed the four existing categories. Colors are hex equivalents of the previous
--    --cat-* CSS vars (an imperceptible shift) so the picker round-trips in the UI.
insert into categories (name, color) values
  ('recruiting',  '#3b82f6'),
  ('retention',   '#10b981'),
  ('regatta',     '#f59e0b'),
  ('fundraising', '#ef4444');

-- 5. Repoint campaigns at the table. Add nullable, backfill from the enum by name,
--    assert every row mapped, then lock NOT NULL. ON DELETE RESTRICT is the
--    "block while in use" rule — deleting a referenced category raises 23503.
alter table campaigns
  add column category_id uuid references categories(id) on delete restrict;

update campaigns c
set category_id = cat.id
from categories cat
where cat.name = c.category::text;

do $$
begin
  if exists (select 1 from campaigns where category_id is null) then
    raise exception 'category_id backfill left % campaign row(s) unmapped',
      (select count(*) from campaigns where category_id is null);
  end if;
end;
$$;

alter table campaigns alter column category_id set not null;

-- 6. Drop the old enum column + its index; index the new FK.
drop index campaigns_category_idx;
alter table campaigns drop column category;
create index campaigns_category_id_idx on campaigns (category_id);

-- 7. Recreate update_campaign_clamp (0005) with category_id. The old function's
--    signature names the campaign_category type, so it must be dropped before the
--    type can go in step 8. The body is unchanged except category -> category_id.
drop function update_campaign_clamp(
  uuid, text, text, campaign_category, date, date, text, text[], campaign_status, boolean
);

create function update_campaign_clamp(
  p_id                uuid,
  p_name              text,
  p_goal              text,
  p_category_id       uuid,
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
      category_id       = p_category_id,
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
  uuid, text, text, uuid, date, date, text, text[], campaign_status, boolean
) to authenticated;

-- 8. Drop the now-unreferenced enum type.
drop type campaign_category;

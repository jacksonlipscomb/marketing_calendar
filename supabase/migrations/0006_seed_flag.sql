-- 0006_seed_flag.sql — synthetic demo-data marker on campaigns.
--
-- Additive and NON-destructive (unlike 0004/0005): it only ADDS a defaulted
-- column. The flag marks campaigns produced by the in-app "Demo data" generator
-- so they (and, via the existing FK cascades from 0004, their deliverables and
-- email_jobs) can be purged in one shot without touching hand-made data.
-- deploy.yml runs `supabase db push` on merge to main, so merging adds the
-- column to the live project — safe, since every existing row defaults to false.

-- 1. Add the flag. Default false → all existing rows are non-seed.
alter table campaigns add column is_seed boolean not null default false;

-- 2. Partial index: the purge query only ever filters on is_seed = true, so the
--    index covers just the seed rows and stays tiny.
create index campaigns_is_seed_idx on campaigns (is_seed) where is_seed = true;

-- No new grants and no RLS change: 0004 already grants select/insert/update/delete
-- on campaigns to authenticated (and all to service_role), and the
-- `campaigns_authenticated_all` policy already covers this column. The deliberate
-- absence of an email_jobs write policy is unchanged.

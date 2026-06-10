-- 0002_grants.sql — table privileges for the `authenticated` role.
--
-- RLS policies only take effect ON TOP OF table-level GRANTs. 0001 created the
-- tables, enabled RLS, and added policies, but did not grant table privileges to
-- `authenticated`. Without the grant, an authenticated (incl. anonymous) client is
-- denied at the privilege layer with "permission denied for table ..." before RLS
-- is ever evaluated. Grant privileges that mirror the policies in 0001:
--   events:     full CRUD (RLS governs which rows; policy = authenticated, true)
--   email_jobs: SELECT only — all writes go through the edge function with the
--               service role, which is unaffected by these grants. Intentionally
--               NO insert/update/delete here, matching the missing write policy.
grant select, insert, update, delete on table public.events to authenticated;
grant select on table public.email_jobs to authenticated;

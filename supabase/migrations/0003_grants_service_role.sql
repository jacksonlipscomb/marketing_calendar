-- 0003_grants_service_role.sql — table privileges for the service_role.
--
-- The schedule-email edge function reads `events` and writes `email_jobs` with the
-- SERVICE ROLE. service_role bypasses RLS, but it still needs table-level GRANTs.
-- On this hosted project the migration-created tables were not auto-granted to
-- service_role (same root cause as 0002 for `authenticated`), so the function hit
-- "permission denied for table events" on its event-existence check. 0002 granted
-- `authenticated` but not `service_role`; this grants service_role full access to
-- both tables so the function can read events and write email_jobs.
grant all on table public.events to service_role;
grant all on table public.email_jobs to service_role;

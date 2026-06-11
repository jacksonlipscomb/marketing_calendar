# CLAUDE.md

Project instructions for Claude Code. This file is the standing rule set. It does not restate the plan. For detail, read the reference docs below and do not duplicate them back into this file.

## Reference docs

- `roadmap.md`: purpose, the campaign/deliverable data model (enums, tables, RLS, grants, indexes, overlap semantics), and both edge function contracts (`schedule-email`, `send-reminders`).
- `structure.md`: repo layout, Supabase setup (migrations, pg_cron, Vault), Cloudflare Pages, and CI/CD pipelines.
- `features.md`: the phased build order, acceptance criteria, cut lines, and current phase status. Update its statuses as work lands.

Read all three before planning any task. If something here conflicts with them, stop and flag it instead of guessing.

## Non-negotiable invariants

These define whether the project succeeds. Do not violate them for convenience or speed.

1. All writes to `email_jobs` (insert and every status change) go through the edge functions — `schedule-email` and `send-reminders` — using the service role. The client never writes to `email_jobs`. It reads only.
2. The edge functions are the point of the project, not plumbing to route around. If a task seems easier by writing email rows from the client, or by sending reminders from anywhere but `send-reminders`, that is the failure this project exists to prevent.
3. RLS stays real. The missing insert/update/delete policy on `email_jobs` is intentional. Do not add one, and do not use "allow all" to unblock yourself.
4. Secrets have exactly two homes, by consumer: everything the Deno runtime reads (`RESEND_API_KEY`, `ALLOWED_RECIPIENT_EMAIL`, `CRON_SECRET`, `REMINDER_LEAD_DAYS`) lives in Supabase Edge Function secrets via `Deno.env.get`; the one thing Postgres itself reads (the caller half of the cron secret, `cron_secret`) lives in Vault — that is the case Vault exists for. Never put the provider key in Vault, the client bundle, or git. Never trust the client's `VITE_OWNER_EMAIL`; it only locks the field for display.
5. The recipient allowlist is enforced server-side in both functions (`ALLOWED_RECIPIENT_EMAIL`, fail closed). Every email — manual or reminder — delivers only to that address. `owners` are display names, not addresses; reminders name the owners in the content, they do not deliver to them.
6. Reminders never double-send: `send-reminders` selects only `reminded_at is null` and sets `reminded_at` only after a successful send. A failed send leaves it null so the next daily run retries — do not "fix" that by setting it earlier.

## Working agreement

- Work in plan mode. Produce a plan and wait for approval before creating or editing files.
- Explain every non-trivial block of code you write. The owner reviews each one.
- When a design or implementation choice came from you rather than the owner, say so plainly in your summary. Do not present your decisions as the owner's.
- Build in `features.md` phase order: Phase 1 (reset schema, re-pointed `schedule-email`, minimal CRUD) before any breadth feature. An early stop should still leave a working system.
- The reset migration is destructive and CI applies migrations on merge to main. The PR carrying it must say so in plain words, and the owner approves it knowing that.

## Stack

- Frontend: Vite, React, TypeScript.
- Routing and server state: TanStack Router (code-based router in `src/router.tsx`), TanStack Query. Page pattern: creation and detail flows are real deep-linkable routes (`/campaigns/:id`, `/campaigns/new`, ...) with breadcrumbs derived from the URL path; overlays remain for quick actions only.
- Client state: Zustand (`src/lib/uiStore.ts`).
- UI: shadcn over Radix, Tailwind **v4**. Tailwind v4 has no `tailwind.config`; it is wired via `@tailwindcss/vite` plus `@import "tailwindcss"` in `src/index.css`. shadcn primitives live in `src/components/ui/`.
- Forms and validation: react-hook-form with Zod (v4). Validate edge function input with Zod too, not just the client.
- Calendar and timeline: custom-built on `date-fns` (no calendar library).
- Supabase client: `src/lib/supabase.ts`, anon/publishable key, RLS-governed.
- Auth: anonymous sign-in (`supabase.auth.signInAnonymously()` in `src/lib/auth.ts`) so RLS `to authenticated` is satisfied with no login UI. Requires "Allow anonymous sign-ins" enabled in the Supabase dashboard.
- Multi-owner fields are Postgres `text[]`, never comma-joined text.

## Commands

```
npm run dev          # local frontend
npm run build        # production build to dist/
npm run lint
npm run typecheck
npm test             # if present

npx supabase db push                                  # apply migrations (destructive ones included — see working agreement)
npx supabase functions serve schedule-email           # run a function locally
npx supabase functions serve send-reminders
npx supabase functions deploy schedule-email
npx supabase functions deploy send-reminders --no-verify-jwt   # caller is Postgres; header auth replaces JWT
npx supabase secrets set RESEND_API_KEY=...           # provider key (never commit it)
npx supabase secrets set ALLOWED_RECIPIENT_EMAIL=...  # server-side recipient allowlist
npx supabase secrets set CRON_SECRET=...              # verifier half of the cron auth secret
npx supabase secrets set REMINDER_LEAD_DAYS=3         # reminder lead window (optional)
```

One-time SQL/dashboard setup (not CLI, not pipeline): enable "Allow anonymous sign-ins"; enable pg_cron + pg_net; create the Vault `cron_secret`; schedule the daily cron job. Exact SQL in `structure.md`.

## Traps to avoid

- Writing `email_jobs` from the client, or sending reminder email outside `send-reminders`. See invariants 1–2.
- Adding a write policy on `email_jobs` to get past an RLS denial. See invariant 3.
- Putting the provider key in Vault, the frontend, or git — or putting the cron caller secret anywhere but Vault. See invariant 4.
- Setting `reminded_at` before the send succeeds, or skipping the `reminded_at is null` check. See invariant 6.
- Overlap-query off-by-one: range filters use `start_date <= range_end AND end_date >= range_start`, bounds inclusive. Containment (`start_date >= range_start`) silently drops campaigns that straddle the range.
- Storing completion percentage. It is derived from deliverable statuses in the client hook — a stored column will drift.
- Enabling both Cloudflare's Git integration and the Actions frontend deploy. Pick one or you double-deploy. Settled: Actions. See `structure.md`.
- Treating `supabase db push` in CI as a normal pattern. It is single-environment-only here, and the reset migration makes it destructive. Do not carry it into a real multi-environment project.
- Reporting that email sending works when only part of the path was tested. State exactly what is real — in particular, a manual `send-reminders` invocation is not proof that the cron firing works.
- Forgetting table GRANTs. Hosted Supabase projects do NOT auto-grant table privileges for migration-created tables, and RLS only filters on top of grants — missing grants surface as `permission denied for table ...` before RLS runs. Every table-creating migration includes its grants (`authenticated` + `service_role`); never grant `anon`.
- Editing already-applied migrations (`0001`–`0003` and anything else `db push` has applied). New schema changes are new migration files.

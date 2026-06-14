# Handoff — Marketing Calendar (campaign/deliverable build)

> **Current as of 2026-06-14.** The original events-based PoC was replaced by a
> campaign/deliverable rewrite. The foundation, core UI, calendar bars, and
> deliverable deep linking are **live in production** (deep linking merged via PR
> #15); the reminder path is **built but parked**; two small navigation
> affordances (campaign back-to-list link + calendar deliverables opening the
> deliverable view) are **built and in review on a branch** (not yet
> merged/deployed); two high-priority backlog items remain **not built**. Read
> `CLAUDE.md`, `roadmap.md`, `structure.md`, and `features.md` first — they are
> current and authoritative. This file orients you and captures the
> operational/workflow knowledge those docs don't.

## 1. What this project is

A marketing calendar for a youth rowing club (NorCal), organized around
**campaigns** (multi-week efforts with a goal, segmentation, date range, and
owners) that break into **deliverables** (dated, owned, statused pieces of work).
Four categories: recruiting, retention, regatta, fundraising.

**The one claim it exists to prove:** all email sending routes through **Supabase
Edge Functions** that hold the sending secret, validate, persist the `email_jobs`
row with the service role, and record the result. The browser writes
`campaigns`/`deliverables` directly (RLS-governed) but **never writes
`email_jobs`** — it reads them only. That asymmetry is the whole point; don't
route around it.

- Live site: https://marketing-calendar-e7w.pages.dev
- Repo: `github.com/jacksonlipscomb/marketing_calendar`
- `main` is the production branch; merging to it deploys (see §6).

## 2. Where things stand

**Live on `main` (in production):**
- **Foundation** — destructive reset migration `0004_reset_campaigns.sql` (dropped
  the PoC `events`/`email_jobs`, created `campaigns` + `deliverables` +
  re-pointed `email_jobs(deliverable_id)`); multi-owner `text[]`; `schedule-email`
  re-pointed to `deliverable_id`; campaign/deliverable CRUD.
- **Core UI** — campaign list with range filter (inclusive overlap) + status
  filter; campaign detail with deliverable status filter and derived completion %
  (never stored); calendar; deep-linkable routes with URL breadcrumbs.
- **Calendar bars** — campaigns render as lane-stacked bars on the month grid,
  deliverables listed below; category filter hides both.
- **Deliverable deep linking** (PR #15) — the deliverable page loads standalone on
  a cold deep link (single-row `useDeliverable` hook, parent campaign embedded);
  title in the breadcrumb; explicit "← back to campaign" link; a campaignId/
  deliverable mismatch → not-found in both page and breadcrumb.

**Built but PARKED — not in production (`send-reminders`, PR #11 open):**
- The scheduled reminder edge function is written, locally verified, review-
  hardened, but parked by the owner (not needed for the demo). It is **not merged
  and not deployed**; even if merged it stays dormant until a one-time setup runs.
- Full spec, verification record, and the activation checklist: **`docs/archive/phase4-reminders.md`**.

**Built, in review — this PR (`feat-campaign-back-calendar-deliverable-link`, not yet merged/deployed):**
- **Campaign back-to-list link** — the campaign detail page now has an explicit
  "← Back to campaigns" link (mirrors the deliverable page's back link).
- **Calendar deliverable deep-link** — clicking a deliverable chip on the calendar
  now opens the deliverable view (`/campaigns/:id/deliverables/:id`) instead of the
  campaign page; campaign **bars** still open the campaign. Also fixed a latent
  keyboard bug (Enter/Space on the chip's Mail button no longer also navigates).
  Client-only — no schema/migration. Runtime-verified locally (6/6 Playwright).

**Queued, NOT built (high-priority backlog — `features.md` → High priority):**
- (1) deliverable start+end dates **replacing `due_date`** (becomes calendar
  spans/bars), (2) table/"exploded" grid view. Build order 1 → 2.

**Low priority / deferred:** campaign templates, the parked reminders, stretch UI
(week view, text wrapping, drawer). See `features.md` → Low priority.

## 3. Open PRs / branch state

- **PR #11** — `phase4-reminders`: the parked reminder feature. Left open
  intentionally; **currently CONFLICTING** with `main` (its `features.md`/
  `structure.md` edits are superseded by the docs reorg). That's expected —
  leave it; when un-parking, rebase onto `main` and drop the stale doc edits.
- **PR #15** (`feat-deliverable-deep-linking`) — deliverable deep linking — is
  **merged** (`main` tip `c481748`); branch deleted.
- **`feat-campaign-back-calendar-deliverable-link`** — this branch: campaign
  back-to-list link + calendar deliverable deep-link, cut fresh from `main`. PR
  pending; the owner opens and merges it.
- **PR #14** (`docs-high-priority-backlog`) is **merged** — `main` tip is its
  merge commit (`7a439d5`). Everything else is merged too.

## 4. Data model & code map (detail in roadmap.md / structure.md)

- **Tables:** `campaigns`, `deliverables` (FK→campaigns, cascade), `email_jobs`
  (FK→deliverables, cascade). **Enums:** `campaign_category`, `campaign_status`
  (planned/in_progress/done), `deliverable_status` (backlog/in_progress/complete),
  `email_status` (draft/scheduled/sent/failed).
- **Migrations:** `0001`–`0003` (PoC, applied long ago), `0004_reset_campaigns.sql`
  (the live reset). Never edit an applied migration; new schema = new file.
- **Edge functions:** `supabase/functions/schedule-email/` (live),
  `supabase/functions/send-reminders/` (parked, exists only in PR #11).
- **Frontend (`src/`):** hooks in `lib/` (`campaigns.ts`, `deliverables.ts`,
  `emailJobs.ts`, `schemas.ts`, `uiStore.ts`, `supabase.ts`, `auth.ts`, `env.ts`,
  hand-written `database.types.ts`); components incl. `CalendarMonth`,
  `CampaignForm`, `DeliverableForm`, `OwnersInput`, `RangeFilter`, `StatusFilter`,
  `CategoryFilter`, `Breadcrumbs`, `ConfirmDeleteButton`, `ScheduleEmailDialog`,
  `UpcomingSends`; code-based routes in `router.tsx` + `routes/`.
- **Stack:** Vite + React + TS; **Tailwind v4** (no config; `@tailwindcss/vite` +
  `@import "tailwindcss"` in `index.css`); **shadcn** in `components/ui/`;
  TanStack **Router** (code-based) + **Query**; **Zustand**; **react-hook-form +
  Zod v4**; **date-fns** (no calendar library); `@/` → `src/`. Data access lives
  in the `lib/` hooks — don't query Supabase ad hoc in components.

## 5. Non-negotiable guardrails (from CLAUDE.md invariants — do not violate)

1. All `email_jobs` writes go through the edge functions (`schedule-email`, and
   `send-reminders` when un-parked) with the service role. Client reads only.
2. The functions are the point — never write email rows from the client or send
   reminders from anywhere else.
3. RLS stays real. The missing insert/update/delete policy on `email_jobs` is
   intentional — don't add one; no "allow all".
4. Secrets, two homes: everything the Deno runtime reads (`RESEND_API_KEY`,
   `ALLOWED_RECIPIENT_EMAIL`, `CRON_SECRET`, `REMINDER_LEAD_DAYS`) → edge function
   secrets; the cron caller secret (`cron_secret`) → **Vault**. Provider key never
   in Vault/client/git.
5. Recipient allowlist enforced server-side (`ALLOWED_RECIPIENT_EMAIL`, fail
   closed). Every email goes only to that address; `owners` are display names, not
   addresses.
6. Reminders never double-send: select `reminded_at is null`, set `reminded_at`
   only after a successful send (the parked function writes it *first* among the
   post-send updates — see the archive doc).
- **Grants are explicit** (hosted Supabase doesn't auto-grant; RLS filters on top
  of grants). Every table-creating migration grants `authenticated` +
  `service_role`, never `anon`.
- **Don't store completion %** — derived from deliverable statuses in the hook.
- **Overlap query is inclusive:** `start_date <= range_end AND end_date >= range_start`.
  Containment silently drops straddling campaigns.

## 6. How to run, verify, deploy

- `npm run lint`, `npm run typecheck`, `npm run build` must stay green (CI runs
  them on PRs via `.github/workflows/ci.yml`).
- **Local full stack:** `npx supabase start` applies migrations + enables anon
  sign-ins (via `config.toml`). Create a gitignored `.env.local` pointing at the
  local stack (`VITE_SUPABASE_URL=http://127.0.0.1:54321`, `VITE_SUPABASE_ANON_KEY=`
  the publishable key from `npx supabase status`, `VITE_OWNER_EMAIL=allowed@example.com`)
  then `npm run dev`. **Delete `.env.local` afterward** so `npm run dev` uses the
  owner's live `.env`. The function env for `functions serve` lives in
  `supabase/functions/.env` (gitignored).
- **Browser checks:** Playwright is installed into `node_modules` with `--no-save`
  (not in package.json). Drive headless Chromium from a temp script *inside the
  project dir* (so it resolves `node_modules`), and delete the script + any
  `.env.local` after. The Phase 3 calendar-bars pass is the template (11 checks +
  screenshots).
- **Deploy (`.github/workflows/deploy.yml`, on push to `main`):** `supabase db
  push` (applies migrations — **destructive ones included**), deploy
  `schedule-email`, build + deploy frontend to Cloudflare Pages. The
  `send-reminders` deploy step exists only in PR #11.
- **One-time prod setup:** done — anon sign-ins, `RESEND_API_KEY`,
  `ALLOWED_RECIPIENT_EMAIL`, migrations, `schedule-email`. NOT done (parked with
  reminders) — `CRON_SECRET`, Vault `cron_secret`, pg_cron + pg_net, the cron
  schedule. Activation steps: `docs/archive/phase4-reminders.md`.

## 7. How the owner works (learned this build — match it)

- **Plan mode first.** Produce a plan, wait for approval before editing files.
  Explain every non-trivial block; the owner reviews each one. When a choice is
  yours, say so explicitly.
- **Review cadence:** after most plans and PRs the owner runs an external review
  and pastes *"Address findings if valid and valuable: …"*. Evaluate each finding,
  fix the valid/valuable ones, push to the same PR, and say plainly which you
  declined and why.
- **Publishing:** you push feature branches and open PRs; **the owner merges.**
  Hand them the PR link. Don't merge or push to `main` yourself.
- **Branching:** cut every branch fresh from `main` — **do not stack PRs.** Stacked
  PRs in this repo don't auto-retarget, and deleting an open PR's base branch
  *closes* the PR (it happened — #6 had to be reopened as #9). The owner deletes
  head branches on merge.
- **Destructive migrations:** CI `db push` applies them to prod on merge. Any PR
  carrying one needs a plain-words destructive-change callout, and the owner
  approves it knowing that (as with `0004`).
- **Verification honesty:** state exactly what was tested. A local function
  invocation is **not** proof the cron firing works; lint/build green is not proof
  the UI renders. Separate "verified" from "not verified, needs prod."

## 8. Likely next task

The high-priority backlog (`features.md` → High priority), in order 1 → 2 (the
former item 1, deliverable deep linking, is built and in review).
Heads-up for the next item — deliverable start/end replacing `due_date`: it carries
a **destructive-ish migration** (drops `due_date`), reworks the calendar
(deliverables become bars), and **breaks the parked `send-reminders` code + its
`due_date` index** — so that PR needs the destructive-change callout, and
un-parking reminders afterward means pointing the function at `start`/`end`. The
bound between deliverable and campaign dates must be guarded on **both**
client-written paths (deliverable trigger + campaign-date-change guard), with
atomic auto-clamp. Details in the backlog entry.

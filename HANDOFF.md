# Handoff — Marketing Calendar (campaign/deliverable build)

> **Current as of 2026-06-25.** The original events-based PoC was replaced by a
> campaign/deliverable rewrite. **Everything through the synthetic demo-data
> generator is shipped and live in production:** foundation, core UI, calendar bars,
> deliverable deep linking (PR #15), navigation affordances (PR #16), deliverable
> start/end spans (PR #19), the table/exploded view (PR #20), and — newest — the
> **demo-data generator + purge (PR #28)** — plus two Low-priority wins, the single-day
> deliverable option (PR #23) and the campaigns-tab category filter (PR #24). CI/Deploy
> actions run on Node 24 (PR #17) and the deploy is hardened against a flaky
> Supabase-CLI lookup (PR #21). The **multi-select status filter on the campaigns
> list** (PR #30) and the **responsive (mobile) header** (PR #32) are merged and
> live. **In progress — user-managed campaign categories (CRUD), as two PRs:**
> PR A (the `enum → categories` table migration + data-layer + rewire) is **in
> review**; PR B (the management-panel UI) is **next, not built** — see `features.md`
> and §2/§3/§8. The reminder path is **built but parked**; everything else
> outstanding is Low-priority.
> Read `CLAUDE.md`, `roadmap.md`, `structure.md`, and `features.md` first — they are
> current and authoritative. This file orients you and captures the operational/workflow
> knowledge those docs don't.

## 1. What this project is

A marketing calendar for a youth rowing club (Norcal), organized around
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
- **Navigation affordances** (PR #16) — the campaign detail page has a "← Back to
  campaigns" link; clicking a deliverable chip on the calendar opens the deliverable
  view (`/campaigns/:id/deliverables/:id`) — campaign **bars** still open the
  campaign; a keyboard guard stops the chip's Mail button from also navigating.
- **Deliverable start+end dates** (PR #19) — deliverables are dated **spans**
  bounded by their campaign window, rendering as bars in a band below the campaign
  bars. Migration `0005` (dropped `due_date`, rebuilt the reminder index on
  `end_date`) + cross-table guards (deliverable-bounds trigger, campaign-shrink
  guard trigger, atomic `update_campaign_clamp` RPC) + the date-shrink cascade UX.
  Un-parking `send-reminders` later means re-pointing its selection at `end_date`.
- **Table / "exploded" view** (PR #20) — a top-level `/table` page: one flat grid,
  one row per deliverable with the parent campaign denormalized onto the row; every
  column sortable (keyboard-operable); chip filters (category, campaign + deliverable
  status) + global name/owner search; CSV export of the current filtered/sorted view.
  Built on **TanStack Table** (`@tanstack/react-table`); client-only, no migration.
- **Single day option for deliverables** (PR #23) — a "Single day" checkbox above
  the deliverable date inputs collapses Start/End into one Date box (writes the same
  value to both); initializes checked when `start == end`. UI-only in
  `DeliverableForm.tsx`.
- **Campaigns-tab category filter** (PR #24) — the calendar's category chip filter
  on the campaigns list, filtering `useCampaigns` server-side via `.in("category", …)`.
  Its `campaignCategories` store state is **independent** of the calendar's
  `activeCategories`; `CategoryFilter` is now presentational so both tabs reuse it.
- **Synthetic demo data** (PR #28) — a "Demo data" panel on the Campaigns page:
  **Generate** bulk-inserts a demo year (12 campaigns across all four categories, 28
  deliverables, overlapping spans) tagged `campaigns.is_seed`; **Purge** removes only
  the seed via the campaign delete cascade. Migration `0006_seed_flag.sql` (additive
  `is_seed` flag + partial index); generation writes campaigns/deliverables only —
  **never `email_jobs`** (invariant 1 intact). Idempotent regenerate. Verified on the
  local stack (Playwright 16/16); deploy run green.
- **Multi-select status filter on the campaigns list** (PR #30) — the list's Status
  filter is multi-select, mirroring the campaigns-tab category multi-select (PR #24):
  uiStore `campaignStatuses[]` + `toggleCampaignStatus`, a presentational
  `StatusMultiFilter`, and `useCampaigns` `.in("status", …)` folded into the queryKey,
  plus an empty-set short-circuit (`statuses`/`categories` length 0 → `[]`, no reliance
  on `.in(col, [])`). Scoped to `campaigns.index.tsx` — the deliverable list and table
  status chips stay single-select. Client-only, no migration.
- **Responsive header for mobile** (PR #32) — `src/routes/__root.tsx` stacks the
  brand over the nav below `sm` (`flex-col items-start gap-3`) and restores the
  single row at `sm`+ (`sm:flex-row sm:items-center sm:justify-between sm:gap-0`),
  with `flex-wrap` on `<nav>`. Tailwind-only, no new component/state; desktop
  unchanged at 1280px.

**Built but PARKED — not in production (`send-reminders`, PR #11 open):**
- The scheduled reminder edge function is written, locally verified, review-
  hardened, but parked by the owner (not needed for the demo). It is **not merged
  and not deployed**; even if merged it stays dormant until a one-time setup runs.
- Full spec, verification record, and the activation checklist: **`docs/archive/phase4-reminders.md`**.

**Built, in review (not yet merged):**
- **Campaign categories — `enum → table` migration + rewire (PR A of 2)** — moves
  categories off the `campaign_category` enum onto a managed `categories` table
  (migration `0007`: table + RLS + grants + hex-color/non-empty checks +
  case-insensitive-unique index, seeded with the four current colors; `campaigns`
  gains `category_id uuid` FK `ON DELETE RESTRICT`, backfilled + asserted;
  `update_campaign_clamp` recreated with `p_category_id`). Client: new
  `src/lib/categories.ts` data layer; per-row colors replace the `--cat-*` CSS vars;
  the calendar + list category filters use a **hidden-set** `uiStore` model;
  `useCampaigns` takes `categoryFilter: string[] | null`; form/detail/table/calendar/
  demoData all rewired. **No user-visible change** (same four categories, table-backed).
  Verified on the local stack (migration + Playwright 10/10). **PR B (the management
  panel) is next.**

**Queued, NOT built (high-priority backlog):**
- **Manage campaign categories — management UI (PR B of 2)** — the user-facing
  create / rename+recolor / delete panel on the Campaigns page (like `DemoDataPanel`),
  reusing PR A's category hooks + `ConfirmDeleteButton`. Delete-in-use is already
  blocked at the DB (FK restrict); the panel disables/explains via the usage count.
  See `features.md` → High priority. **Not started; cut from `main` after PR A merges.**

**Low priority / deferred:** campaign templates, the parked reminders, and stretch UI
(week view, text wrapping, drawer). The campaigns-tab category filter (PR #24), the
single-day deliverable option (PR #23), and the brand-casing rename (a chore) have
shipped and graduated off this list. See `features.md` → Low priority.

## 3. Open PRs / branch state

- **PR #11** — `phase4-reminders`: the parked reminder feature. Left open
  intentionally; **currently CONFLICTING** with `main` (its `features.md` /
  `structure.md` edits are superseded by later docs). That's expected — leave it;
  when un-parking, rebase onto `main` and drop the stale doc edits.
- **PR A — `feat-categories-migration`** (categories `enum → table` migration +
  data layer + rewire), open and awaiting the owner's merge. **Carries migration
  `0007`**, which CI `db push` applies to prod on merge — the PR body calls that out.
  PR B (the management panel) is cut from `main` only after this merges (no stacking).
- **Everything else is merged.** Recent: **#30 (multi-select status filter)**, #31
  (docs: graduate #30), **#32 (responsive mobile header — the feature)**, #33
  (chore: `NorCal`→`Norcal` rename + graduate #32), and **#34 (docs: queued the
  categories-CRUD high-priority spec)**. Merged head branches are auto-deleted.

## 4. Data model & code map (detail in roadmap.md / structure.md)

- **Tables:** `categories` (id, name, color; PR A), `campaigns` (FK→categories via
  `category_id`, restrict), `deliverables` (FK→campaigns, cascade), `email_jobs`
  (FK→deliverables, cascade). **Enums:** `campaign_status`
  (planned/in_progress/done), `deliverable_status` (backlog/in_progress/complete),
  `email_status` (draft/scheduled/sent/failed). *(The `campaign_category` enum was
  removed in `0007` — categories are a table now.)*
- **Migrations:** `0001`–`0003` (PoC, applied long ago), `0004_reset_campaigns.sql`
  (the live reset), `0005_deliverable_dates.sql` (start/end spans + bound triggers +
  clamp RPC), `0006_seed_flag.sql` (additive `campaigns.is_seed` flag + partial index
  for the demo-data purge), `0007_categories.sql` (categories `enum → table`:
  `categories` table + RLS/grants, `campaigns.category_id` FK, `update_campaign_clamp`
  recreated, `campaign_category` enum dropped — PR A, in review). Never edit an
  applied migration; new schema = new file.
- **Edge functions:** `supabase/functions/schedule-email/` (live),
  `supabase/functions/send-reminders/` (parked, exists only in PR #11).
- **Frontend (`src/`):** hooks in `lib/` (`campaigns.ts`, `categories.ts`
  [`useCategories`/`useCategoryMap`/`useCategoryUsageCounts` + CRUD — PR A],
  `deliverables.ts`, `emailJobs.ts`, `schemas.ts`, `uiStore.ts`, `supabase.ts`,
  `auth.ts`, `env.ts`, `csv.ts`, `demoData.ts` [demo-data fixtures + `buildDemoData` +
  generate/purge hooks], hand-written `database.types.ts`); components incl. `CalendarMonth`,
  `CampaignForm`, `DeliverableForm`, `OwnersInput`, `RangeFilter`, `StatusFilter`,
  `CategoryFilter`, `Breadcrumbs`, `ConfirmDeleteButton`, `DemoDataPanel`,
  `ScheduleEmailDialog`, `UpcomingSends`; code-based routes in `router.tsx` + `routes/`.
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
- **Browser checks (recipe that works):** Docker must be running, then
  `npx supabase start`. There is **no `psql` on the host** — seed/inspect the DB via
  `docker exec -i supabase_db_Prototype_Marketing_Calendar psql -U postgres -d postgres`
  (local keys are deterministic; the publishable key prints in `npx supabase status`).
  Playwright is in `node_modules` (`--no-save`, not in package.json); drive headless
  Chromium from a temp `.mjs` *inside the project dir* (so it resolves
  `node_modules`). Seed throwaway rows with fixed UUIDs, assert, then **clean up**:
  delete the rows, remove the temp script + `.env.local`, and `npx supabase stop`.
  Recent templates: the PR #15 deep-link pass (8/8 checks) and PR #16 nav pass (6/6).
- **Deploy (`.github/workflows/deploy.yml`, on push to `main`):** two jobs —
  `deploy-supabase` (`supabase db push` — applies migrations, **destructive ones
  included** — then deploy `schedule-email`) and `deploy-frontend` (build + deploy
  to Cloudflare Pages). The `send-reminders` deploy step exists only in PR #11.
  **PR #21 hardened this:** `supabase/setup-cli` is pinned to `version: 2.105.0`
  (was `latest`, which resolved the newest release over the network and 504'd once
  — "Failed to resolve latest Supabase CLI release: Gateway Time-out"), and
  `deploy-frontend` now `needs: deploy-supabase` so the frontend can't ship against
  an un-migrated schema if the DB job fails. **CI + Deploy actions run on Node 24**
  (PR #17: checkout→v6, setup-node→v6, supabase/setup-cli→v2,
  cloudflare/wrangler-action→v4; the build steps' `node-version: 20` is separate and
  unchanged). To inspect a run's warning annotations:
  `gh api repos/jacksonlipscomb/marketing_calendar/check-runs/<job_id>/annotations`.
  The Vite "chunk > 500 kB" build line is a known, accepted informational warning
  (not worth code-splitting for this prototype).
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

**Next: PR B of the categories feature** — once PR A (`feat-categories-migration`)
merges, cut `feat-categories-manager` from updated `main` and build the management
**panel on the Campaigns page** (create / rename+recolor / delete), reusing PR A's
`useCreateCategory` / `useUpdateCategory` / `useDeleteCategory` /
`useCategoryUsageCounts` hooks and `ConfirmDeleteButton`. Add a `categoryFormSchema`
(non-empty name, hex color) mirroring the `0007` DB checks; surface `23505` as a
friendly "name already exists". Delete-in-use is already blocked at the DB (FK
restrict) — disable/explain via the usage count. Client-only, no migration. Spec in
`features.md` → High priority.

Then the Low-priority tier (`features.md` → Low priority):
- **Campaign templates** — needs a `00xx_templates.sql` (`templates` +
  `template_deliverables` with start/end day-offsets) + a "create from template"
  flow; the start/end date model it depends on is live. The largest remaining item.
- **Un-park reminders** — merge/rebase PR #11 and re-point `send-reminders`'
  selection from `due_date` to `end_date` (see §2 / `docs/archive/phase4-reminders.md`),
  then the one-time cron/Vault setup.
- **Stretch UI** — week-view mode, week-mode text wrapping, the drawer pattern.

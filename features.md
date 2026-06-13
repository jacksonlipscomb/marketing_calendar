# Marketing Calendar — Feature Sequencing

What gets built, in what order, and where the cut lines are. Architecture, data model, and function contracts live in `roadmap.md`; setup and deployment in `structure.md`. Update the phase statuses here as work lands — this file is the running state of the rewrite, the way the PoC roadmap tracked its phases.

## Demo goal

Ship **50–80% of the features well enough to tell 100% of the story**. The story: campaigns spanning weeks break into owned, dated deliverables; the calendar and timeline show the season at a glance; every email — manual or scheduled — runs through the edge functions. Each phase ends in a demoable state, so stopping after any phase still leaves a coherent product.

Ordering logic: Phase 1 is the dependency root (everything reads the new schema). Phase 2 makes the model legible. Phases 3–5 follow the owner's stated priority: timeline (highest demo value), reminders (proves the function is the backbone, not a one-off), templates (cheap once the model exists, shows product thinking). Phase 6 is stretch.

**Current state (2026-06-12):** Phases 1–3 are live on `main`. **Phase 4 (reminders) is built but parked — not in production** (see below). The next active phase is Phase 5 (templates).

## Phase 1 — Foundation: campaign/deliverable model — **status: live on `main`**

The reset migration and the minimum UI to use it. Blocking everything else.

Verified so far (local stack, 2026-06-11): migrations `0001→0004` apply cleanly in
the same sequence prod will run; old tables/enums gone, new schema live; as the
`authenticated` role, campaign + deliverable CRUD works with `text[]` owners and a
direct `email_jobs` insert is RLS-denied; the re-pointed function (served locally)
returned 201 + a coherent `scheduled` row for a future-dated job, 403 for a
disallowed recipient, 404 for an unknown deliverable. lint/typecheck/build green.
The destructive migration has since been applied to prod via merge; the React
UI was first click-tested in the Phase 3 Playwright pass.

- `0004_reset_campaigns.sql`: drop PoC tables (`email_jobs` then `events` then old enums), create `campaigns` + `deliverables` + re-pointed `email_jobs`, RLS, grants. **Destructive** — see roadmap.md → Reset migration.
- Re-point `schedule-email` to `deliverable_id` (request schema, existence check, types).
- Multi-owner `owners text[]` on both tables, with a tag-style input in the forms (stored as a real Postgres array, not comma-joined text).
- Minimal CRUD: create/edit campaign (name, goal, category, date range, segmentation, owners, status), create/edit deliverable (title, details, due date, owners, status) — so the schema is never UI-less.
- Update `database.types.ts`, `schemas.ts`, and replace `events.ts` with `campaigns.ts`/`deliverables.ts` hooks.

**Acceptance:** owner explicitly approved the destructive-migration PR, knowing `db push` on merge drops the PoC tables in production. Then, from the UI: create a campaign → add a deliverable → schedule an email for it → see a coherent `email_jobs` row written by the function.

**Cut line:** none. This phase is the floor; nothing later ships without it.

## Phase 2 — Core UI: lists, filters, calendar, pages — **status: live on `main`**

Makes the model legible. All read-path work, low risk.

Verified so far (2026-06-11): lint/typecheck/build green; the overlap query's
exact conditions checked against the local DB — a campaign straddling the Q2/Q3
boundary returns in both quarter windows, range+status combine, and a week
window includes overlapping long campaigns while excluding not-yet-started ones.
Completion % is computed from the unfiltered deliverable list by construction.
Browser click-through was first exercised in the Phase 3 Playwright pass. Nothing
built here was cut — both cut-line items (day/year ranges, breadcrumbs) shipped.

- Campaign list with **range filter** (day / week / month / quarter / year / all) using overlap semantics — a campaign appears in every range it overlaps (`start_date <= range_end AND end_date >= range_start`).
- **Status filter** on the campaign list (planned / in-progress / done), combinable with the range filter.
- Campaign detail page: deliverable list with its own status filter (backlog / in-progress / complete), plus the **derived completion %** (complete ÷ total, computed in the hook — never stored).
- Calendar renders **deliverables** (replacing events), with same-date items wrapped/stacked legibly in the day cell. Keep the existing overlay for quick views.
- **Page pattern + breadcrumbs**: `/campaigns`, `/campaigns/:id`, `/campaigns/new`, `/campaigns/:id/deliverables/new` as real deep-linkable routes; breadcrumbs derived from the URL path in the app shell.

**Acceptance:** every filter combination returns the right campaigns (spot-check a campaign spanning a quarter boundary appears in both quarters); completion % updates when a deliverable's status changes; a direct browser hit on `/campaigns/:id` renders (the `_redirects` fallback working).

**Cut line:** day/year range options (week/month/quarter/all carry the story); breadcrumb polish.

## Phase 3 — Campaign bars on the calendar — **status: live on `main`**

The owner's highest-value addition: concurrency at a glance.

**Re-specced by the owner 2026-06-11** after reviewing the first implementation
(a standalone List/Timeline toggle on /campaigns, merged in PR #9): campaigns
render as horizontal bars **on the calendar month view itself**, with
deliverables listed below the bars inside the day cells — one combined view.
The standalone timeline and the view toggle were deleted; /campaigns is
list-only (keeping the Phase 2 range/status filters).

- One bar segment per week row a campaign overlaps; multi-week campaigns
  continue across rows, the continuing side losing its rounding.
- Bar color = category; overlapping campaigns stack in lanes (greedy packing
  per week); clicking a bar (or Enter on focus) opens the campaign.
- The calendar's category toggles filter bars and deliverable chips together.
- Custom-built on date-fns + CSS (week-row containers, absolutely positioned
  bars over reserved cell space) — no calendar library.

**Acceptance & verification (passed 2026-06-11, Playwright against the local
stack — 11/11 checks + screenshots reviewed):** multi-week campaign renders one
segment per week with correct columns and clipped edges (incl. at the grid
boundary); two overlapping campaigns stack in separate lanes; bars sit below
day numbers and above chips with no overlap; two same-day chips both visible;
long names truncate inside the bar; toggling a category hides its bars and
chips together; clicking a bar and pressing Enter on a focused bar both
navigate to the right campaign. lint/typecheck/build green.

## Phase 4 — Reminder emails (scheduled send path) — **status: built, PARKED (not in production)**

Built and locally verified, then **parked by the owner on 2026-06-12** — not needed for the current demo. The work sits in **PR #11** (branch `phase4-reminders`), open and unmerged; even if merged it stays dormant until the one-time setup runs (no cron job calls it, and `CRON_SECRET` is unset so it fail-closes). The manual send path (`schedule-email`) is unaffected and live.

Full spec, verification record, and the activation checklist are archived in **[docs/archive/phase4-reminders.md](docs/archive/phase4-reminders.md)**. When un-parking, resume from there.

## Phase 5 — Campaign templates — **status: not started**

Cheap once the model exists; shows product thinking and saves real season setup time.

- `000N_templates.sql`: `templates` + `template_deliverables` (day-offsets from campaign start), RLS + grants, seeded with two templates: **recruiting** (the 4 standard deliverables) and **fundraising** (announcement, reminder, thank-you).
- "Create from template" flow: pick template → prefills name/category/goal/segmentation/duration and the deliverable set with computed due dates → fully editable before and after saving (a starting point, not a lock).

**Acceptance:** creating from the recruiting template yields a campaign with 4 deliverables dated relative to the chosen start date; editing or deleting any of them works like any hand-made campaign.

**Cut line:** template management UI — seeded templates are data; creating/editing templates themselves can stay SQL-only for the demo.

## Phase 6 — Stretch / low priority — **status: not started**

Nothing here blocks the demo story.

- **Week view mode** (absorbed from the old future-changes.md): calendar shows one week; Prev/Today/Next step by week.
- **Week-mode text wrapping** (ditto): titles wrap instead of truncating, without bleeding into other day cells.
- **Drawer pattern** as a mobile-friendly alternative to the overlay for deliverable/campaign quick views.

**Acceptance:** per item, on pickup.

**Cut line:** the whole phase.

## Failure modes (owner note)

Failure-mode handling beyond what the function contracts already specify (status + `error` on `email_jobs`, structural reminder retry) is deliberately unplanned: build, test against real failures (kill the key, drop the network), and decide what's worth hardening from observed behavior rather than speculation.

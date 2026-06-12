# Marketing Calendar — Feature Sequencing

What gets built, in what order, and where the cut lines are. Architecture, data model, and function contracts live in `roadmap.md`; setup and deployment in `structure.md`. Update the phase statuses here as work lands — this file is the running state of the rewrite, the way the PoC roadmap tracked its phases.

## Demo goal

Ship **50–80% of the features well enough to tell 100% of the story**. The story: campaigns spanning weeks break into owned, dated deliverables; the calendar and timeline show the season at a glance; every email — manual or scheduled — runs through the edge functions. Each phase ends in a demoable state, so stopping after any phase still leaves a coherent product.

Ordering logic: Phase 1 is the dependency root (everything reads the new schema). Phase 2 makes the model legible. Phases 3–5 follow the owner's stated priority: timeline (highest demo value), reminders (proves the function is the backbone, not a one-off), templates (cheap once the model exists, shows product thinking). Phase 6 is stretch.

## Phase 1 — Foundation: campaign/deliverable model — **status: not started**

The reset migration and the minimum UI to use it. Blocking everything else.

- `0004_reset_campaigns.sql`: drop PoC tables (`email_jobs` then `events` then old enums), create `campaigns` + `deliverables` + re-pointed `email_jobs`, RLS, grants. **Destructive** — see roadmap.md → Reset migration.
- Re-point `schedule-email` to `deliverable_id` (request schema, existence check, types).
- Multi-owner `owners text[]` on both tables, with a tag-style input in the forms (stored as a real Postgres array, not comma-joined text).
- Minimal CRUD: create/edit campaign (name, goal, category, date range, segmentation, owners, status), create/edit deliverable (title, details, due date, owners, status) — so the schema is never UI-less.
- Update `database.types.ts`, `schemas.ts`, and replace `events.ts` with `campaigns.ts`/`deliverables.ts` hooks.

**Acceptance:** owner explicitly approved the destructive-migration PR, knowing `db push` on merge drops the PoC tables in production. Then, from the UI: create a campaign → add a deliverable → schedule an email for it → see a coherent `email_jobs` row written by the function.

**Cut line:** none. This phase is the floor; nothing later ships without it.

## Phase 2 — Core UI: lists, filters, calendar, pages — **status: not started**

Makes the model legible. All read-path work, low risk.

- Campaign list with **range filter** (day / week / month / quarter / year / all) using overlap semantics — a campaign appears in every range it overlaps (`start_date <= range_end AND end_date >= range_start`).
- **Status filter** on the campaign list (planned / in-progress / done), combinable with the range filter.
- Campaign detail page: deliverable list with its own status filter (backlog / in-progress / complete), plus the **derived completion %** (complete ÷ total, computed in the hook — never stored).
- Calendar renders **deliverables** (replacing events), with same-date items wrapped/stacked legibly in the day cell. Keep the existing overlay for quick views.
- **Page pattern + breadcrumbs**: `/campaigns`, `/campaigns/:id`, `/campaigns/new`, `/campaigns/:id/deliverables/new` as real deep-linkable routes; breadcrumbs derived from the URL path in the app shell.

**Acceptance:** every filter combination returns the right campaigns (spot-check a campaign spanning a quarter boundary appears in both quarters); completion % updates when a deliverable's status changes; a direct browser hit on `/campaigns/:id` renders (the `_redirects` fallback working).

**Cut line:** day/year range options (week/month/quarter/all carry the story); breadcrumb polish.

## Phase 3 — Timeline view — **status: not started**

The owner's highest-value addition: concurrency at a glance.

- Horizontal bar per campaign; bar spans the campaign's date range; bar color = category.
- Deliverable due dates as ticks/points on the bar.
- Click a bar → campaign detail page.
- Zoom level ties to the existing range filter (week / month / quarter) rather than introducing a second range control.
- Custom-built on date-fns + CSS grid, consistent with the no-calendar-library decision.

**Acceptance:** two overlapping campaigns visibly overlap; ticks land on the right dates at every zoom level; clicking navigates to the right campaign.

**Cut line:** week zoom (month + quarter tell the story); tick hover detail.

## Phase 4 — Reminder emails (scheduled send path) — **status: not started**

Proves the edge function is the backbone, not a one-off. Full contract in roadmap.md → `send-reminders`.

- `send-reminders` function: cron-secret auth (`x-cron-secret` vs `CRON_SECRET`, fail closed, `verify_jwt` off), find deliverables due within `REMINDER_LEAD_DAYS` (default 3) with `reminded_at is null` and campaign `reminders_enabled = true`, send via Resend, write `email_jobs` rows, set `reminded_at` only on success.
- Recipient rule: reminders deliver **only to `ALLOWED_RECIPIENT_EMAIL`**, owners named in the content (owners are display names; the test sender can't deliver elsewhere anyway).
- One-time setup: pg_cron + pg_net, Vault `cron_secret`, daily schedule (SQL in structure.md).
- `reminders_enabled` toggle exposed on the campaign form.
- Add the `deploy send-reminders` step to `deploy.yml`.

**Acceptance:** invoking the function with the right header sends exactly one reminder per due deliverable and records each as an `email_jobs` row; a second invocation sends nothing (dedupe); wrong/missing header is rejected 401/500; a real cron firing appears in `cron.job_run_details` with a 2xx in `net._http_response`. **State exactly what was verified — never report cron delivery as working if only the manual invocation was tested.**

**Cut line:** per-campaign toggle UI (default-on with the column in place is enough to demo); `REMINDER_LEAD_DAYS` configurability (hardcoded 3 is fine).

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

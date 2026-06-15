# Marketing Calendar — Feature Status & Backlog

What's built and what's prioritized next, grouped by priority tier. Architecture, data model, and function contracts live in `roadmap.md`; setup and deployment in `structure.md`. This file is the running-state doc — update the tiers as work lands.

## Demo goal

Ship **50–80% of the features well enough to tell 100% of the story**. The story: campaigns spanning weeks break into owned, dated deliverables; the calendar shows the season at a glance with campaign bars and deliverables together; manual email runs through the edge function (the scheduled reminder path is built and ready, parked for now). The product is demoable today.

## How this doc is organized

Three tiers — **Implemented** (live in production), **High priority** (queued to build next), **Low priority** (deferred / parked / stretch) — plus a transient **Built, in review** holding area for code-complete work awaiting merge (it moves up to Implemented on deploy). Items carry their build state. Earlier this file tracked a numbered phase sequence; that history lives in git and the merged PRs.

**Current state (2026-06-14):** **all high-priority work is done and live.** The foundation, core UI, calendar bars, deliverable deep linking (PR #15), navigation affordances (PR #16), deliverable start/end dates (PR #19 — calendar spans + cross-table integrity), and the **table/exploded view** (PR #20) are all in production. **The High-priority tier is empty and nothing is in review.** What remains is the Low-priority tier (campaign-view category filter, single-day deliverable option, templates, parked reminders, stretch UI) — none of it blocks the demo. The product tells the full story today.

## Implemented (live in production)

Shipped and deployed via merge to `main`. Verification records, acceptance criteria, and cut lines are preserved in git history and the merged PRs (#7, #8, #10).

- **Foundation** — the destructive reset migration (`0004_reset_campaigns.sql`), campaign/deliverable schema with multi-owner `text[]`, `schedule-email` re-pointed to `deliverable_id`, and minimal campaign/deliverable CRUD.
- **Core UI** — campaign list with range filter (inclusive overlap semantics) + status filter; campaign detail with a deliverable status filter and derived completion % (never stored); calendar of deliverables; deep-linkable page routes with URL-derived breadcrumbs.
- **Calendar bars** — campaigns render as lane-stacked horizontal bars on the month grid; bars colored by category, click/keyboard-navigable; the category filter hides bars and deliverables together.
- **Deliverable deep linking** (PR #15) — the deliverable route loads standalone on a cold deep link via a single-row `useDeliverable` hook (parent campaign embedded), shows the deliverable's **title** in the breadcrumb, and carries an explicit "← back to campaign" link; a `campaignId`/deliverable mismatch shows not-found in both the page and the breadcrumb (the real title is never surfaced under the wrong campaign). *Decisions:* the edit page doubles as the detail view (no separate read-only route); a campaign mismatch shows not-found rather than redirecting.
- **Navigation affordances** (PR #16) — campaign detail gained a "← Back to campaigns" link; clicking a deliverable on the calendar opens the deliverable view (campaign bars still open the campaign); a keyboard guard stops the Mail button from also navigating.
- **Deliverable start + end dates** (PR #19) — deliverables are dated **spans** bounded by their campaign window, rendering as bars in a band below the campaign bars. Migration `0005` (added `start_date`/`end_date`, dropped `due_date`, rebuilt the reminder index on `end_date`) plus the cross-table guards: a deliverable-bounds trigger, a campaign-shrink guard trigger, and the atomic `update_campaign_clamp` RPC. UI: span inputs with campaign bounds, overlap range query, and a campaign date-shrink cascade (partial overflow → atomic clamp confirm; un-clampable → blocked, offenders named).
- **Table / "exploded" view** (PR #20) — a top-level `/table` page: one flat grid, **one row per deliverable** with the parent campaign's columns denormalized onto the row; every column sortable (keyboard-operable headers); filterable; CSV-exportable. Built on **TanStack Table**. Filters: a global text search over names/owners + page-local chip filters for category, campaign status, and deliverable status (they don't touch the calendar's filter). The deliverable-title cell deep-links into the deliverable view; CSV exports the current filtered/sorted view (11 visible columns) via a dependency-free `src/lib/csv.ts`. A `useUpdateCampaign` cache fix keeps the denormalized rows fresh after a campaign edit. *Decisions:* TanStack Table over hand-built; enum chips + global search over per-column inputs. *Known limitation:* grain is per-deliverable, so a campaign with no deliverables produces no rows.

## Built, in review (not yet merged)

_None right now — nothing is awaiting merge._ (This is a transient holding area; entries land here code-complete and move up to Implemented on deploy.)

## High priority

**Empty — all high-priority features are shipped and live** (deep linking #15, navigation #16, start/end dates #19, table view #20). Nothing is queued or in review. Next work comes from the Low-priority tier below, or whatever the owner reprioritizes for the demo.

## Low priority

Deferred, parked, or stretch — none blocks the demo story.

### Filter by category on Campaign View - *not built*

Cheap and easy to build. Add another filter on the campaigns tab that does the same thing as the filter on the Calendar tab: filters campaigns by Recruiting, Retention, Regatta, and Fundraising. This should be an easy implementation.

### Single day option for deliverables - *not built*

The option to click a check box that says "single day" right above the start and end date that transforms those two boxes into one single "date" box. 

### Campaign templates — *not built*

Cheap once the model exists; shows product thinking and saves real season setup time.

> **Depends on deliverable start/end dates** (live, PR #19): templates must use the same date model deliverables ended up with — the start/end span that replaced `due_date`. The offsets below assume that model.

- `000N_templates.sql`: `templates` + `template_deliverables` (start + end day-offsets from campaign start), RLS + grants, seeded with two templates: **recruiting** (the 4 standard deliverables) and **fundraising** (announcement, reminder, thank-you).
- "Create from template" flow: pick template → prefills name/category/goal/segmentation/duration and the deliverable set with computed start/end dates (campaign start + each offset, clamped to the campaign window) → fully editable before and after saving (a starting point, not a lock).

**Acceptance:** creating from the recruiting template yields a campaign with 4 deliverables whose start/end fall inside the chosen campaign window; editing or deleting any of them works like any hand-made campaign.

**Cut line:** template management UI — seeded templates are data; creating/editing templates themselves can stay SQL-only for the demo.

### Reminder emails (scheduled send path) — *built, parked, not in production*

Built and locally verified, then parked by the owner (2026-06-12) — not needed for the current demo. The work sits in **PR #11** (open, unmerged); even if merged it stays dormant until the one-time setup runs (no cron job calls it, and `CRON_SECRET` is unset so it fail-closes). The manual send path (`schedule-email`) is unaffected and live.

Full spec, verification record, and the activation checklist are archived in **[docs/archive/phase4-reminders.md](docs/archive/phase4-reminders.md)**. To un-park, resume from there.

### Stretch UI — *not built*

- **Week view mode** (absorbed from the old future-changes.md): calendar shows one week; Prev/Today/Next step by week.
- **Week-mode text wrapping**: titles wrap instead of truncating, without bleeding into other day cells.
- **Drawer pattern** as a mobile-friendly alternative to the overlay for deliverable/campaign quick views.

**Acceptance:** per item, on pickup.

## Failure modes (owner note)

Failure-mode handling beyond what the function contracts already specify (status + `error` on `email_jobs`, structural reminder retry) is deliberately unplanned: build, test against real failures (kill the key, drop the network), and decide what's worth hardening from observed behavior rather than speculation.

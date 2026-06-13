# Marketing Calendar — Feature Status & Backlog

What's built and what's prioritized next, grouped by priority tier. Architecture, data model, and function contracts live in `roadmap.md`; setup and deployment in `structure.md`. This file is the running-state doc — update the tiers as work lands.

## Demo goal

Ship **50–80% of the features well enough to tell 100% of the story**. The story: campaigns spanning weeks break into owned, dated deliverables; the calendar shows the season at a glance with campaign bars and deliverables together; manual email runs through the edge function (the scheduled reminder path is built and ready, parked for now). The product is demoable today.

## How this doc is organized

Three tiers — **Implemented** (live in production), **High priority** (queued to build next), **Low priority** (deferred / parked / stretch). Items carry their build state. Earlier this file tracked a numbered phase sequence; that history lives in git and the merged PRs.

**Current state (2026-06-13):** the foundation, core UI, and calendar bars are live. Nothing is queued as high priority. Everything remaining — including the built-but-parked reminder emails — is low priority.

## Implemented (live in production)

Shipped and deployed via merge to `main`. Verification records, acceptance criteria, and cut lines are preserved in git history and the merged PRs (#7, #8, #10).

- **Foundation** — the destructive reset migration (`0004_reset_campaigns.sql`), campaign/deliverable schema with multi-owner `text[]`, `schedule-email` re-pointed to `deliverable_id`, and minimal campaign/deliverable CRUD.
- **Core UI** — campaign list with range filter (inclusive overlap semantics) + status filter; campaign detail with a deliverable status filter and derived completion % (never stored); calendar of deliverables; deep-linkable page routes with URL-derived breadcrumbs.
- **Calendar bars** — campaigns render as lane-stacked horizontal bars on the month grid with deliverables listed below; bars colored by category, click/keyboard-navigable; the category filter hides bars and chips together.

## High priority

_None right now._ When something is queued to build next, it goes here.

## Low priority

Deferred, parked, or stretch — none blocks the demo story.

### Campaign templates — *not built*

Cheap once the model exists; shows product thinking and saves real season setup time.

- `000N_templates.sql`: `templates` + `template_deliverables` (day-offsets from campaign start), RLS + grants, seeded with two templates: **recruiting** (the 4 standard deliverables) and **fundraising** (announcement, reminder, thank-you).
- "Create from template" flow: pick template → prefills name/category/goal/segmentation/duration and the deliverable set with computed due dates → fully editable before and after saving (a starting point, not a lock).

**Acceptance:** creating from the recruiting template yields a campaign with 4 deliverables dated relative to the chosen start date; editing or deleting any of them works like any hand-made campaign.

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

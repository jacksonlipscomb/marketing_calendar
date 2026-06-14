# Marketing Calendar — Feature Status & Backlog

What's built and what's prioritized next, grouped by priority tier. Architecture, data model, and function contracts live in `roadmap.md`; setup and deployment in `structure.md`. This file is the running-state doc — update the tiers as work lands.

## Demo goal

Ship **50–80% of the features well enough to tell 100% of the story**. The story: campaigns spanning weeks break into owned, dated deliverables; the calendar shows the season at a glance with campaign bars and deliverables together; manual email runs through the edge function (the scheduled reminder path is built and ready, parked for now). The product is demoable today.

## How this doc is organized

Three tiers — **Implemented** (live in production), **High priority** (queued to build next), **Low priority** (deferred / parked / stretch) — plus a transient **Built, in review** holding area for code-complete work awaiting merge (it moves up to Implemented on deploy). Items carry their build state. Earlier this file tracked a numbered phase sequence; that history lives in git and the merged PRs.

**Current state (2026-06-14):** the foundation, core UI, and calendar bars are live. Deliverable deep linking is **built and in review** — code-complete on a branch, static checks green, not yet merged/deployed (see below). Two items remain queued as high priority (deliverable start/end dates, table view). Everything else — including the built-but-parked reminder emails — is low priority.

## Implemented (live in production)

Shipped and deployed via merge to `main`. Verification records, acceptance criteria, and cut lines are preserved in git history and the merged PRs (#7, #8, #10).

- **Foundation** — the destructive reset migration (`0004_reset_campaigns.sql`), campaign/deliverable schema with multi-owner `text[]`, `schedule-email` re-pointed to `deliverable_id`, and minimal campaign/deliverable CRUD.
- **Core UI** — campaign list with range filter (inclusive overlap semantics) + status filter; campaign detail with a deliverable status filter and derived completion % (never stored); calendar of deliverables; deep-linkable page routes with URL-derived breadcrumbs.
- **Calendar bars** — campaigns render as lane-stacked horizontal bars on the month grid with deliverables listed below; bars colored by category, click/keyboard-navigable; the category filter hides bars and chips together.

## Built, in review (not yet merged)

Code-complete on a branch with static checks green, awaiting merge + runtime verification — **not yet live in production.** Each entry moves up to Implemented on deploy.

- **Deliverable deep linking + back affordance** — branch `feat-deliverable-deep-linking` (2026-06-14). The deliverable route loads standalone on a cold deep link via a single-row `useDeliverable` hook (parent campaign embedded), shows the deliverable's **title** in the breadcrumb, and carries an explicit "← back to campaign" link. A stale URL whose `campaignId` doesn't match the deliverable shows not-found in both the page and the breadcrumb (the real title is never surfaced under the wrong campaign). Client-only — no schema/migration. *Decisions (mine):* the edit page doubles as the detail view (combined detail+edit, no separate read-only route); a campaign mismatch shows not-found rather than redirecting. *Verification:* `typecheck`/`lint`/`build` green; **not yet** runtime-verified (cold load, RLS, stale-mismatch, breadcrumb title) or deployed.

## High priority

Two items queued to build next, in order — **1 → 2**. Item 1 (deliverable start/end dates) is bigger than it looks — it reworks the calendar and ripples into the parked reminder path; item 2 (table view) is a real feature and the larger of the two. Each entry notes what it touches in the codebase. (The third backlog item, deliverable deep linking, is built and in review — see above.)

### 1. Deliverable start + end dates (replaces `due_date`) — *bigger than it looks*

Deliverables become dated spans instead of single-day items, bounded by their campaign's window.

- **Decided**: add `start_date` + `end_date`, **remove `due_date`**; both required; date-only. Constraints: `start >= campaign.start`, `end <= campaign.end`, `start <= end`. Campaigns stay bounded (`end_date` required), so a deliverable's end is always bounded.
- **Enforcement guards BOTH client-written paths** (campaigns and deliverables are both written directly under RLS — no edge function — so Zod/CHECK alone can't protect the cross-table bound):
  - deliverable insert/update → a trigger that looks up the campaign and rejects out-of-bounds (a CHECK can't reference `campaigns`);
  - campaign date update → a guard that rejects (or atomically clamps) a `start`/`end` shrink that would orphan existing deliverables.
  - Zod in the form stays as the UX layer, not the integrity guarantee.
- **Cascade UX**: when a campaign date edit would push deliverables out of bounds, warn on save and offer auto-clamp or manual fix. **Auto-clamp must be atomic** — the campaign update and the child-deliverable clamp happen in one transaction/RPC (the same one as the campaign-side guard), so a partial apply can never leave orphaned children.
- **Calendar rework (the real effort)**: [CalendarMonth.tsx](src/components/CalendarMonth.tsx) plots deliverable chips by `due_date`; as spans they render as **bars alongside the campaign bars**. The deliverables range query becomes an overlap query on start/end (mirroring `useCampaignsInRange` in [campaigns.ts](src/lib/campaigns.ts)).
- **Parked-reminder ripple**: `send-reminders` (PR #11) and the partial index `deliverables_reminder_idx (due_date) where reminded_at is null` both key off `due_date`. The migration must rebuild that index on the new date column, and **un-parking reminders later means choosing `start` or `end` to fire on** — see [docs/archive/phase4-reminders.md](docs/archive/phase4-reminders.md).
- **Touches**: a new migration (add start/end, backfill from `due_date`, drop `due_date`, `deliverables_dates_check`, rebuilt reminder index, the two bound guards), `database.types.ts`, [schemas.ts](src/lib/schemas.ts) (`deliverableFormSchema` + `deliverablePayload`), [DeliverableForm.tsx](src/components/DeliverableForm.tsx), the new/edit deliverable pages, deliverables.ts (range → overlap, ordering), CalendarMonth.tsx, [campaigns.$id.tsx](src/routes/campaigns.$id.tsx) (show the start–end window).

### 2. Table / spreadsheet "exploded" view — *a feature, the largest item*

One flat, sortable, filterable, exportable grid of everything.

- **Grain**: one row = one deliverable, with parent campaign columns denormalized onto the row (grouped/nested rows break column sort). Columns: campaign name/start/end/category/status/owners; deliverable name/start/end/status/owners.
- **Depends on** the deliverable deep link (built, in review — rows link into it) and item 1 (deliverable start/end columns) — which is why it's last.
- **The work**: a new route (e.g. `/table`) + nav link in [__root.tsx](src/routes/__root.tsx) + a Breadcrumbs case + registration in [router.tsx](src/router.tsx); a denormalized query (all deliverables joined with campaign columns, flattened); per-column sort + filter; CSV export of the **current filtered/sorted view** (default), client-side, no dependency (xlsx only if formatting/multi-sheet is ever needed).
- **Build decision** (flag): hand-built vs. **TanStack Table** (headless; fits the existing TanStack Router/Query stack) — recommend TanStack Table for the sort/filter plumbing at this scope.
- **Touches**: a new route file, router.tsx, __root.tsx, Breadcrumbs.tsx, a new query hook (deliverables.ts or a new `lib/table.ts`), a small CSV helper.

## Low priority

Deferred, parked, or stretch — none blocks the demo story.

### Campaign templates — *not built*

Cheap once the model exists; shows product thinking and saves real season setup time.

> **Depends on High-priority item 1** (deliverable dates): templates must use the same date model deliverables end up with. The offsets below assume the start/end span that replaces `due_date` — build templates *after* item 1 lands, or revisit this entry if that decision changes.

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

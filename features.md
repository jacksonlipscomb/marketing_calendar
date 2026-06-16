# Marketing Calendar — Feature Status & Backlog

What's built and what's prioritized next, grouped by priority tier. Architecture, data model, and function contracts live in `roadmap.md`; setup and deployment in `structure.md`. This file is the running-state doc — update the tiers as work lands.

## Demo goal

Ship **50–80% of the features well enough to tell 100% of the story**. The story: campaigns spanning weeks break into owned, dated deliverables; the calendar shows the season at a glance with campaign bars and deliverables together; manual email runs through the edge function (the scheduled reminder path is built and ready, parked for now). The product is demoable today.

## How this doc is organized

Three tiers — **Implemented** (live in production), **High priority** (queued to build next), **Low priority** (deferred / parked / stretch) — plus a transient **Built, in review** holding area for code-complete work awaiting merge (it moves up to Implemented on deploy). Items carry their build state. Earlier this file tracked a numbered phase sequence; that history lives in git and the merged PRs.

**Current state (2026-06-16):** the implemented foundation, core UI, calendar, table view, and filters are all live in production. The one high-priority item — **synthetic demo data (generate + purge)** — is now **built and in review** (`feat-synthetic-demo-data`): a one-click way to populate a full demo year (12 campaigns, 28 deliverables across all four categories) and a one-click purge that removes only the generated data. The rest of the backlog is Low priority (templates, parked reminders, stretch UI) and does not block the demo; the product tells the full story today.

## Implemented (live in production)

Shipped via merge to `main` — one line each; full detail, verification, and decisions live in git history and each PR.

- **Foundation & core UI** — reset migration `0004` (campaign/deliverable schema, multi-owner `text[]`), `schedule-email` on `deliverable_id`, campaign/deliverable CRUD; campaign list with range (inclusive overlap) + status filters and derived completion % (never stored); deep-linkable routes with URL breadcrumbs.
- **Calendar** — campaigns as lane-stacked, category-colored bars on the month grid; deliverables as span bars in a band below; category filter hides both.
- **Deliverable deep linking** (#15) — standalone load on a cold deep link (single-row `useDeliverable`), title in the breadcrumb, back-to-campaign link, campaign mismatch → not-found.
- **Navigation affordances** (#16) — campaign "← Back to campaigns" link; a calendar deliverable opens the deliverable view (bars still open the campaign).
- **Deliverable start/end spans** (#19) — deliverables are dated spans bounded by their campaign window; migration `0005` (adds start/end, drops `due_date`, reminder index on `end_date`) + cross-table guards (deliverable-bounds trigger, campaign-shrink guard, atomic `update_campaign_clamp` RPC) + the date-shrink cascade UX.
- **Table / "exploded" view** (#20) — `/table`: one flat row per deliverable (parent campaign columns denormalized), every column sortable, chip + text filters, CSV export. Built on TanStack Table.
- **Single-day deliverable option** (#23) — a "Single day" checkbox collapses the Start/End inputs into one Date box (`start == end`).
- **Campaigns-tab category filter** (#24) — the calendar's category chips on the campaigns list, with state independent of the calendar's; filters the query server-side.

## Built, in review (not yet merged)

- **Synthetic demo data — generate a full year + one-click purge** — branch `feat-synthetic-demo-data`. A "Demo data" panel on the Campaigns page: **Generate** bulk-inserts a realistic demo year (12 campaigns across all four categories, 28 deliverables, overlapping spans, statuses derived from today) tagged `campaigns.is_seed = true`; **Purge** (confirm-guarded) deletes the seed campaigns and rides the existing `0004` FK cascade to clear their deliverables and any email_jobs. Migration `0006_seed_flag.sql` adds the additive, non-destructive `is_seed` flag + partial index (no new grants). Otherwise client-only: `src/lib/demoData.ts` (static fixtures + `buildDemoData` + `useGenerateDemoData`/`useDeleteSeedData`) and `src/components/DemoDataPanel.tsx`. **No `email_jobs` written** — generation stays in the client's RLS write surface; purge reuses the same cascade as the single-campaign delete (invariant 1 intact). Idempotent regenerate (purge-then-insert). *Verification:* lint/typecheck/build green; runtime-verified locally (Playwright). **Not yet deployed.**

## High priority

**Empty — the synthetic demo-data feature moved to _Built, in review_ above.** Next work comes from the Low-priority tier below, or whatever the owner reprioritizes for the demo.

## Low priority

Deferred, parked, or stretch — none blocks the demo story. (The campaign-tab category filter and the single-day deliverable option have shipped — see Implemented above.)

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

# Marketing Calendar — Feature Status & Backlog

What's built and what's prioritized next, grouped by priority tier. Architecture, data model, and function contracts live in `roadmap.md`; setup and deployment in `structure.md`. This file is the running-state doc — update the tiers as work lands.

## Demo goal

Ship **50–80% of the features well enough to tell 100% of the story**. The story: campaigns spanning weeks break into owned, dated deliverables; the calendar shows the season at a glance with campaign bars and deliverables together; manual email runs through the edge function (the scheduled reminder path is built and ready, parked for now). The product is demoable today.

## How this doc is organized

Three tiers — **Implemented** (live in production), **High priority** (queued to build next), **Low priority** (deferred / parked / stretch) — plus a transient **Built, in review** holding area for code-complete work awaiting merge (it moves up to Implemented on deploy). Items carry their build state. Earlier this file tracked a numbered phase sequence; that history lives in git and the merged PRs.

**Current state (2026-06-15):** the implemented foundation, core UI, calendar, table view, and filters are all live in production, and nothing is in review. **One high-priority item is now queued: synthetic demo data (generate + purge)** — a one-click way to populate a full demo year (10–15 campaigns, ~25–30 deliverables) so the calendar can be exercised end to end, with a one-click purge that removes only the generated data. The rest of the backlog is Low priority (templates, parked reminders, stretch UI) and does not block the demo; the product tells the full story today.

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

_None right now._

## High priority

### Synthetic demo data — generate a full year + one-click purge — *not built*

One-click population of a realistic demo **year** so the calendar, table, and filters can be exercised end to end, plus a one-click **purge** that removes only the generated data and never touches real campaigns. For demos and manual testing.

**Data shape (one "Generate" run):**

- 10–15 campaigns across all four categories (recruiting, retention, regatta, fundraising) over a ~12-month window centered on today, with **overlapping** ranges so the calendar's lane-stacking and timeline concurrency show.
- ~25–30 deliverables total (the "events"), ≈2 per campaign. Each span sits **inside** its parent campaign window (so the `0005` `deliverables_enforce_bounds` trigger passes); mix single-day and multi-day spans.
- Varied statuses on both levels (campaign planned/in_progress/done; deliverable backlog/in_progress/complete) so the derived completion % and the status filters show range.
- Realistic names/owners from a fixed, dependency-free fixtures table (no faker) in a new `src/lib/demoData.ts`: a small owners pool plus category-appropriate campaign names ("Fall Recruiting Drive", "Spring Regatta Season", "Year-End Giving Push", "Alumni Re-engagement") and deliverable titles ("Announcement email", "Newsletter photos", "Registration form", "Thank-you mailer").
- **No `email_jobs` are generated** — generation stays entirely inside the client's RLS write surface (invariants 1–2).

**Marker + storage (the "specific place"):** a new **additive, non-destructive** migration (next free number, `0006_seed_flag.sql`) adds `is_seed boolean not null default false` to `campaigns`, plus a partial index `campaigns_is_seed_idx on campaigns (is_seed) where is_seed = true`. **No new grants** — `campaigns` already grants insert/update/delete to `authenticated`. Deliverables need no flag: they belong to seed campaigns and cascade-purge with their parent. The column also requires updating the hand-written `src/lib/database.types.ts` (campaign Row/Insert) so `is_seed` is settable in the insert payload; the campaign create/edit forms ignore it (DB default `false`) — only `generateDemoData()` sets it `true`.

**Generate path (client-side):** reuse `useCreateCampaign` / `useCreateDeliverable`; a thin `generateDemoData()` inserts campaigns with `is_seed: true`, then inserts each campaign's deliverables against the returned ids with spans clamped inside the campaign window. *Idempotent regenerate (agent decision):* Generate purges existing seed first, then inserts a fresh year, so repeated clicks don't accumulate; invalidate `["campaigns"]` / `["deliverables"]` after. *Partial-failure (agent decision):* the client purge-then-insert is **not transactional**, so a mid-run insert failure can leave a partial seed set — acceptable for a demo tool, surfaced by panel copy ("if generation fails, click Generate again to reset"). A single atomic purge+insert RPC is the upgrade path, not built now.

**Purge path (client-side):** a `useDeleteSeedData` hook issues `.from("campaigns").delete().eq("is_seed", true)`; the existing FK cascade removes those campaigns' deliverables and any `email_jobs` — the same cascade the single-campaign delete already uses, so nothing new touches the `email_jobs` write surface (invariant 1 intact). Guard behind `ConfirmDeleteButton`, with copy that names what's removed — the generated demo campaigns **and their deliverables** — not just "demo data." Invalidate `["campaigns"]`, `["deliverables"]`, `["upcoming-sends"]`.

**UI:** a compact "Demo data" panel (Generate + confirm-guarded Purge + a one-line caption) embedded on the Campaigns list page (`src/routes/campaigns.index.tsx`). *Placement note:* a panel on an existing page (rather than a dedicated route) is the owner's choice; hosting it on the Campaigns list is an agent recommendation — the management surface, keeping destructive controls off the headline calendar.

**Acceptance:** Generate on an empty project yields 10–15 seed campaigns and ~25–30 deliverables visible across the calendar, table, and lists, every deliverable span inside its campaign window, statuses varied; Purge removes exactly the seed data (cascading to its deliverables); regenerating does not double the data; generation creates no `email_jobs` rows. Hand-made data is preserved: a non-seed campaign created before Generate survives **both** a Purge and a regenerate (only `is_seed = true` rows are touched).

**Cut line:** static fixtures (no randomization library; per-run variation only from date arithmetic); a single fixed "year" template is enough for the demo.

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

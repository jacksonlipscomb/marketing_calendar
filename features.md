# Marketing Calendar — Feature Status & Backlog

What's built and what's prioritized next, grouped by priority tier. Architecture, data model, and function contracts live in `roadmap.md`; setup and deployment in `structure.md`. This file is the running-state doc — update the tiers as work lands.

## Demo goal

Ship **50–80% of the features well enough to tell 100% of the story**. The story: campaigns spanning weeks break into owned, dated deliverables; the calendar shows the season at a glance with campaign bars and deliverables together; manual email runs through the edge function (the scheduled reminder path is built and ready, parked for now). The product is demoable today.

## How this doc is organized

Three tiers — **Implemented** (live in production), **High priority** (queued to build next), **Low priority** (deferred / parked / stretch) — plus a transient **Built, in review** holding area for code-complete work awaiting merge (it moves up to Implemented on deploy). Items carry their build state. Earlier this file tracked a numbered phase sequence; that history lives in git and the merged PRs.

**Current state (2026-06-25):** the foundation, core UI, calendar, table view, filters, the **synthetic demo-data generator + purge** (#28), the **multi-select status filter on the campaigns list** (#30), and the **responsive (mobile) header** (#32) are all live in production. **High-priority in progress — user-managed campaign categories (CRUD), built as two PRs:** PR A (the `enum → categories` table migration + data layer + rewiring every consumer) is **in review**; PR B (the management panel UI) is **next, not built**. The Low-priority tier (templates, parked reminders, stretch UI) is unchanged and none of it blocks the demo; the product tells the full story today.

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
- **Synthetic demo data** (#28) — a "Demo data" panel on the Campaigns page: **Generate** fills a demo year (12 campaigns across all four categories, 28 deliverables, overlapping spans) tagged `campaigns.is_seed`; **Purge** removes only the seed via the campaign delete cascade. Migration `0006_seed_flag.sql` (additive `is_seed` flag + partial index); generation writes campaigns/deliverables only — no `email_jobs`. Idempotent regenerate.
- **Multi-select status filter on the campaigns list** (#30) — the list's Status filter is multi-select, mirroring the campaigns-tab category multi-select (#24): uiStore `campaignStatuses[]` + `toggleCampaignStatus`, a presentational `StatusMultiFilter`, and `useCampaigns` `.in("status", …)` folded into the queryKey; an empty status *or* category set short-circuits to no rows. List-scoped — the deliverable list and table chips stay single-select.
- **Responsive header for mobile** (#32) — the header (`src/routes/__root.tsx`) stacks the brand over the nav below `sm` (`flex-col items-start gap-3`) and restores the single row at `sm`+ (`sm:flex-row sm:items-center sm:justify-between sm:gap-0`), with `flex-wrap` on the nav. Tailwind-only; desktop unchanged at 1280px.

## Built, in review (not yet merged)

### Campaign categories — `enum → table` migration + rewire (CRUD foundation, PR A of 2) — *built, in review*

Moves categories off the fixed `campaign_category` enum onto a managed `categories` table so they can become user-CRUD-able (the management UI is PR B, below). **No user-visible change yet** — the same four categories, now table-backed.

- **Migration `0007_categories.sql`** (schema-altering): `categories` table (`name` non-empty + case-insensitive-unique, `color` hex `check`, RLS authenticated-all + grants, never `anon`), seeded with the four current names + hex colors; `campaigns.category` enum → `category_id uuid references categories(id) on delete restrict`, backfilled by name with a `do $$` assertion before `set not null`; old column/index/enum dropped; `update_campaign_clamp` (0005) recreated with `p_category_id uuid`.
- **Client:** new `src/lib/categories.ts` (`useCategories` / `useCategoryMap` / `useCategoryUsageCounts` + create/update/delete hooks); colors now render from `category.color` (the static `--cat-*` CSS vars are gone); the calendar + list category filters move to a **hidden-set** store model (`uiStore`), `useCampaigns` takes a `categoryFilter: string[] | null` (`null`=all, `[]`=none, keyed off the hidden set so it's correct during load); campaign form/detail use `category_id`; the table denormalizes the category **name** via a nested `campaigns(categories(name))` embed; `demoData` resolves fixture category names → ids at generate time.

Verified: lint/typecheck/build green; local-stack migration applied + schema asserted via `psql`; Playwright regression 10/10 (colors, filters, table filter, category edit persists, demo generate/purge). Moves to Implemented when **both** PRs are merged.

## High priority

### Manage campaign categories (CRUD) — management UI (PR B of 2) — *not built*

PR A (above, in review) lands the table + data layer; the four categories are table-backed but only editable via SQL. PR B adds the user-facing management: a **panel on the Campaigns page** (like `DemoDataPanel`) to **create / rename + recolor / delete** categories — reusing PR A's `useCreateCategory` / `useUpdateCategory` / `useDeleteCategory` / `useCategoryUsageCounts` hooks and `ConfirmDeleteButton`.

- **Settled** (owner, 2026-06-25): delete is **blocked while a category is in use** (FK `ON DELETE RESTRICT`, already in `0007`; the panel disables/​explains via the usage count and the friendly `23503` message); a color `<input type="color">` (hex); keep **≥1 category** so campaign creation always has an option (the form already shows an empty-state when none exist).
- Add a `categoryFormSchema` mirroring the DB checks (non-empty name, hex color); surface the `23505` unique-violation as "A category with that name already exists."

**Acceptance:** creating a category (name + color) makes it available in the campaign form, the calendar/list color-coding, and both category filters; renaming/recoloring is reflected everywhere; deleting an unused category works while deleting one in use is blocked with a clear message; lint/typecheck/build green.

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

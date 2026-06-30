# Marketing Calendar — Feature Status & Backlog

What's built and what's prioritized next, grouped by priority tier. Architecture, data model, and function contracts live in `roadmap.md`; setup and deployment in `structure.md`. This file is the running-state doc — update the tiers as work lands.

## Demo goal

Ship **50–80% of the features well enough to tell 100% of the story**. The story: campaigns spanning weeks break into owned, dated deliverables; the calendar shows the season at a glance with campaign bars and deliverables together; manual email runs through the edge function (the scheduled reminder path is built and ready, parked for now). The product is demoable today.

## How this doc is organized

Three tiers — **Implemented** (live in production), **High priority** (queued to build next), **Low priority** (deferred / parked / stretch) — plus a transient **Built, in review** holding area for code-complete work awaiting merge (it moves up to Implemented on deploy). Items carry their build state. Earlier this file tracked a numbered phase sequence; that history lives in git and the merged PRs.

**Current state (2026-06-25):** the foundation, core UI, calendar, table view, filters, the **synthetic demo-data generator + purge** (#28), the **multi-select status filter on the campaigns list** (#30), and the **responsive (mobile) header** (#32) are all live in production. **User-managed campaign categories (CRUD) is built as two PRs:** PR A — the `enum → categories` table migration + data layer + rewire (#35) — is **merged and live**; PR B — the management panel UI — is **built and in review**. With PR B the **High-priority tier is empty**. The Low-priority tier (templates, parked reminders, stretch UI) is unchanged and none of it blocks the demo; the product tells the full story today. **(2026-06-30)** A **cosmetic brand restyle** (Norcal Crew design system — black/gold canvas, Quicksand + Open Sans, logo, theme toggle) is also **built and in review** — see "Built, in review" below.

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

### Manage campaign categories (CRUD) — management panel (PR B of 2) — *built, in review*

Completes user-managed categories. PR A (#35, **merged & live**) moved categories off the `campaign_category` enum onto a `categories` table + rewired every consumer (no user-visible change). PR B adds the user-facing management: a **`CategoryManagerPanel` on the Campaigns page** (like `DemoDataPanel`) to **create / rename + recolor / delete** categories, reusing PR A's `useCreateCategory` / `useUpdateCategory` / `useDeleteCategory` / `useCategoryUsageCounts` hooks and `ConfirmDeleteButton`. Per-row color `<input type="color">`; a `categoryFormSchema` mirrors the DB checks (non-empty name, hex color); delete is **blocked while in use** (the panel disables it via the usage count, with the friendly `23503` message as backstop), and `23505` surfaces as "name already exists". Client-only, no migration.

Also two follow-ups the dynamic-categories model needs: the campaigns list now treats the category filter as active only when a **current** category is hidden (so a deleted-but-still-hidden id can't leave the list stuck-filtered), and the `/table` name-based category filter **resets to All** when the selected category name no longer exists (rename/delete).

Verified: lint/typecheck/build green; local-stack Playwright 15/15 (create/rename/recolor/delete, delete-in-use disabled, chips + form select reflect changes, both follow-ups). **On merge, the categories feature (PR A + PR B) graduates to Implemented.**

### Brand cosmetic restyle — Norcal Crew design system — *built, in review*

Purely cosmetic rebrand so the app looks like part of norcalcrew.org: **black canvas + single gold accent (`#F0B400`)**, **Quicksand** display + **Open Sans** body, the gold bear logo in the header, and a fixed favicon/title (was `vite-scaffold` + placeholder favicon). Because shadcn here is fully token-driven, the re-skin is a `src/index.css` color-token rewrite (`:root` brand-light + `.dark` black canvas) plus font wiring in `index.html` + the `@theme` block — almost no per-component edits; every page heading adopts Quicksand via one base-layer rule. Adds a **header theme toggle** (default dark, persisted to `localStorage`, applied pre-paint by a try/catch inline boot script so there's no flash) and a `readableTextColor` WCAG-luminance helper so text on category fills (filter chips + calendar campaign/deliverable bars) picks black/white per fill instead of a hard-coded `text-white`. The brand design system ships as **unrouted reference** at `docs/design-system.tsx` (ESLint-ignored, outside `tsconfig`; no route, no nav link). Logo (light-mode "reverse on white" via `brightness-0 dark:brightness-100`) + assets + client only, no migration.

Verified: lint/typecheck/build green; Playwright screenshot matrix across dark/light × desktop (1280px)/mobile (375px) — header (logo + toggle, no overflow), calendar bars, `/table`, and filter-chip contrast. **On merge, graduates to Implemented.**

## High priority

_None right now._

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

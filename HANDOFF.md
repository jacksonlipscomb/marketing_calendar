# Handoff — Marketing Calendar PoC (finish Phase 2: features 4 & 5)

Pick-up document for the agent finishing implementation. Self-contained, but read
`CLAUDE.md`, `roadmap.md`, and `structure.md` first — they are current and authoritative.

## 1. What this project is
A marketing calendar for a youth rowing club (NorCal). The **one claim it exists to
prove**: scheduling an email for a calendar event routes through a **Supabase Edge
Function** that holds the sending secret, validates, persists the `email_jobs` row
with the service role, and records the send result. The browser writes `events`
directly (RLS-governed) but **never writes `email_jobs`** — that asymmetry is the
whole point.

## 2. Where things stand
- **Phase 0** (scaffold, migrations, function): done.
- **Phase 1 vertical slice** (F1 calendar render, F2 event CRUD, F3 schedule-email
  through the function): **done and verified end-to-end on the live project** — a
  real email sends and an `email_jobs` row persists.
- **Phase 2 breadth — remaining work:**
  - F1 category **color-coding**: already done in `CalendarMonth.tsx`.
  - **F4 — filter by category: NOT built.**
  - **F5 — upcoming sends panel: data hook built (`useUpcomingSends`), UI panel NOT built.**

Repo: `github.com/jacksonlipscomb/marketing_calendar`.

## 3. The two features to build

### F4 — CategoryFilter (`src/components/CategoryFilter.tsx`)
- The store already has everything: `useUiStore()` exposes
  `activeCategories: EventCategory[]` (defaults to all four) and
  `toggleCategory(category)`. `CalendarMonth.tsx` **already filters** what it renders
  by `activeCategories` — so you only need the toggle UI; the calendar responds
  automatically.
- Render four toggles for `EVENT_CATEGORIES` (from `src/lib/database.types.ts`). Use
  the category colors already defined as CSS vars in `src/index.css`
  (`--cat-recruiting`, `--cat-retention`, `--cat-regatta`, `--cat-fundraising`) —
  same pattern the calendar chips use (`backgroundColor: var(--cat-${category})`).
  Muted/outlined when inactive.

### F5 — UpcomingSends (`src/components/UpcomingSends.tsx`)
- Consume `useUpcomingSends()` (already in `src/lib/emailJobs.ts`). It returns
  `UpcomingSend[]` = `{ id, subject, recipient, scheduled_for, status, events: { title } | null }`,
  `email_jobs` where `status='scheduled'`, ordered by `scheduled_for` asc. **Read-only.**
- `useScheduleEmail` already invalidates the `["upcoming-sends"]` query key, so the
  panel refreshes after a new schedule.
- Include a header note that these are **queued only and NOT auto-delivered in this
  PoC** (there is no worker — see guardrails). Use the shadcn `Card` for the panel.

### Wire both into `src/routes/index.tsx`
The `CalendarPage` is the composition root — currently renders the hint text,
`CalendarMonth`, `EventDialog`, `ScheduleEmailDialog`. Suggested layout:
`CategoryFilter` above the calendar; a two-column grid with `CalendarMonth` as main
and `UpcomingSends` as a side panel (stack on small screens).

## 4. Stack & conventions to match (already established)
- Vite + React 19 + TS; **Tailwind v4** (no `tailwind.config` — wired via
  `@tailwindcss/vite` + `@import "tailwindcss"` in `index.css`); **shadcn**
  primitives in `src/components/ui/` (button, badge, card, dialog, input, label,
  select, textarea); `@/` path alias → `src/`.
- TanStack **Router** (code-based, `src/router.tsx`) + **Query**; **Zustand**
  (`src/lib/uiStore.ts`); **react-hook-form + Zod v4** (`src/lib/schemas.ts`); **date-fns**.
- Data access lives in `src/lib/events.ts` and `src/lib/emailJobs.ts` (TanStack
  Query hooks over the typed `supabase` client). Follow those patterns; don't query
  Supabase ad hoc in components.
- Auth: anonymous sign-in (`src/lib/auth.ts`), already wired in `main.tsx`.

## 5. Non-negotiable guardrails (do not violate)
- **Never write `email_jobs` from the client.** Reads-only; all writes go through
  `schedule-email` (service role). The missing write policy on `email_jobs` is
  intentional — don't add one. (F5 only reads — fine.)
- **Grants matter (hard-won):** hosted Supabase does NOT auto-grant table
  privileges, and RLS only filters *on top of* grants. Grants are explicit in
  `0002_grants.sql` (`authenticated`) and `0003_grants_service_role.sql`
  (`service_role`). **F4/F5 need no new migration** — they only read
  `events`/`email_jobs` as `authenticated`, already granted. If you ever add access
  for a new role, grant it (never grant `anon`).
- Recipient allowlist is enforced **server-side** (`ALLOWED_RECIPIENT_EMAIL`); the
  client's `VITE_OWNER_EMAIL` is display-only.
- **No scheduler:** future-dated jobs persist as `scheduled` but are never auto-sent.
  F5's copy must not imply delayed delivery works.
- Keep RLS real; no "allow all".

## 6. How to run & verify
- `npm run lint`, `npm run typecheck`, `npm run build` must stay green (CI runs them).
- Local full-stack test: `npx supabase start` (applies migrations 0001–0003,
  including grants, and enables anonymous sign-ins via `config.toml`), create a local
  `.env.local` (gitignored) pointing at the local stack —
  `VITE_SUPABASE_URL=http://127.0.0.1:54321`,
  `VITE_SUPABASE_ANON_KEY=<publishable key from \`npx supabase status\`>`,
  `VITE_OWNER_EMAIL=allowed@example.com` — then `npm run dev`. The local DB already
  has seed data from prior testing (a June-2026 regatta event and a `scheduled`
  "Join NorCal Rowing" job), handy for exercising F5 immediately.
- A headless browser pass (Playwright) is the expected final check: toggle a category
  → events hide/show; confirm the scheduled job appears in the panel.

## 7. Owner/project config (already done — don't redo)
On the live project: anonymous sign-ins enabled; `RESEND_API_KEY` +
`ALLOWED_RECIPIENT_EMAIL` set; migrations 0001–0003 applied; real function deployed;
send verified. The owner's `.env` has `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(publishable), `VITE_OWNER_EMAIL` (all aligned to their Resend account email).

## 8. How the owner wants you to work (from CLAUDE.md)
- **Plan mode first** — produce a plan, wait for approval before editing files.
- Explain every non-trivial block; the owner reviews each one.
- When a choice is yours (not the owner's), say so explicitly.
- F5 is the cut-first feature if time runs short. Both are low-risk.

# Marketing Calendar — Norcal Youth Rowing (PoC)

A marketing calendar for a youth rowing club, organizing events and their emails
around four categories: **recruiting**, **retention**, **regatta**, and
**fundraising**.

**Status: complete and deployed.** Live at
[marketing-calendar-e7w.pages.dev](https://marketing-calendar-e7w.pages.dev).

## What this PoC proves

> Scheduling an email for a calendar event routes through a Supabase Edge
> Function. The function holds the sending secret, validates the request,
> persists the email job, and records the send result.

The browser writes calendar `events` directly (RLS-governed), but it **never
writes `email_jobs`** — it can only read them. All email-job writes happen in
the `schedule-email` edge function using the service role, because the email
provider key must never reach the client. That asymmetry is the entire point;
see `roadmap.md` for the full rationale and data model.

## Features

1. Month calendar with events color-coded by category.
2. Create / edit / delete events (click a day to create, an event to edit).
3. Schedule an email for an event through the edge function. Immediate sends go
   out via Resend (test sender, allowlisted recipient only); future-dated sends
   are persisted as `scheduled` — there is no delivery worker in this PoC, so
   queued jobs are never auto-sent.
4. Filter the calendar by category.
5. Upcoming sends panel: read-only list of `scheduled` jobs, soonest first.

## Stack

Vite + React 19 + TypeScript · TanStack Router (code-based) + Query · Zustand ·
react-hook-form + Zod v4 · Tailwind v4 + shadcn/Radix · date-fns ·
Supabase (Postgres, RLS, anonymous auth, Deno edge function) · Resend ·
Cloudflare Pages.

## Repo guide

| Doc | Contents |
| --- | --- |
| `CLAUDE.md` | Standing rules and non-negotiable invariants for agents working here |
| `roadmap.md` | Purpose, features, data model, RLS/grants, edge function contract |
| `structure.md` | Repo layout, Supabase setup, Cloudflare Pages, CI/CD pipelines |
| `HANDOFF.md` | Historical handoff doc from the Phase 2 build (kept for the record) |

## Local development

Against the live Supabase project:

```sh
npm ci
cp .env.example .env   # fill in your Supabase URL, publishable key, owner email
npm run dev
```

Against a fully local stack (Docker required):

```sh
npx supabase start     # local Postgres + auth + edge runtime, migrations applied
# put the local URL + publishable key from `npx supabase status` in .env.local
echo "ALLOWED_RECIPIENT_EMAIL=allowed@example.com" > supabase/functions/.env
npx supabase functions serve schedule-email --env-file supabase/functions/.env
npm run dev
```

Other commands:

```sh
npm run lint
npm run typecheck
npm run build                                  # tsc + vite build to dist/
npx supabase db push                           # apply migrations to the linked project
npx supabase functions deploy schedule-email   # deploy the edge function
```

## Deployment

Everything deploys from GitHub Actions on push to `main` (`.github/workflows/deploy.yml`):
migrations → edge function → frontend to Cloudflare Pages. CI (`ci.yml`) runs
lint, typecheck, and build on pull requests. Required repo secrets and the
secret-separation table are documented in `structure.md`. Cloudflare's native
Git integration is intentionally **disconnected** — Actions is the single
deploy path.

## Security model (the short version)

- `RESEND_API_KEY` and `ALLOWED_RECIPIENT_EMAIL` live only in Supabase edge
  function secrets. Never in the client bundle, git, or Vault.
- The recipient allowlist is enforced server-side in the function (fail
  closed). The client's `VITE_OWNER_EMAIL` is display-only.
- `email_jobs` has a SELECT-only RLS policy for clients; the missing write
  policy is intentional. Do not add one.
- The client authenticates with anonymous sign-in, which yields the
  `authenticated` role that the RLS policies and table grants target.

# Marketing Calendar — Structure and Deployment (campaign/deliverable rewrite)

Covers repo layout, Supabase setup (including pg_cron and Vault), Cloudflare Pages, and CI/CD. The data model and function contracts live in `roadmap.md`; feature sequencing lives in `features.md`. Vite + React + TypeScript frontend.

## Repo layout

Entries marked with a phase are future state; everything else exists as of Phase 1. PoC files that were replaced (`EventDialog`, `events.ts`) are gone, not left dead.

```
marketing-calendar/
  src/
    components/
      CalendarMonth.tsx        # month view: campaign bars (lane-stacked per week row) +
                               #   deliverables by due date below them, same-date wrapping
      CampaignForm.tsx         # shared create/edit campaign form (page pattern)
      DeliverableForm.tsx      # shared create/edit deliverable form (page pattern)
      OwnersInput.tsx          # tag-style input for owners text[] (never comma-joined)
      CategoryFilter.tsx       # campaign-category toggles (filter bars + chips together)
      Breadcrumbs.tsx          # URL-derived trail (campaign id segment resolved to name)
      ConfirmDeleteButton.tsx  # destructive-action guard for cascade deletes
      RangeFilter.tsx          # day/week/month/quarter/year/all, overlap semantics
      StatusFilter.tsx         # generic status pills (campaign + deliverable lists)
      ScheduleEmailDialog.tsx  # attach + schedule email via schedule-email (mounted in __root)
      UpcomingSends.tsx        # scheduled email_jobs panel (read-only)
      ui/                      # shadcn primitives
    lib/
      supabase.ts              # browser client (anon/publishable key, RLS-governed)
      env.ts                   # validated public env (VITE_OWNER_EMAIL, fail-fast)
      auth.ts                  # ensureSession() — anonymous sign-in
      database.types.ts        # hand-written types mirroring the migrations
      schemas.ts               # Zod schemas + form→payload mappers
      campaigns.ts             # campaign hooks + rangeBounds + overlap queries (list + calendar window)
      deliverables.ts          # deliverable hooks + monthGridRange + derived completionPercent
      templates.ts             # template hooks + create-from-template (Phase 5)
      emailJobs.ts             # useScheduleEmail (invoke fn), useUpcomingSends
      uiStore.ts               # Zustand UI state (month, category + range + status filters, schedule dialog)
      queryClient.ts
      utils.ts
    router.tsx                 # code-based TanStack Router (all routes registered here)
    routes/                    # page pattern: every page is a real URL (deep-linkable)
      __root.tsx               # app shell: nav + URL-derived breadcrumbs + schedule dialog
      index.tsx                # calendar page
      campaigns.index.tsx      # /campaigns — list with range (overlap) + status filters
      campaigns.new.tsx        # /campaigns/new — create form (page, not overlay)
      campaigns.$id.tsx        # /campaigns/:id — deliverables, completion %, edit, delete
      campaigns.$id.deliverables.new.tsx              # /campaigns/:id/deliverables/new
      campaigns.$id.deliverables.$deliverableId.tsx   # …/deliverables/:id — edit + delete
    index.css                  # Tailwind v4 entry (@import "tailwindcss") + theme
  public/
    _redirects                 # SPA fallback: /* /index.html 200
  supabase/
    config.toml                # verify_jwt default true; per-function override for send-reminders
    migrations/
      0001..0003               # PoC migrations (already applied; never edit applied migrations)
      0004_reset_campaigns.sql # DESTRUCTIVE reset: drops PoC tables, creates campaign model + grants
      000N_templates.sql       # Phase 5: templates tables + grants
    functions/
      schedule-email/index.ts  # manual send path (re-pointed to deliverable_id)
      send-reminders/index.ts  # daily reminder path (Phase 4)
  .github/workflows/
    ci.yml                     # pull requests: lint, typecheck, test, build
    deploy.yml                 # push to main: migrations, functions, frontend
  components.json
  .env.example
  package.json
  vite.config.ts
  tsconfig.json
```

Routing note: the page pattern exists so every form and detail view is deep-linkable and the URL path drives breadcrumbs. Overlays remain for quick actions (e.g. scheduling an email); creation/detail flows get real routes.

## Supabase setup

Same project as the PoC; the CLI is a dev dependency (`npx supabase`).

### Migrations

Migrations `0001`–`0003` are the applied PoC schema. The rewrite starts with `0004_reset_campaigns.sql`, which is **destructive**: it drops `email_jobs` (FK holder) then `events` then the old enums, and creates the campaign/deliverable schema (see `roadmap.md`). Because `deploy.yml` runs `supabase db push` on merge to main, **merging that migration drops the PoC tables on the live project** — the PR must say so and the owner approves it knowing that.

Every migration that creates a table includes its grants in the same file (`authenticated` + `service_role`, never `anon`). Hosted projects don't auto-grant; missing grants surface as `permission denied for table ...` before RLS runs.

### Edge functions

Two functions, deployed independently:

```
npx supabase functions deploy schedule-email
npx supabase functions deploy send-reminders --no-verify-jwt
```

`send-reminders` runs with JWT verification off because its caller is Postgres (pg_cron via pg_net), not a user session; the `x-cron-secret` header check replaces the JWT check (contract in `roadmap.md`). Mirror this in `supabase/config.toml` for the local stack:

```toml
[functions.send-reminders]
verify_jwt = false
```

### Function secrets

```
npx supabase secrets set RESEND_API_KEY=...            # provider key (never commit it)
npx supabase secrets set ALLOWED_RECIPIENT_EMAIL=...   # server-side recipient allowlist
npx supabase secrets set CRON_SECRET=...               # verifier half of the cron auth secret
npx supabase secrets set REMINDER_LEAD_DAYS=3          # reminder lead window (optional; default 3)
```

`ALLOWED_RECIPIENT_EMAIL` must equal the Resend account email (the shared test sender only delivers there) and the client's `VITE_OWNER_EMAIL`. The service role key is auto-injected as `SUPABASE_SERVICE_ROLE_KEY`.

### pg_cron + Vault (the scheduled reminder path) — one-time SQL setup

This is dashboard/SQL setup, not pipeline-managed. Run in the SQL editor (or a migration, but the Vault secret value itself must never be committed, so the secret creation is always manual):

```sql
-- 1. Enable extensions (dashboard → Database → Extensions, or:)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Store the caller half of the cron secret in Vault (same value as CRON_SECRET above)
select vault.create_secret('<the-secret-value>', 'cron_secret');

-- 3. Schedule the daily call
select cron.schedule(
  'send-reminders-daily',
  '0 14 * * *',          -- 14:00 UTC daily; pick an hour that suits demos
  $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

Observability: cron run history is in `cron.job_run_details`; the HTTP response (including a 401 from a secret mismatch) is in `net._http_response`; send-level results are in the function logs and `email_jobs`. pg_net does not retry — a failed run is retried structurally the next day because `reminded_at` is only set on success.

### Why two secret homes (the rule, sharpened)

| Secret consumer | Home | Why |
| --- | --- | --- |
| Deno edge function (calls the provider, verifies callers) | **Function secrets** (`Deno.env.get`) | The function runtime is the only thing that needs it. `RESEND_API_KEY`, `ALLOWED_RECIPIENT_EMAIL`, `CRON_SECRET`, `REMINDER_LEAD_DAYS`. |
| Postgres itself (pg_cron SQL calling out via pg_net) | **Vault** (`vault.decrypted_secrets`) | Vault is decrypted inside SQL — this is the case it exists for. Only the caller half of the cron secret. |

The PoC used only the first row. The cron secret is deliberately dual-homed: Vault for the SQL caller, function secrets for the verifier. Rotation: update both back-to-back between daily runs (single-value comparison, no overlap; a run hitting the gap 401s harmlessly and the next run catches up). Never put `RESEND_API_KEY` in Vault — Postgres never calls Resend.

### Dashboard checklist (one-time)

- "Allow anonymous sign-ins" stays enabled (Auth → Sign In / Providers) — without it every RLS-governed query is denied.
- pg_cron + pg_net extensions enabled.
- Vault secret `cron_secret` created; cron job scheduled.

## Cloudflare Pages

Unchanged from the PoC:

- Build command `npm run build`, output `dist`, root directory repo root.
- Build-time env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OWNER_EMAIL` (all public-safe; `VITE_OWNER_EMAIL` is required at build time — `src/lib/env.ts` fails fast).
- `public/_redirects` serves `index.html` for deep links (`/* /index.html 200`) — now load-bearing for the page pattern (`/campaigns/:id` hit directly must not 404).
- Deploy path is **Option A (settled)**: GitHub Actions + Wrangler, project `marketing-calendar`, live at https://marketing-calendar-e7w.pages.dev. The Cloudflare Git integration stays disconnected — running both double-deploys.

## CI/CD pipelines

Two workflows, same shape as the PoC. CI gates merges; deploy runs after merge.

### `.github/workflows/ci.yml` — unchanged

Runs on pull requests: `npm ci`, lint, typecheck, `npm test --if-present`, build.

### `.github/workflows/deploy.yml` — deploys both functions

The `Deploy send-reminders` step landed with Phase 4, alongside the function itself.

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy-supabase:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Link project   # db push requires a linked project; runners start unlinked
        run: supabase link --project-ref "$SUPABASE_PROJECT_REF"
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
      - name: Apply migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      - name: Deploy schedule-email
        run: supabase functions deploy schedule-email --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - name: Deploy send-reminders        # caller is Postgres; header auth replaces JWT
        run: supabase functions deploy send-reminders --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_OWNER_EMAIL: ${{ secrets.VITE_OWNER_EMAIL }}
      - name: Ensure Pages project exists   # pages deploy fails if the project is missing
        run: npx --yes wrangler pages project create marketing-calendar --production-branch=main || echo "Pages project already exists; continuing"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=marketing-calendar
```

Pipeline-managed vs one-time: migrations and both function deploys are pipeline-managed. The cron schedule, the Vault secret, the function secrets, and the dashboard toggles are one-time manual setup (sections above) — the pipeline neither creates nor rotates them.

Caution on `supabase db push` in CI, doubly so now: it applies migrations to the linked project on every push to main, and the reset migration is destructive. Fine for this single-environment project with PR review as the gate; never carry this pattern into a multi-environment project.

## Secret separation

| Secret | Lives in | Used by | Must never be in |
| --- | --- | --- | --- |
| Anon / publishable key | Cloudflare build env, GitHub Actions | Browser client | (public-safe, RLS-governed) |
| `VITE_OWNER_EMAIL` | Cloudflare build env, GitHub Actions | Browser (locks/prefills recipient field) | (public-safe; display only, never a control) |
| Service role key | Supabase function runtime (auto-injected) | Both edge functions | Browser, git, frontend |
| `RESEND_API_KEY` | Supabase function secrets | Both edge functions | Browser, git, frontend, GitHub, **Vault** |
| `ALLOWED_RECIPIENT_EMAIL` | Supabase function secrets | Both functions (recipient allowlist) | (not secret, but it's the authoritative guard — keep it server-side) |
| `CRON_SECRET` (verifier half) | Supabase function secrets | `send-reminders` (caller auth) | Browser, git, frontend |
| `cron_secret` (caller half, same value) | **Vault** | pg_cron SQL via pg_net | Browser, git, frontend, function secrets table confusion — see "Why two secret homes" |
| `REMINDER_LEAD_DAYS` | Supabase function secrets | `send-reminders` | (config, not secret; kept with the function) |
| `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` / `CLOUDFLARE_API_TOKEN` | GitHub Actions secrets | Deploy jobs | Runtime, frontend |

The rule that drives the table is unchanged: the email provider key reaches only the edge functions — never the browser, the repo, GitHub, or Vault. The one new rule: a secret that Postgres itself must read lives in Vault; everything the Deno runtime reads lives in function secrets.

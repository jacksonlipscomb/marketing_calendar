# Marketing Calendar — Structure and Deployment (campaign/deliverable rewrite)

Covers repo layout, Supabase setup (including pg_cron and Vault), Cloudflare Pages, and CI/CD. The data model and function contracts live in `roadmap.md`; feature status and backlog live in `features.md`. Vite + React + TypeScript frontend.

## Repo layout

Entries marked *planned* or *parked* aren't on `main` yet; everything else is live. PoC files that were replaced (`EventDialog`, `events.ts`) are gone, not left dead.

```
marketing-calendar/
  src/
    components/
      CalendarMonth.tsx        # month view: campaign bars (lane-stacked per week row) +
                               #   deliverable span bars in a thinner band below them;
                               #   campaign bars open the campaign, deliverable bars deep-link
                               #   to the deliverable view (with an inline schedule-email action)
      CampaignForm.tsx         # shared create/edit campaign form (page pattern)
      DeliverableForm.tsx      # shared create/edit deliverable form (page pattern)
      OwnersInput.tsx          # tag-style input for owners text[] (never comma-joined)
      CategoryFilter.tsx       # presentational category toggles, reused by the calendar
                               #   (activeCategories) and the campaigns list (campaignCategories)
      Breadcrumbs.tsx          # URL-derived trail (campaign id segment resolved to name)
      ConfirmDeleteButton.tsx  # destructive-action guard for cascade deletes
      DemoDataPanel.tsx        # Campaigns-page panel: generate a demo year / purge it (is_seed)
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
      campaigns.ts             # campaign hooks + rangeBounds + overlap queries (list w/ range+status+category, calendar window)
      deliverables.ts          # deliverable hooks (incl. flat useDeliverablesTable) + monthGridRange + completionPercent
      csv.ts                   # dependency-free CSV builder + download (the table view's export)
      demoData.ts              # synthetic demo-data fixtures + buildDemoData + generate/purge hooks (is_seed)
      templates.ts             # template hooks + create-from-template (planned — low priority)
      emailJobs.ts             # useScheduleEmail (invoke fn), useUpcomingSends
      uiStore.ts               # Zustand UI state (month, calendar + campaign-list category/range/status filters, schedule dialog)
      queryClient.ts
      utils.ts
    router.tsx                 # code-based TanStack Router (all routes registered here)
    routes/                    # page pattern: every page is a real URL (deep-linkable)
      __root.tsx               # app shell: nav + URL-derived breadcrumbs + schedule dialog
      index.tsx                # calendar page
      campaigns.index.tsx      # /campaigns — list with range (overlap) + status + category filters
      campaigns.new.tsx        # /campaigns/new — create form (page, not overlay)
      campaigns.$id.tsx        # /campaigns/:id — deliverables, completion %, edit, delete
      campaigns.$id.deliverables.new.tsx              # /campaigns/:id/deliverables/new
      campaigns.$id.deliverables.$deliverableId.tsx   # …/deliverables/:id — edit + delete
      table.tsx                # /table — flat row-per-deliverable grid (TanStack Table): sort/filter/CSV
    index.css                  # Tailwind v4 entry (@import "tailwindcss") + theme
  public/
    _redirects                 # SPA fallback: /* /index.html 200
  supabase/
    config.toml                # verify_jwt default true; send-reminders override is parked (PR #11)
    migrations/
      0001..0003               # PoC migrations (already applied; never edit applied migrations)
      0004_reset_campaigns.sql # DESTRUCTIVE reset: drops PoC tables, creates campaign model + grants
      0005_deliverable_dates.sql # deliverable start/end spans (drops due_date) + bound triggers + clamp RPC
      0006_seed_flag.sql       # additive is_seed flag on campaigns (demo-data marker) + partial index
      000N_templates.sql       # templates tables + grants (planned — low priority)
    functions/
      schedule-email/index.ts  # manual send path (re-pointed to deliverable_id)
      send-reminders/index.ts  # daily reminder path — PARKED, PR #11 only (not on main)
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

> **`send-reminders` is parked — PR #11 only, not on `main`.** Its function file, `config.toml` block, and `deploy.yml` step are not merged and not deployed (see [docs/archive/phase4-reminders.md](docs/archive/phase4-reminders.md)). Everything about it below — the deploy command, the `verify_jwt` block, the cron/Vault setup — is the intended setup for when it un-parks, not the current state. Only `schedule-email` is live.

Two functions, deployed independently (`send-reminders` parked — see above):

```
npx supabase functions deploy schedule-email
npx supabase functions deploy send-reminders --no-verify-jwt   # parked (PR #11)
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

> **Not yet performed — the reminder path is parked** (see [docs/archive/phase4-reminders.md](docs/archive/phase4-reminders.md)). The steps below are the activation procedure for when it un-parks; none of it is set up in production today.

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

### `.github/workflows/ci.yml`

Runs on pull requests: `npm ci`, lint, typecheck, `npm test --if-present`, build. Same steps as the PoC; its runner actions were bumped to Node 24 with the rest (PR #17). It does **not** use `supabase/setup-cli` — only `deploy.yml` does.

### `.github/workflows/deploy.yml` — deploys the live function (+ a parked step)

This is the **target state**. On `main` the deploy job only deploys `schedule-email`. The `Deploy send-reminders` step shown below lands with PR #11 (parked) alongside the function itself — it must not be added to CI before the function file exists, or every merge to main fails deploying a directory that isn't there.

Two recent updates shown above are **already on `main`**: the runner actions were bumped to Node 24 (PR #17 — `checkout@v6`, `setup-node@v6`, `setup-cli@v2`, `wrangler-action@v4`), and PR #21 **pinned the Supabase CLI** (`version: 2.105.0`, not `latest`) and added `needs: deploy-supabase` to `deploy-frontend`. The pin avoids a flaky latest-release lookup that 504'd once; the gate stops the frontend shipping when the DB job fails. The one thing above that is *not* on `main` is the parked `Deploy send-reminders` step (PR #11).

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy-supabase:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: supabase/setup-cli@v2
        with:
          version: 2.105.0   # pinned (PR #21): `latest` resolves the newest release over the network and 504'd once
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
      - name: Deploy send-reminders        # parked — lands with PR #11, not on main
        run: supabase functions deploy send-reminders --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-frontend:
    needs: deploy-supabase   # PR #21: gate on the DB job so a frontend never ships against an un-migrated schema
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 20    # the build runtime — separate from the runner actions (Node 24); left as-is
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
      - uses: cloudflare/wrangler-action@v4
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

> Parked-state note: the rows that name `send-reminders` (`CRON_SECRET`, `cron_secret`, `REMINDER_LEAD_DAYS`) and the "both functions" entries describe the reminder path, which is **parked — not set in production yet** (see Edge functions, above). Today only `schedule-email` consumes these. `cron_secret` in particular is not created until activation.

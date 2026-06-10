# Marketing Calendar PoC — Structure and Deployment

Covers repo layout, Supabase setup, Cloudflare Pages, and CI/CD. The data model and feature plan live in `roadmap.md`. Assumes a Vite + React + TypeScript frontend.

## Repo layout

```
marketing-calendar/
  src/                       # React app
    components/
      CalendarMonth.tsx      # month grid (date-fns), category color chips (feat 1)
      EventDialog.tsx        # create/edit/delete event (feat 2)
      ScheduleEmailDialog.tsx# attach + schedule email via the function (feat 3)
      CategoryFilter.tsx     # filter by category (feat 4)
      UpcomingSends.tsx      # scheduled email_jobs panel (feat 5, read-only)
      ui/                    # shadcn primitives (button, dialog, select, ...)
    lib/
      supabase.ts            # browser client (anon/publishable key, RLS-governed)
      env.ts                 # validated public env (VITE_OWNER_EMAIL, fail-fast)
      auth.ts                # ensureSession() — anonymous sign-in
      database.types.ts      # hand-written types mirroring the migrations
      schemas.ts             # Zod schemas (event form, schedule-email request)
      events.ts              # TanStack Query hooks for events
      emailJobs.ts           # useScheduleEmail (invoke fn), useUpcomingSends
      uiStore.ts             # Zustand UI state (month, filter, dialogs)
      queryClient.ts         # TanStack Query client
      utils.ts               # cn() helper for shadcn
    router.tsx               # code-based TanStack Router
    routes/
      __root.tsx             # app shell
      index.tsx              # calendar page composing the features
    index.css                # Tailwind v4 entry (@import "tailwindcss") + theme
  public/
    _redirects               # SPA fallback for client-side routing (see Cloudflare section)
  supabase/
    config.toml              # verify_jwt=true, anonymous sign-ins enabled
    migrations/
      0001_init.sql          # enums, tables, indexes, RLS
      0002_grants.sql        # table grants -> authenticated
      0003_grants_service_role.sql  # table grants -> service_role
    functions/
      schedule-email/
        index.ts             # the edge function (npm: imports, no deno.json)
  .github/
    workflows/
      ci.yml                 # runs on pull requests
      deploy.yml             # runs on push to main
  components.json            # shadcn config (Tailwind v4, new-york)
  .env.example
  package.json
  vite.config.ts             # react + @tailwindcss/vite + @ alias
  tsconfig.json
```

## Supabase setup

The CLI is a dev dependency, so all local commands use `npx supabase`.

1. Create a Supabase project. Note the project ref, the URL, and the anon/publishable key.
2. **Enable "Allow anonymous sign-ins"** (dashboard → Auth → Sign In / Providers). The client signs in anonymously to satisfy RLS `to authenticated`; without it every query is denied.
3. Migrations live in `supabase/migrations/` — `0001_init.sql` (schema + RLS), `0002_grants.sql` (grants to `authenticated`), `0003_grants_service_role.sql` (grants to `service_role`). Apply all with `npx supabase db push` against the linked project. The grants are **required**: hosted projects don't auto-grant table privileges for migration-created tables, and RLS only filters on top of grants (missing grants → `permission denied for table ...`). See roadmap.md → Data model → Grants.
4. Edge function lives at `supabase/functions/schedule-email/index.ts`. Deploy with `npx supabase functions deploy schedule-email`.
5. Set the edge function secrets (not in Vault):
   ```
   npx supabase secrets set RESEND_API_KEY=...
   npx supabase secrets set ALLOWED_RECIPIENT_EMAIL=...   # the recipient allowlist
   ```
   The function reads them via `Deno.env.get`. The service role key is auto-injected as `SUPABASE_SERVICE_ROLE_KEY`, so it is never stored anywhere by you. `ALLOWED_RECIPIENT_EMAIL` must equal your Resend account email (the shared test sender only delivers to that address) and the client's `VITE_OWNER_EMAIL`.

### Why function secrets and not Vault

Vault is Postgres-side, decrypted inside SQL, and is the right tool when the database itself needs a secret (a `pg_cron` job or a trigger calling out through `pg_net`). This PoC sends from the Deno edge function, which calls the provider directly, so the key belongs in edge function secrets and is read from the Deno environment. Using Vault here would add a layer the architecture does not use.

## Cloudflare Pages

The frontend is a static build deployed to Cloudflare Pages.

Build settings:
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repo root
- Build-time environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OWNER_EMAIL` (all public-safe). `VITE_OWNER_EMAIL` is required at build time — the app fails fast if it is missing (see `src/lib/env.ts`).

Client-side routing fallback. TanStack Router handles routes in the browser, so a direct hit to a deep link must serve `index.html` rather than 404. Add `public/_redirects`:

```
/*    /index.html   200
```

Pick one deploy path for the frontend, do not run both or you will double-deploy:
- Option A (used below): deploy from GitHub Actions with Wrangler. All deploy logic stays in one pipeline.
- Option B: Cloudflare's native Git integration. Point Pages at the repo, set the build settings and env vars in the Cloudflare dashboard, and remove the frontend job from `deploy.yml`. Simpler, fewer GitHub secrets, but the deploy story is split across two systems.

## CI/CD pipelines

Two workflows. CI gates merges, deploy runs after merge. Edge functions deploy to Supabase, frontend deploys to Cloudflare. These are two separate targets and cannot share one deploy step.

### Branch protection

Protect `main`: require a pull request, require `ci.yml` to pass, disallow direct pushes. Free-tier rulesets require a public repo.

### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [main]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test --if-present
      - run: npm run build
```

### `.github/workflows/deploy.yml`

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
      - name: Apply migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
      - name: Deploy edge function
        run: supabase functions deploy schedule-email --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
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
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=marketing-calendar
```

Caution on `supabase db push` in CI: it applies migrations to the linked project on every push to main. Fine for a single-environment PoC. In a real project you would gate this behind environment approvals and never point it at a production database without review. If you would rather keep it manual for the PoC, drop the "Apply migrations" step and run `supabase db push` from your machine.

## Secret separation

| Secret | Lives in | Used by | Must never be in |
| --- | --- | --- | --- |
| Anon / publishable key | Cloudflare build env, GitHub Actions | Browser client | (public-safe, RLS-governed) |
| `VITE_OWNER_EMAIL` | Cloudflare build env, GitHub Actions | Browser (locks/prefills recipient field) | (public-safe; display only, not a control) |
| Service role key | Supabase function runtime (auto-injected) | Edge function | Browser, git, frontend |
| `RESEND_API_KEY` | Supabase function secrets | Edge function | Browser, git, frontend, GitHub |
| `ALLOWED_RECIPIENT_EMAIL` | Supabase function secrets | Edge function (recipient allowlist) | (not secret, but kept with the function) |
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions secret | Deploy job | Runtime, frontend |
| `SUPABASE_DB_PASSWORD` | GitHub Actions secret | Deploy job (migrations) | Runtime, frontend |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions secret | Deploy job | Runtime, frontend |

The single rule that drives the whole table: the email provider key reaches only the edge function. It never touches the browser, the repo, or GitHub. That constraint is the reason the edge function exists. (`ALLOWED_RECIPIENT_EMAIL` isn't itself secret, but it's the authoritative recipient guard, so it lives in the function — never trust the client's `VITE_OWNER_EMAIL` for that.)

> Note: `deploy.yml` passes `VITE_OWNER_EMAIL` to the frontend build (see below), so when you wire up CI deploys remember to add `VITE_OWNER_EMAIL` as a GitHub repo secret alongside the others — otherwise the build bakes in an empty value and the deployed app fails fast at runtime (`src/lib/env.ts`).

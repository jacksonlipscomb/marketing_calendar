# Marketing Calendar PoC — Structure and Deployment

Covers repo layout, Supabase setup, Cloudflare Pages, and CI/CD. The data model and feature plan live in `roadmap.md`. Assumes a Vite + React + TypeScript frontend.

## Repo layout

```
marketing-calendar/
  src/                       # React app
    components/
    lib/
      supabase.ts            # browser client (anon key, RLS-governed)
    routes/                  # TanStack Router routes
  public/
    _redirects               # SPA fallback for client-side routing (see Cloudflare section)
  supabase/
    config.toml
    migrations/
      0001_init.sql          # enums, tables, indexes, RLS from roadmap.md
    functions/
      schedule-email/
        index.ts             # the edge function
  .github/
    workflows/
      ci.yml                 # runs on pull requests
      deploy.yml             # runs on push to main
  .env.example
  package.json
  vite.config.ts
  tsconfig.json
```

## Supabase setup

1. Create a Supabase project. Note the project ref, the URL, and the anon key.
2. Put the schema from `roadmap.md` into `supabase/migrations/0001_init.sql`. Apply with `supabase db push` against the linked project.
3. Edge function lives at `supabase/functions/schedule-email/index.ts`. Deploy with `supabase functions deploy schedule-email`.
4. Set the email provider key as an edge function secret, not in Vault:
   ```
   supabase secrets set RESEND_API_KEY=...
   ```
   The function reads it via `Deno.env.get('RESEND_API_KEY')`. The service role key is auto-injected as `SUPABASE_SERVICE_ROLE_KEY`, so it is never stored anywhere by you.

### Why function secrets and not Vault

Vault is Postgres-side, decrypted inside SQL, and is the right tool when the database itself needs a secret (a `pg_cron` job or a trigger calling out through `pg_net`). This PoC sends from the Deno edge function, which calls the provider directly, so the key belongs in edge function secrets and is read from the Deno environment. Using Vault here would add a layer the architecture does not use.

## Cloudflare Pages

The frontend is a static build deployed to Cloudflare Pages.

Build settings:
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repo root
- Build-time environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (both public-safe)

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
| Anon key | Cloudflare build env, GitHub Actions | Browser client | (public-safe, RLS-governed) |
| Service role key | Supabase function runtime (auto-injected) | Edge function | Browser, git, frontend |
| `RESEND_API_KEY` | Supabase function secrets | Edge function | Browser, git, frontend, GitHub |
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions secret | Deploy job | Runtime, frontend |
| `SUPABASE_DB_PASSWORD` | GitHub Actions secret | Deploy job (migrations) | Runtime, frontend |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions secret | Deploy job | Runtime, frontend |

The single rule that drives the whole table: the email provider key reaches only the edge function. It never touches the browser, the repo, or GitHub. That constraint is the reason the edge function exists.

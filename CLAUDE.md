# CLAUDE.md

Project instructions for Claude Code. This file is the standing rule set. It does not restate the plan. For detail, read the reference docs below and do not duplicate them back into this file.

## Reference docs

- `roadmap.md`: purpose, the five features, the data model (enums, tables, RLS, indexes), the edge function contract, and build order.
- `structure.md`: repo layout, Supabase setup, Cloudflare Pages, and CI/CD pipelines.

Read both before planning any task. If something here conflicts with them, stop and flag it instead of guessing.

## Non-negotiable invariants

These define whether the PoC succeeds. Do not violate them for convenience or speed.

1. All writes to `email_jobs` (insert and every status change) go through the `schedule-email` edge function using the service role. The client never writes to `email_jobs`. It reads only.
2. The edge function is the point of the project, not plumbing to route around. If a task seems easier by writing email rows from the client, that is the failure this PoC exists to prevent.
3. RLS stays real. The missing insert/update/delete policy on `email_jobs` is intentional. Do not add one, and do not use "allow all" to unblock yourself.
4. `RESEND_API_KEY` lives only in Supabase Edge Function secrets, read via `Deno.env.get`. Never in Vault, never in the client bundle, never committed to git.

## Working agreement

- Work in plan mode. Produce a plan and wait for approval before creating or editing files.
- Explain every non-trivial block of code you write. The owner reviews each one.
- When a design or implementation choice came from you rather than the owner, say so plainly in your summary. Do not present your decisions as the owner's.
- Build the Phase 1 vertical slice (event create, calendar render, email through the function) before any Phase 2 breadth feature. An early stop should still leave a working PoC.

## Stack

- Frontend: Vite, React, TypeScript.
- Routing and server state: TanStack Router, TanStack Query.
- Client state: Zustand.
- UI: shadcn over Radix, Tailwind.
- Forms and validation: react-hook-form with Zod. Validate edge function input with Zod too, not just the client.
- Supabase client: `src/lib/supabase.ts`, anon key, RLS-governed.

## Commands

```
npm run dev          # local frontend
npm run build        # production build to dist/
npm run lint
npm run typecheck
npm test             # if present

npx supabase db push                          # apply migrations
npx supabase functions serve schedule-email   # run the function locally
npx supabase functions deploy schedule-email  # deploy the function
npx supabase secrets set RESEND_API_KEY=...    # set the provider key (never commit it)
```

## Traps to avoid

- Writing `email_jobs` from the client. See invariant 1.
- Adding a write policy on `email_jobs` to get past an RLS denial. See invariant 3.
- Putting the provider key in Vault, the frontend, or git. See invariant 4.
- Enabling both Cloudflare's Git integration and the Actions frontend deploy. Pick one or you double-deploy. See `structure.md`.
- Treating `supabase db push` in CI as a normal pattern. It is PoC-only here because there is one environment. Do not carry it into a real multi-environment project.
- Reporting that email sending works when the send is stubbed. State exactly what is real.

## Open decision

Real send or stubbed send is recorded in `roadmap.md` under "Open decision." If that line is still blank, do not build the send path. Ask the owner to settle it first.

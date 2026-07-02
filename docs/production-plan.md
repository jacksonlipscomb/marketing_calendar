# NorcalOS — Production Plan

> **Status:** draft for owner review · **Last updated:** 2026-07-01
> **Audience:** internal planning (owner + agents). Not a stakeholder-facing deliverable.
> **Companion:** [production-spec.md](production-spec.md) — what production is, the budget constraint, the CRM bake-off criteria, the Supabase/CRM boundary, and the open questions (O1–O8) this plan references.
> This plan contains **no timelines or estimates — deliberately**. It defines what "production ready" means (§2) and orders the work by dependency (§3–§4). The working agreement in [CLAUDE.md](../CLAUDE.md) still governs all work this plan schedules: plan-mode first, owner merges, destructive-migration callouts in plain words.

## 1. How to read this plan

Three tracks:

- **Track A — platform hardening.** Everything production needs that does **not** depend on the CRM choice: an immediate containment step for the live prototype's public-write exposure (A0), then auth review, RLS audit, environments, data migration, email baseline, observability. **All of Track A proceeds in parallel with the bake-off.** Nothing in A waits on B or C.
- **Track B — the CRM bake-off** (spec §5). Runs alongside Track A.
- **Track C — CRM integration.** Blocked on B's decision memo; consumes spec open questions O1–O8.

§2 defines done as **two named gates** — "calendar cutover ready" and "NorcalOS production program complete" — so the app cutover and CRM completion never blur into one milestone. §3 details the workstreams. §4 is the dependency summary. §5 lists prerequisites and risks observed in the current codebase. §6 collects the decisions only the owner can make (D0–D9).

## 2. Definition of done — two named gates

Readiness has two named gates, so execution never confuses them (see D5):

- **Gate 1 — "Calendar cutover ready":** every group below **except CRM integration** is complete. This is what the app cutover waits on.
- **Gate 2 — "NorcalOS production program complete":** Gate 1 **plus** the CRM integration group. This is the full production scope of the spec (§1).

Each item is a yes/no check, not a vibe.

**Identity & access**
- [ ] Anonymous sign-in is disabled in production; every session belongs to a named account (mechanism per A1/D1).
- [ ] A role model is documented, and every table's RLS policy is derived from it and reviewed table-by-table (A2).
- [ ] The `email_jobs` write hole is intact: no client insert/update/delete policy; writes only via the edge functions with the service role (spec §7, invariants 1–3).
- [ ] Grants verified in production: `authenticated` + `service_role` only; the `anon` role holds nothing (see R8).

**Environments & pipeline**
- [ ] Staging and production are separate Supabase projects with separate frontend deploy targets; the local CLI stack stays for dev.
- [ ] Secrets are provisioned per environment (function secrets; Vault where Postgres is the caller; GitHub environment secrets) — the two-homes rule holds in each.
- [ ] Merging to `main` no longer applies migrations directly to production: staging deploys automatically; production deploys behind an explicit approval gate.
- [ ] At least one schema migration has been exercised end-to-end through the staging → production flow.

**Data**
- [ ] Demo/seed data purged (`is_seed` cascade) and the demo-data generator is not exposed in production builds.
- [ ] Prototype data carried over or explicitly reset (owner decision D3), with verification (row counts + spot checks).
- [ ] Backups are enabled for the production database and **one restore has been rehearsed**.

**Email**
- [ ] A verified sending domain (SPF/DKIM/DMARC passing) replaces the shared test sender `onboarding@resend.dev`.
- [ ] Recipient policy v1 is live: delivery to validated internal (staff/owner) addresses — still enforced server-side in the edge functions, still fail-closed. Audience delivery to CRM segments is Track C, not a v1 gate.
- [ ] Reminders decision (D4) executed: either the path is live — with a **real cron firing observed in production** (a manual invocation is not proof — house rule) — or reminders are explicitly declared out of v1.

**Observability & operations**
- [ ] Failed sends are visible without going looking: alerting or a routine report on `email_jobs.status = 'failed'` (plus cron 401s in `net._http_response` once reminders are live).
- [ ] Frontend error tracking is in place, or the decision not to have it is recorded (D6).
- [ ] A runbook exists: deploy, rollback, secret rotation, backup restore, and a smoke checklist that is run against staging before each production deploy.

**CRM integration** (Gate 2 only — per D5's recommendation this group does not gate the app cutover)
- [ ] Bake-off complete: per-candidate evidence sheets and a decision memo; C1 verified hands-on on a deployed instance of the winner.
- [ ] Winner deployed on club-controlled hosting with backups; **zero recurring license spend confirmed against the license text**, snapshot kept (spec §2–§3).
- [ ] The spec §6 boundary is implemented: CRM authoritative for people/segments/consent; Supabase mirror client-unwritable, with role-scoped, data-minimized reads (spec §6); sync server-side only.
- [ ] End-to-end demonstration: a contact edited in the CRM → mirror updates → a campaign targets a segment → a send respects consent and the server-side recipient policy.
- [ ] Sync health is observable and the sync is safe to re-run: last-successful-sync visibility, alerting on failed webhook/poll attempts, stale-mirror detection against an agreed freshness bound, idempotent upserts, and a documented replay/backfill path (the mirror is rebuildable from scratch, CRM as source of truth).
- [ ] No second send path: NorcalOS email routes only through the edge functions; the O6 policy on the CRM's native email modules is resolved and applied.

**Cutover**
- [ ] Production URL live (custom domain per D7); prototype project retired or repurposed per D2.
- [ ] Reference docs re-pointed: CLAUDE.md's reference list includes the production docs; structure.md's environment/pipeline sections describe the production setup (docs debt, tracked here so it isn't forgotten).

## 3. Workstreams, ordered by dependency

### Track A — platform hardening (all parallel with the bake-off)

**A0. Exposure containment (interim)** — *the plan's first action; it depends on nothing and nothing depends on it.*
The live prototype is publicly writable today (R1); the real fix is the A1 auth swap, but planning shouldn't leave the window open meanwhile. Apply an explicit containment per D0 — the recommended pair: **Cloudflare Access in front of the Pages site** (gates casual discovery; the Zero Trust free tier covers a team this size) **plus rotation of the Supabase publishable/anon key** (update the GitHub Actions secret `VITE_SUPABASE_ANON_KEY` and any local `.env`, then redeploy). Rotation means the old key is *dead*, not merely replaced: Supabase's key migration keeps legacy anon keys working alongside new `sb_publishable_...` keys until the legacy keys are explicitly deactivated, so creating a new key alone can be a silent no-op. **A0's acceptance check: the previously shipped key returns 401 against PostgREST and Auth after rotation/deactivation** — the containment isn't real until that check passes. Stated honestly: Access gates the *site*, not the Supabase API — with anonymous sign-in still enabled, the API stays exactly as private as the current key. That is why the rotation accompanies the gate, and why A0 is containment, not closure. Hiding the demo-data panel alone would be cosmetic (the API accepts the same writes directly) — fine to include, not sufficient. A0 is throwaway by design: it retires at cutover when anonymous sign-in is disabled.

**A1. Auth review & role model** — *start immediately; most of Track A hangs off it.*
Decide the sign-in mechanism (Supabase Auth: OAuth against the club's IdP, magic links, or both — D1) and define the role model (likely tiny: admin + staff). Replace the `ensureSession()` anonymous path in `src/lib/auth.ts`; the code swap and the "Allow anonymous sign-ins" dashboard flip land together, staging first. **Side output:** the concrete "required auth features" list that fixes bake-off criterion C1 (spec §5) — B's deployments don't wait for it, but scoring can't close without it. O1 (shared IdP with the CRM) refines this later; it does not block the app-side work.

**A2. RLS & grants audit** — *after A1's role model exists.*
Re-derive per-table policies from the role model (campaigns, deliverables, categories, and every new table), replacing the prototype's single-unit `using (true)` posture. Keep the `email_jobs` write hole exactly as is; pre-agree the mirror-table shape for Track C (client-unwritable; reads role-scoped and data-minimized per spec §6 — the mirror carries third-party PII). Audit grants, including the `anon` default-privileges check (R8). Verify by exercising each role against staging.

**A3. Environments & pipeline** — *start immediately; no dependencies.*
Stand up separate staging and production Supabase projects (topology per D2) and per-environment secrets. Re-shape the pipeline: PR CI unchanged → merge to `main` auto-deploys **staging** → production deploys behind a GitHub environment approval gate. This retires the pattern [structure.md](../structure.md) itself warns about — `db push` on merge straight to the single live project ("never carry this pattern into a multi-environment project"; production is that project). Split Pages targets (preview vs production) and wire the custom domain (D7). Replaying migrations `0001`–`0007` onto the fresh projects doubles as the proof the chain stands alone.

**A4. Data migration** — *after A3 (needs a target); shape per D3.*
Purge `is_seed` data in the source first, then move the carry set (D3: recommendation is carry campaigns/deliverables/categories **and** the `email_jobs` audit trail). Verify with row counts and spot checks. Gate `DemoDataPanel` out of production builds. `owners` stays `text[]` here — the identity upgrade is Track C (O3), not a migration-time rewrite.

**A5. Email production baseline** — *domain work is independent; the recipient-policy half needs A1.*
Verify a sending domain (SPF/DKIM/DMARC) and retire `onboarding@resend.dev`, which only ever delivered to the account owner. Generalize the allowlist to recipient policy v1: validated internal addresses (from A1's accounts), enforced in the edge functions, fail-closed — the enforcement point never moves. Review provider quota against expected volume (provider spend is outside the spec §2 CRM constraint, but it's still club money). Execute D4 on reminders; if "in": follow the activation checklist in [archive/phase4-reminders.md](archive/phase4-reminders.md) — rebase PR #11, **re-point the selection from the dropped `due_date` column to `end_date`** (R3), deploy with `--no-verify-jwt` + the `config.toml` block, set `CRON_SECRET` + Vault `cron_secret`, enable pg_cron/pg_net, schedule the job — then observe a real cron firing on staging and again in production.

**A6. Observability & operations** — *after A3's environments exist.*
Failed-send visibility (query/alert on `email_jobs.status = 'failed'`; cron visibility via `cron.job_run_details` + `net._http_response` once reminders run). Frontend error tracking per D6 (zero/low-cost bias). An uptime probe. The runbook (deploy, rollback, secret rotation per structure.md, backup restore). Formalize the ad-hoc Playwright verification runs this repo already uses into a repeatable staging smoke pack (D8). Backups enabled and one restore rehearsed. Track C extends this posture to sync health — the concrete requirements live in C2.

**A7. Task management + CMS** — *product workstreams, not platform ones.*
Built directly on Supabase per the spec §6 boundary; they depend on A1/A2's role model and policy patterns and on **nothing in Tracks B/C**. Each gets its own feature spec before build (house process). Whether they gate the production cutover is D5b — this plan's recommendation is no: they land as features on the hardened platform.

### Track B — CRM bake-off (parallel with all of Track A)

**B1.** Turn spec §5 into a per-candidate worksheet. C1's "required auth features" list arrives from A1 before scoring closes; candidate deployments start without it.
**B2.** Per candidate (Atomic CRM, Corteza, erxes — alphabetical, no implied order): deploy on a throwaway host → verify C1 **hands-on against the deployed instance and the license text**, snapshot both (the Twenty rule, spec §3) → exercise the API far enough to prove or disprove the spec §6 sync story → complete the evidence sheet → tear down.
**B3.** Decision memo: names the winner, records the evidence, and resolves the scaffolding for O1–O8. Owner signs off. **This memo is the single unblocking event for Track C.**

### Track C — CRM integration (blocked on B3; also needs A1 and A3)

**C1. Production CRM deploy.** Winner on club-controlled hosting with backups, auth wired per O1. **Re-verify C1 on the production instance and snapshot the license again** — licenses drift between bake-off and deploy (R9).
**C2. Contact mirror + sync** per O2/O3: mirror tables in an additive migration with grants — client-unwritable like `email_jobs`, reads role-scoped and data-minimized per spec §6 — and a server-side sync job. Reliability and observability requirements hold regardless of what transport O2 picks: **idempotent upserts** (safe to re-run, keyed on CRM contact id), **failure visibility** (every failed webhook/poll attempt logged and alertable, same posture as failed sends), **lag/staleness detection** (last-success timestamp plus an agreed freshness bound the mirror must not exceed silently), and a **documented replay/backfill path** (full resync from the CRM as source of truth — the mirror must be rebuildable from scratch). This is where automated test depth starts paying (D8).
**C3. Audience delivery** per O4/O5: campaigns reference CRM segments (successor to free-text `segmentation`); recipient policy v2 — CRM-sourced, consent-gated lists — at the same enforcement point, still fail-closed. Apply the O6 policy so there is exactly one send path.
**C4. Identity upgrade** per O3: `owners` display names become addressable identities — the upgrade path [roadmap.md](../roadmap.md) explicitly deferred to production.

### Cutover (converges Track A; includes Track C per D5)

In order: staging soak with the smoke pack → final data sync (D3) → auth flip (anonymous sign-ins off in production) → DNS/custom domain (D7) → smoke pack against production → prototype project disposition (D2) → docs re-pointed (§2 checklist). The public, writable prototype URL (R1) stops being reachable-as-writable at the auth flip; that's the step that closes today's exposure for real — and where A0's interim containment retires.

## 4. Dependencies at a glance

- **Start immediately, in parallel:** A0 (containment — the first action taken), A1, A3, B (candidate deployments). A0 depends on nothing and retires at cutover.
- A2 ← A1 (role model). A4 ← A3 (+D3). A5 recipient-policy half ← A1; domain half independent. A6 ← A3. A7 ← A1/A2 (patterns only).
- B scoring close ← A1 (C1 feature list). **C (all of it) ← B3 decision memo**, plus A1 (IdP) and A3 (environments).
- Cutover ← A1–A6 complete; includes C per D5.
- The user-named parallel set maps cleanly: auth review = A1, RLS audit = A2, environments = A3, data migration = A4, monitoring = A6 — **none is blocked by the CRM decision.**

## 5. Prerequisites and risks observed in the current codebase

Ordered roughly by severity; each ends with where the plan addresses it.

- **R1 — The live prototype is publicly writable.** Anonymous sign-in + allow-all RLS + a public URL means anyone who finds it can create/edit/delete campaigns, deliverables, and categories, and run the demo-data generator. Blast radius is capped by design — `email_jobs` is unwritable from the client and every send goes only to `ALLOWED_RECIPIENT_EMAIL` (the invariants doing their job) — but the data plane is open. Containment short of the real fix exists — an Access gate plus key rotation (A0/D0) — but only the auth swap closes the API-level exposure. → **A0 immediately; A1/A2 close it at cutover.**
- **R2 — Destructive migrations auto-apply to the one live project on merge.** `deploy.yml` runs `supabase db push` on every merge to `main`; structure.md itself flags this as single-environment-only. Production planning makes this the first structural change. → **A3.**
- **R3 — Parked PR #11 has drifted and will fail if un-parked as-is.** It's conflicting with `main`, and its `send-reminders` still queries `due_date` — a column migration `0005` dropped. Un-parking without the re-point is a guaranteed runtime failure. The activation checklist exists at [archive/phase4-reminders.md](archive/phase4-reminders.md). → **A5 + D4.**
- **R4 — `owners` are free-text display names.** No uniqueness, no addresses, no identity. Fine for the prototype (roadmap said so explicitly); it blocks owner-addressed delivery and CRM contact mapping until upgraded. → **A5 v1 works around it via accounts; C4/O3 fixes it.**
- **R5 — The email path is test-sender-bound.** The shared `onboarding@resend.dev` sender only delivers to the Resend account owner, so *any* recipient expansion silently depends on domain verification happening first. → **A5.**
- **R6 — Single Supabase project, unverified backup posture.** Prototype and (future) production data currently share one blast radius, and no restore has ever been rehearsed. Backup capability may require a paid tier — that's hosting-bucket spend (spec §2), but verify rather than assume. → **A3/A6.**
- **R7 — No automated test suite.** CI is lint/typecheck/build; `npm test` is `--if-present` with nothing present; verification has been ad-hoc Playwright runs per PR. Acceptable so far; CRM sync (C2) adds async moving parts where regressions hide. → **A6 smoke pack now, D8 for depth.**
- **R8 — `anon` grants need a production-side audit.** The local stack shows `anon` table grants via a default-privileges artifact (known, previously observed on all public tables). Hosted behaves differently, and the house rule is `anon` gets nothing — verify it in the production project rather than assuming. → **A2.**
- **R9 — Zero-cost auth can drift upstream.** The generalized Twenty lesson: a candidate can re-license between bake-off and deploy (or after). Mitigation: license snapshots in the evidence sheets, re-verification at production deploy, version pinning. → **B2/C1.**
- **R10 — Hand-written `database.types.ts`.** Deliberate house choice that has worked; drift risk grows as Track C adds tables. Flagged for an owner call, not unilaterally changed. → **D9.**
- **R11 — Naming/domain debt.** Repo, Pages project, and URL all say `marketing-calendar`; NorcalOS branding wants a custom domain and possibly renames. Cosmetic, cutover-timed. → **D7.**

## 6. Decisions the owner owns

Recommendations below are **this plan's, not prior owner decisions** — each needs an explicit owner call. Ordered by when the work needs the answer.

| ID | Decision | Plan's recommendation (flagged as such) | Consumed by |
| --- | --- | --- | --- |
| **D0** | Interim containment for the live prototype's public-write exposure: Access gate + key rotation, another explicit measure, or a recorded decision to accept the exposure until A1. | Cloudflare Access on the Pages site + publishable-key rotation verified by A0's old-key-401 check, accepting the documented residual (API-level exposure ends only with the A1 auth swap). | A0 |
| **D1** | Sign-in mechanism and IdP (OAuth provider(s), magic links, or both). | Decide in A1 around whatever IdP the club already lives in; O1 refines after the bake-off. | A1, C1 |
| **D2** | Project topology: does the prototype project become staging, or get retired for a fresh pair? | New clean production project; prototype becomes staging after A4. Clean secrets/config, and the migration replay gets tested from zero. | A3, cutover |
| **D3** | Carry prototype data or start fresh. | Carry campaigns/deliverables/categories **and** the `email_jobs` audit trail (it's the proof the invariants held); purge `is_seed` first. | A4, cutover |
| **D4** | Reminders in production v1? (Owner parked them 2026-06-12 for demo scope — production changes the calculus but the call is the owner's.) | Lean yes: the function is built and review-hardened; cost is the R3 re-point plus the one-time setup. | A5 |
| **D5** | Does CRM go-live gate the app cutover? (Plus D5b: do task management / CMS gate it?) | No and no: **Gate 1 ("calendar cutover ready", §2) gates the cutover; Gate 2 ("production program complete") lands when Track C does.** CRM and the new modules arrive on the hardened platform. | Cutover |
| **D6** | Frontend error tracking: which tool, or none. | Pick in A6 with a zero/low-cost bias; "none, revisit after CRM sync" is a legitimate answer if recorded. | A6 |
| **D7** | Custom domain (and any repo/Pages renames to NorcalOS branding). | Domain yes (hosting-bucket spend); renames are cheap and cutover-timed. | A3, cutover |
| **D8** | Test-automation depth. | Formalize the existing Playwright habit into a staging smoke pack now (A6); grow a real suite where Track C adds sync logic. | A6, C2 |
| **D9** | Keep hand-written `database.types.ts` or move to generated types. | Keep hand-written through Track A; revisit when C2 adds mirror tables. Current pattern is a documented house choice — changing it is an owner call. | A2, C2 |

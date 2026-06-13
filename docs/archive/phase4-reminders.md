# Phase 4 — Reminder emails (scheduled send path) — PARKED

> **Status: BUILT, NOT IN PRODUCTION.** Parked by the owner on 2026-06-12 — not
> needed for the current demo. The work lives in **PR #11** (branch
> `phase4-reminders`), open and unmerged. This file is the archived spec +
> verification record so the active `features.md` stays focused on in-flight
> phases. Nothing here is deployed.

## What "not in production" means precisely

The reminder path is inert on `main`, and stays inert even if PR #11 merges, until the one-time setup below is done:

- The `send-reminders` function, its `config.toml` block, and the `deploy.yml` deploy step exist **only in PR #11**, not on `main`.
- If PR #11 merges, the function deploys — but nothing calls it: no `pg_cron` job is scheduled, and with `CRON_SECRET` unset it fail-closes with `500` on any invocation. So merging alone delivers no reminders and carries no risk; it is dormant code.
- Activation is the one-time setup (secrets + Vault + pg_cron/pg_net + schedule) plus a manual invocation to confirm the real send. Until then, reminders do not fire.

The manual send path (`schedule-email`) is unaffected and remains live.

## Feature spec (as built in PR #11)

- `send-reminders` edge function: cron-secret auth (`x-cron-secret` vs `CRON_SECRET`, fail closed, `verify_jwt` off); selects deliverables due within `REMINDER_LEAD_DAYS` (default 3) with `reminded_at is null` on campaigns where `reminders_enabled = true`; sends via Resend; writes one `email_jobs` row per attempt; sets `reminded_at` only after a successful send.
- Recipient rule: reminders deliver **only to `ALLOWED_RECIPIENT_EMAIL`**, with owners named in the subject/body (owners are display names; the shared test sender can't deliver elsewhere anyway).
- `reminders_enabled` per-campaign toggle is already on the campaign form (shipped in Phase 1).
- `config.toml` gets `[functions.send-reminders] verify_jwt = false`; `deploy.yml` gets a `--no-verify-jwt` deploy step.

Full contract: `roadmap.md` → `send-reminders`.

## Verification record

**Verified on the local stack (2026-06-12):**
- Auth: `405` on GET; `401` on missing/wrong `x-cron-secret`; `500` fail-closed when `CRON_SECRET` unset — and the request reached the function with no JWT, confirming per-function `verify_jwt = false`.
- Selection exact across five seeded deliverables: only the in-window / opted-in / unreminded one was due; opt-out campaign, already-reminded, and out-of-window were all excluded.
- The reminder row named the owners in the subject and targeted only the allowlisted recipient.
- With no local Resend key, the attempt recorded `failed` + error and left `reminded_at` null, so the next run retried it (by design); simulating a prior success via `reminded_at` made the next run report `due: 0`.

**Review hardening (two rounds):**
- Post-send writes reordered so `reminded_at` (the dedupe guard) is set **first** after a successful delivery; a failure of the subsequent `email_jobs` update leaves a visible stale `scheduled` row rather than a double-send window. Both writes are error-checked and surfaced in the summary as `update_errors` (the `reminded_at` case marked "WILL RE-SEND next run").
- The three failed-send bookkeeping writes were folded into a `markJobFailed()` helper that reports a failed status-write into the same `update_errors` channel (closes the scheduled-vs-failed observability gap; no dedupe impact since no email was sent).

**Not verified (impossible without prod + a provider key):** the real Resend success path (`sent` + `provider_message_id` + the function setting `reminded_at`) and the actual pg_cron→pg_net firing.

## Activation checklist (when un-parking)

1. Merge PR #11 (or rebase the branch onto current `main`), so the function + `config.toml` block + `deploy.yml` step land and the function deploys.
2. `npx supabase secrets set CRON_SECRET=<value>` (optionally `REMINDER_LEAD_DAYS=3`).
3. Enable `pg_cron` + `pg_net` (dashboard → Database → Extensions).
4. SQL editor: `select vault.create_secret('<same value>', 'cron_secret');` then the `cron.schedule` block (project ref inside) — exact SQL in `structure.md` → pg_cron + Vault.
5. Verify, and report exactly what was verified: one manual `curl -X POST .../send-reminders -H "x-cron-secret: <value>"` against a due deliverable confirms the real send; the next scheduled firing shows in `cron.job_run_details` with a 2xx in `net._http_response`. **Never report cron delivery as working if only the manual invocation was tested.**

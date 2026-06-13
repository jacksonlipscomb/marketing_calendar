// send-reminders — the scheduled send path (roadmap.md → send-reminders).
//
// Invoked once daily by pg_cron via pg_net (one-time setup in structure.md).
// Deployed with verify_jwt OFF: the caller is Postgres, not a user session, so
// the x-cron-secret header check below replaces the JWT check. Like
// schedule-email, all email_jobs writes happen here with the service role —
// the client never writes them — and the provider key never leaves this
// runtime.
//
// Recipient rule (roadmap.md → Scope): `owners` are display names, not email
// addresses. Every reminder delivers ONLY to ALLOWED_RECIPIENT_EMAIL, with the
// owners named in the subject/body. The shared Resend test sender cannot
// deliver anywhere else, and the server-side allowlist stays the single
// recipient guard.
//
// Dedupe (CLAUDE.md invariant 6): the query selects only reminded_at IS NULL,
// and reminded_at is set ONLY after a successful send. A failed send leaves it
// null so the next daily run retries — do not "fix" that by setting it earlier.
import { createClient } from "npm:@supabase/supabase-js@^2"

const RESEND_FROM = "onboarding@resend.dev" // shared test sender (no verified domain)
const DEFAULT_LEAD_DAYS = 3

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10) // UTC calendar date

type DueDeliverable = {
  id: string
  title: string
  details: string | null
  due_date: string
  owners: string[]
  campaigns: { name: string; reminders_enabled: boolean }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405)
  }

  // 1. Authenticate the cron caller. Fail CLOSED if the secret is unset.
  //    (The same value lives in Vault for the SQL caller — two homes by design,
  //    see structure.md → Why two secret homes.)
  const expected = Deno.env.get("CRON_SECRET")
  if (!expected) {
    return json({ error: "function misconfigured: CRON_SECRET not set" }, 500)
  }
  if (req.headers.get("x-cron-secret") !== expected) {
    return json({ error: "unauthorized" }, 401)
  }

  // 2. Recipient allowlist — the only address reminders ever go to. Fail CLOSED.
  const recipient = Deno.env.get("ALLOWED_RECIPIENT_EMAIL")
  if (!recipient) {
    return json(
      { error: "function misconfigured: ALLOWED_RECIPIENT_EMAIL not set" },
      500,
    )
  }

  const leadRaw = Number(Deno.env.get("REMINDER_LEAD_DAYS"))
  const leadDays =
    Number.isFinite(leadRaw) && leadRaw >= 0 ? leadRaw : DEFAULT_LEAD_DAYS
  const today = isoDate(new Date())
  const windowEnd = isoDate(new Date(Date.now() + leadDays * 86_400_000))

  // 3. Service-role client (bypasses RLS) from auto-injected env.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  // 4. Due deliverables: inside the lead window, not yet reminded, and the
  //    parent campaign opted in (!inner makes the campaign filter exclude rows).
  const { data, error } = await admin
    .from("deliverables")
    .select(
      "id, title, details, due_date, owners, campaigns!inner(name, reminders_enabled)",
    )
    .gte("due_date", today)
    .lte("due_date", windowEnd)
    .is("reminded_at", null)
    .eq("campaigns.reminders_enabled", true)
    .order("due_date", { ascending: true })
  if (error) return json({ error: error.message }, 500)
  const due = (data ?? []) as unknown as DueDeliverable[]

  const apiKey = Deno.env.get("RESEND_API_KEY")
  let sent = 0
  let failed = 0
  // Bookkeeping-write failures, surfaced in the summary so a status write that
  // didn't land is loud in the cron logs instead of silent. The reminded_at
  // case (email already delivered) is the one double-send window; the others
  // are observability mismatches — a row left `scheduled` while counted failed.
  const updateErrors: string[] = []

  // Mark a job failed and count it; report if the failed-status write itself
  // didn't land (row stays `scheduled` though the summary says failed).
  async function markJobFailed(jobId: string, reason: string) {
    const { error: markErr } = await admin
      .from("email_jobs")
      .update({ status: "failed", error: reason })
      .eq("id", jobId)
    if (markErr) {
      updateErrors.push(
        `email_job ${jobId}: failed-status write failed (${markErr.message}) — row stuck as scheduled`,
      )
    }
    failed++
  }

  // 5. One reminder per deliverable, each recorded as an email_jobs row using
  //    the same insert-first, then sent/failed pattern as schedule-email.
  for (const d of due) {
    const owners = (d.owners ?? []).join(", ")
    const subject = owners
      ? `Reminder for ${owners}: "${d.title}" due ${d.due_date}`
      : `Reminder: "${d.title}" due ${d.due_date}`
    const body = [
      `Deliverable "${d.title}" for campaign "${d.campaigns.name}" is due ${d.due_date}.`,
      owners ? `Owners: ${owners}` : null,
      d.details ? `Details: ${d.details}` : null,
    ]
      .filter(Boolean)
      .join("\n\n")

    const { data: job, error: insertErr } = await admin
      .from("email_jobs")
      .insert({
        deliverable_id: d.id,
        subject,
        body,
        recipient,
        status: "scheduled",
      })
      .select()
      .single()
    if (insertErr) {
      failed++
      continue
    }

    if (!apiKey) {
      // Misconfig is visible as a failed job rather than a silent crash.
      await markJobFailed(job.id, "RESEND_API_KEY not configured")
      continue
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: recipient,
          subject,
          text: body,
        }),
      })
      const result = await res.json().catch(() => ({}))

      if (!res.ok) {
        await markJobFailed(
          job.id,
          result?.message ?? `Resend error ${res.status}`,
        )
        continue
      }

      // The email is delivered. Set the dedupe guard FIRST: if the job-row
      // update below fails instead, the damage is a stale `scheduled` row
      // (visible, harmless); if reminded_at were last and ITS write failed,
      // the next run would re-send — the invariant violation. Both errors are
      // checked and reported; only a reminded_at failure can still double-send,
      // and it now shows up in the summary instead of passing silently.
      const { error: remindErr } = await admin
        .from("deliverables")
        .update({ reminded_at: new Date().toISOString() })
        .eq("id", d.id)
      const { error: jobErr } = await admin
        .from("email_jobs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: result?.id ?? null,
        })
        .eq("id", job.id)
      if (remindErr) {
        updateErrors.push(
          `deliverable ${d.id}: reminded_at write failed (${remindErr.message}) — WILL RE-SEND next run`,
        )
      }
      if (jobErr) {
        updateErrors.push(
          `email_job ${job.id}: status update failed (${jobErr.message}) — row stuck as scheduled`,
        )
      }
      sent++
    } catch (err) {
      await markJobFailed(job.id, (err as Error).message)
    }
  }

  // 6. Summary for the function logs / net._http_response.
  if (updateErrors.length > 0) {
    console.error("send-reminders post-send update errors:", updateErrors)
  }
  return json({
    window: { from: today, to: windowEnd, leadDays },
    due: due.length,
    sent,
    failed,
    ...(updateErrors.length > 0 ? { update_errors: updateErrors } : {}),
  })
})

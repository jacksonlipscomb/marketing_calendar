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
      await admin
        .from("email_jobs")
        .update({ status: "failed", error: "RESEND_API_KEY not configured" })
        .eq("id", job.id)
      failed++
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
        await admin
          .from("email_jobs")
          .update({
            status: "failed",
            error: result?.message ?? `Resend error ${res.status}`,
          })
          .eq("id", job.id)
        failed++
        continue
      }

      await admin
        .from("email_jobs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: result?.id ?? null,
        })
        .eq("id", job.id)
      // Success — and only success — marks the deliverable reminded.
      await admin
        .from("deliverables")
        .update({ reminded_at: new Date().toISOString() })
        .eq("id", d.id)
      sent++
    } catch (err) {
      await admin
        .from("email_jobs")
        .update({ status: "failed", error: (err as Error).message })
        .eq("id", job.id)
      failed++
    }
  }

  // 6. Summary for the function logs / net._http_response.
  return json({ window: { from: today, to: windowEnd, leadDays }, due: due.length, sent, failed })
})

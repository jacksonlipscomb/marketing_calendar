// schedule-email — the load-bearing edge function for the PoC.
//
// The browser may write `events` directly (RLS-governed) but CANNOT write
// `email_jobs`: it has no RLS write policy. All `email_jobs` writes happen here,
// with the service role, after this function validates the request, enforces the
// recipient allowlist, persists the job, and (for immediate sends) calls Resend
// and records the result. The provider key never leaves this runtime.
//
// Imports use inline `npm:` specifiers (no per-function deno.json / import map).
import { z } from "npm:zod@^4"
import { createClient } from "npm:@supabase/supabase-js@^2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// Same shape the client sends (and the client validates with its own Zod copy).
const requestSchema = z.object({
  event_id: z.uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  recipient: z.email(),
  scheduled_for: z.iso.datetime({ offset: true }).nullable(),
})

const RESEND_FROM = "onboarding@resend.dev" // shared test sender (no verified domain)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405)
  }

  // 1. Validate input.
  let payload: z.infer<typeof requestSchema>
  try {
    payload = requestSchema.parse(await req.json())
  } catch (err) {
    return json(
      { error: "invalid request", details: (err as Error).message },
      400,
    )
  }

  // 2. Enforce the recipient allowlist server-side. Fail CLOSED if unset.
  const allowed = Deno.env.get("ALLOWED_RECIPIENT_EMAIL")
  if (!allowed) {
    return json(
      { error: "function misconfigured: ALLOWED_RECIPIENT_EMAIL not set" },
      500,
    )
  }
  if (payload.recipient.trim().toLowerCase() !== allowed.trim().toLowerCase()) {
    return json({ error: "recipient not allowed" }, 403)
  }

  // 3. Service-role client (bypasses RLS) from auto-injected env.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  // 4. Confirm the event exists.
  const { data: event, error: eventErr } = await admin
    .from("events")
    .select("id")
    .eq("id", payload.event_id)
    .maybeSingle()
  if (eventErr) return json({ error: eventErr.message }, 500)
  if (!event) return json({ error: "event not found" }, 404)

  const sendNow =
    !payload.scheduled_for || new Date(payload.scheduled_for) <= new Date()

  // 5. Future-dated → persist as `scheduled`, no send. (No worker delivers these
  //    later in the PoC — that is out of scope.)
  if (!sendNow) {
    const { data, error } = await admin
      .from("email_jobs")
      .insert({
        event_id: payload.event_id,
        subject: payload.subject,
        body: payload.body,
        recipient: payload.recipient,
        scheduled_for: payload.scheduled_for,
        status: "scheduled",
      })
      .select()
      .single()
    if (error) return json({ error: error.message }, 500)
    return json(data, 201)
  }

  // 6. Immediate send. Insert first so the job persists even if the send fails.
  const { data: jobRow, error: insertErr } = await admin
    .from("email_jobs")
    .insert({
      event_id: payload.event_id,
      subject: payload.subject,
      body: payload.body,
      recipient: payload.recipient,
      scheduled_for: payload.scheduled_for,
      status: "scheduled",
    })
    .select()
    .single()
  if (insertErr) return json({ error: insertErr.message }, 500)

  const apiKey = Deno.env.get("RESEND_API_KEY")
  if (!apiKey) {
    // Misconfig is visible as a failed job rather than a silent crash.
    const { data } = await admin
      .from("email_jobs")
      .update({ status: "failed", error: "RESEND_API_KEY not configured" })
      .eq("id", jobRow.id)
      .select()
      .single()
    return json(data ?? jobRow, 200)
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
        to: payload.recipient,
        subject: payload.subject,
        text: payload.body,
      }),
    })
    const result = await res.json().catch(() => ({}))

    if (!res.ok) {
      const { data } = await admin
        .from("email_jobs")
        .update({
          status: "failed",
          error: result?.message ?? `Resend error ${res.status}`,
        })
        .eq("id", jobRow.id)
        .select()
        .single()
      return json(data ?? jobRow, 200)
    }

    const { data } = await admin
      .from("email_jobs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: result?.id ?? null,
      })
      .eq("id", jobRow.id)
      .select()
      .single()
    return json(data ?? jobRow, 200)
  } catch (err) {
    const { data } = await admin
      .from("email_jobs")
      .update({ status: "failed", error: (err as Error).message })
      .eq("id", jobRow.id)
      .select()
      .single()
    return json(data ?? jobRow, 200)
  }
})

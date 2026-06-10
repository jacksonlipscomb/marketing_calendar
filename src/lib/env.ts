// Validated access to public (VITE_) env vars, mirroring the fail-fast guard in
// supabase.ts. Importing this throws early with a clear message if a required var
// is missing, instead of silently sending an `undefined` value downstream.

const ownerEmail = import.meta.env.VITE_OWNER_EMAIL
if (!ownerEmail) {
  throw new Error(
    "Missing VITE_OWNER_EMAIL. Copy .env.example to .env and set your Resend test email.",
  )
}

// Owner's test email — used only to prefill/display the locked recipient in the
// schedule-email form. NOT a security control: the edge function's
// ALLOWED_RECIPIENT_EMAIL secret is the authoritative recipient allowlist.
export const OWNER_EMAIL: string = ownerEmail

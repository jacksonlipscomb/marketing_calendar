/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Owner's Resend test email — UI prefill/display only, NOT a security control.
   *  The edge function's ALLOWED_RECIPIENT_EMAIL is the authoritative guard. */
  readonly VITE_OWNER_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

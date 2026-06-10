import { supabase } from "./supabase"

// The RLS policies are scoped `to authenticated`, so the app needs a real session
// before any query runs. Per the owner's decision we use anonymous sign-in: no
// login UI, but a genuine authenticated session that satisfies RLS.
//
// Requires "Allow anonymous sign-ins" to be enabled in the Supabase dashboard
// (Auth > Sign In / Providers). If it is disabled, signInAnonymously() returns an
// error and the app surfaces it rather than silently failing.
export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return

  const { error } = await supabase.auth.signInAnonymously()
  if (error) {
    throw new Error(
      `Anonymous sign-in failed (${error.message}). Enable "Allow anonymous sign-ins" in the Supabase dashboard.`,
    )
  }
}

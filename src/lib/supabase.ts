import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Browser Supabase client. Uses the anon key, so every request is governed by
// Row Level Security (see roadmap.md). The client can read/write `events` and
// read `email_jobs`; it has no policy to write `email_jobs` by design — those
// writes go only through the `schedule-email` edge function (service role).
//
// Both values are public-safe and injected at build time from the environment
// (see .env.example). They must never carry the service-role or provider keys.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

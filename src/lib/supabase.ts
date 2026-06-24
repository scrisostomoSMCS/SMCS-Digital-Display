import { createClient } from "@supabase/supabase-js";

/*
  Browser Supabase client for the public, read-only dashboard.

  Both values are NEXT_PUBLIC_ on purpose — they're safe to ship to the browser.
  Access is restricted by Row Level Security (public can only SELECT events),
  NOT by hiding these keys. Never use the service_role / secret key here.
*/
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

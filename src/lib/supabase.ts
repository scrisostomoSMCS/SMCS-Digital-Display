import { createBrowserClient } from "@supabase/ssr";

/*
  Browser Supabase client. Used by all client components for
  queries and realtime. With @supabase/ssr the session is stored in cookies,
  so the server (middleware, server components) can read the same auth state.

  Both env values are public on purpose. access is restricted by Row Level
  Security, not by hiding these keys. Never use the service_role key here.
*/
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

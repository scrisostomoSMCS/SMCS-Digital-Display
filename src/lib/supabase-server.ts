import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
  Server Supabase client for Server Components / Route Handlers. Reads (and,
  where allowed, refreshes) the session from cookies so server-side code sees
  the logged-in user. Used for route protection on /schedule.
*/
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components can't set cookies; that's handled by middleware.
          // Swallow the error so read-only server rendering still works.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* called from a Server Component, safe to ignore */
          }
        },
      },
    },
  );
}

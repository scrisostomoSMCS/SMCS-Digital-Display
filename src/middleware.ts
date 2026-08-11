import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SHOW_MY_SCHEDULE } from "@/lib/siteConfig";

/*
  Route protection for logged-in-only pages. Public pages (home, Live
  Dashboard) are not matched and stay open. Unauthenticated visitors to a
  protected route are redirected to /login (with a redirectTo so they return
  after signing in). Also refreshes the auth cookie on each matched request.
*/
export async function middleware(request: NextRequest) {
  // My Schedule hidden: bounce straight home rather than falling through to the
  // auth check below, which would send signed-out visitors to /login for a
  // feature that isn't there. The matcher below is left untouched, so this
  // route protects itself normally again the moment SHOW_MY_SCHEDULE is true.
  if (!SHOW_MY_SCHEDULE && request.nextUrl.pathname.startsWith("/schedule")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// Protect logged-in routes. /manage and /admin additionally check role in the
// page (and RLS enforces access regardless).
export const config = {
  matcher: [
    "/schedule",
    "/schedule/:path*",
    "/manage",
    "/manage/:path*",
    "/admin",
    "/admin/:path*",
  ],
};

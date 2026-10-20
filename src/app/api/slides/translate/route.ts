import { createSupabaseServerClient } from "@/lib/supabase-server";
import { translateSlideInput } from "@/lib/translateSlide.server";
import type { SlideInput } from "@/lib/slides";

const STAFF_ROLES = ["employee", "admin"];

/*
  Fills in Spanish for a custom slide about to be saved (see
  translateSlide.server for the diff/translate rules) and returns it. Server
  side so the translation call in translate.server.ts never runs from the browser.

  Unlike /api/info-content/save this route does NOT write: the editor saves the
  returned input through the existing updateSlide(), so slide writes keep one
  path (and its RLS no-op check, location targeting, and change event). The
  role check below only exists to keep the translation quota for staff; RLS on
  slides is still what guards the actual write.
*/
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    return Response.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { input?: SlideInput; loaded?: SlideInput };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.input || !body.loaded || typeof body.input.template !== "string") {
    return Response.json({ error: "Missing slide." }, { status: 400 });
  }

  const { merged, warnings } = await translateSlideInput(body.loaded, body.input);
  return Response.json({ input: merged, warnings });
}

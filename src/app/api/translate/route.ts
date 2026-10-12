import { createSupabaseServerClient } from "@/lib/supabase-server";
import { translateTexts } from "@/lib/translate.server";

const STAFF_ROLES = ["employee", "admin"];
const MAX_TEXTS = 10;
const MAX_CHARS = 500;

/*
  English -> Spanish for short staff-entered text that is not part of a slide
  or info_content, currently lost & found items (lib/lostFound). Same MyMemory
  call and per-string isolation as the other translate routes. Staff only, and
  capped, so the shared translation quota cannot be drained through it.
  Callers never send names here.
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

  let body: { texts?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const texts = body.texts;
  if (
    !Array.isArray(texts) ||
    texts.length > MAX_TEXTS ||
    !texts.every((t) => typeof t === "string" && t.length <= MAX_CHARS)
  ) {
    return Response.json({ error: "Expected up to 10 short strings." }, { status: 400 });
  }

  return Response.json({ results: await translateTexts(texts as string[]) });
}

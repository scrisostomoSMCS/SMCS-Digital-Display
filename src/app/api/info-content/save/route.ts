import { createSupabaseServerClient } from "@/lib/supabase-server";
import { translateChangedFields } from "@/lib/translateInfoContent.server";
import { MAX_SERVICES_PER_PAGE, type InfoContent } from "@/lib/infoContent";

const STAFF_ROLES = ["employee", "admin"];

/*
  Saves public.info_content, auto-translating any English that changed since
  the editor's `loaded` snapshot into Spanish (see translateInfoContent.server
  for the diff/translate rules). Runs server-side, not a client Supabase call
  like the rest of the manage page, so translate-on-save (the MyMemory call in
  translate.server.ts) only ever runs from the server, never the browser.

  Auth mirrors the manage page's role gate; RLS on info_content is still the
  real enforcement, this just returns a clean 401/403 instead of a write error.
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

  let body: { content?: InfoContent; loaded?: InfoContent };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.content || !body.loaded) {
    return Response.json({ error: "Missing content." }, { status: 400 });
  }

  const { merged, warnings } = await translateChangedFields(body.loaded, body.content);

  const normalized: InfoContent = {
    ...merged,
    services: {
      ...merged.services,
      pages: merged.services.pages.map((p) => ({
        ...p,
        services: p.services.slice(0, MAX_SERVICES_PER_PAGE),
      })),
    },
  };

  const { error } = await supabase
    .from("info_content")
    .upsert({ id: 1, content: normalized, updated_at: new Date().toISOString() });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ content: normalized, warnings });
}

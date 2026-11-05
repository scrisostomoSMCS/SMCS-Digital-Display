import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import NavBar from "@/components/NavBar";
import ManageSidebar from "@/components/manage/ManageSidebar";
import { bulletinFontClass } from "@/lib/bulletinFonts";
import { COLLAPSED_SIDEBAR_SCRIPT } from "@/lib/manageSidebar";

const STAFF_ROLES = ["employee", "admin"];

/*
  Shared shell for /manage, /manage/health and /manage/logs: the dark section
  sidebar on the left, the blue nav bar and the page in the column beside it.

  Next keeps a layout mounted while you move between its pages, so the sidebar
  never unmounts between these three: no flash, and its collapsed state, open
  groups and scroll position carry over.

  The role lookup here only decides whether to show the shell at all and which
  sidebar items an admin gets. Each page keeps its own role check (a layout is
  not re-run on client-side navigation, so it cannot be the only gate), and
  RLS is the real enforcement.
*/
export default async function ManageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware already sends signed-out visitors to /login with the right
  // redirectTo; this only guards a request that slipped past it.
  if (!user) redirect("/login?redirectTo=/manage");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !STAFF_ROLES.includes(profile.role)) redirect("/");

  return (
    // bulletinFontClass: the slide previews on /manage draw real bulletin
    // pages, and they only wrap text the way the wall screen does if
    // Playfair/Poppins are in scope. next/font can only be called from a
    // Server Component, which is why the variables are applied here rather
    // than inside the preview itself. Declaring the variables does not change
    // these pages' own typography — only .font-display / .font-body consume them.
    <div className={`${bulletinFontClass} flex`}>
      {/* Applies a saved "collapsed" before the first paint, so the sidebar
          never flashes open first (see lib/manageSidebar). */}
      <script dangerouslySetInnerHTML={{ __html: COLLAPSED_SIDEBAR_SCRIPT }} />
      {/* Section navigation, flush left directly under the teal top bar, with
          the blue nav bar to its right. Docked (and collapsible to an icon
          strip) on wide screens, a strip with a drawer on narrower laptops,
          hidden on small screens, where the page just scrolls. */}
      <ManageSidebar isAdmin={profile.role === "admin"} />

      <div className="min-w-0 flex-1">
        {/* The site nav bar, rendered here rather than by the site layout so
            the sidebar can run up beside it (see NavBar). */}
        <NavBar inManagePage />
        {children}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminUserManager from "@/components/admin/AdminUserManager";

// Playfair for the big title (loaded here since /admin is outside the (site)
// group, which is where the rest of the site loads its display font).
const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "Admin Panel | SMCS",
};

/*
  Admin-only, full-screen layout: blue sidebar + a panel for viewing users and
  setting roles. Server-side role check (admin only) on top of middleware auth;
  RLS + the admin RPCs are the real enforcement. Non-admins are redirected away.
*/
export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/");

  return (
    <div className={`${serif.variable} flex min-h-screen`}>
      <AdminSidebar />
      <main className="min-w-0 flex-1 bg-ink/5 px-6 py-8 md:px-10">
        <p className="text-sm font-semibold text-ink/50">
          Admin Panel (Administrator access)
        </p>
        <div className="mt-6 text-center">
          <h1 className="font-display text-4xl font-bold md:text-5xl">
            Admin Panel
          </h1>
          <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-40 bg-blue" />
        </div>
        <div className="mx-auto mt-10 max-w-6xl">
          <AdminUserManager currentUserId={user.id} />
        </div>
      </main>
    </div>
  );
}

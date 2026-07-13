import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Section from "@/components/Section";
import AdminUserManager from "@/components/admin/AdminUserManager";

export const metadata = {
  title: "Manage staff | SMCS",
};

/*
  Admin-only page for viewing users and setting roles. Server-side role check
  (admin only) on top of middleware auth; RLS + the admin RPCs are the real
  enforcement. Non-admins are redirected away.
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
    <Section title="Manage staff & roles">
      <p className="max-w-3xl text-lg">
        Review registered users and set each one&rsquo;s access level. Staff who
        signed up with an <strong>@smcs.org</strong> email start as{" "}
        <strong>Client</strong> (no editing access) until you grant them Employee
        or Admin here.
      </p>
      <div className="mt-6">
        <AdminUserManager currentUserId={user.id} />
      </div>
    </Section>
  );
}

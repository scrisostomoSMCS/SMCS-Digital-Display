import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Section from "@/components/Section";
import ManageCalendar from "@/components/manage/ManageCalendar";

export const metadata = {
  title: "Manage Schedule | SMCS",
};

const STAFF_ROLES = ["employee", "admin"];

/*
  Employee/admin editing page. Role gate here is convenience on top of RLS (the
  real enforcement — only staff can write events). Unauthenticated → login;
  signed-in clients → sent home. Editing lives on this separate route so the
  view-only Live Dashboard never renders editing controls.
*/
export default async function ManagePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/manage");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !STAFF_ROLES.includes(profile.role)) redirect("/");

  return (
    <Section title="Manage Schedule">
      <p className="max-w-3xl text-lg">
        Click a time slot to create an event; drag to move, or drag its edge to
        resize. Click an event to edit or delete it. Changes appear on the Live
        Dashboard and across the app within a second or two.
      </p>
      {/* Color legend (palette-only). */}
      <p className="mt-2 flex flex-wrap items-center gap-4 text-base">
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 bg-blue" /> On Live Dashboard
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 bg-teal" /> Off dashboard
          (personal)
        </span>
      </p>

      <div className="mt-6 h-[80vh] min-h-[560px]">
        <ManageCalendar />
      </div>
    </Section>
  );
}

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Section from "@/components/Section";
import ManageCalendar from "@/components/manage/ManageCalendar";
import InfoContentEditor from "@/components/manage/InfoContentEditor";
import CustomSlidesEditor from "@/components/manage/CustomSlidesEditor";
import ManageSidebar from "@/components/manage/ManageSidebar";

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
    <div className="mx-auto flex max-w-7xl gap-4 px-4">
      {/* Sticky section navigation (its own component; jumps to the anchors
          below). Hidden on small screens, where the page just scrolls. */}
      <ManageSidebar />

      <div className="min-w-0 flex-1">
    <Section id="calendar" title="Manage Schedule" className="scroll-mt-6">
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

    {/* Info-display editor lives below the calendar, in its own section. */}
    <Section title="Edit information display" className="scroll-mt-6">
      <InfoContentEditor />
    </Section>

    {/* Employee-created slides (add via the sidebar; edit/delete here). */}
    <Section title="Custom slides" className="scroll-mt-6">
      <CustomSlidesEditor />
    </Section>
      </div>
    </div>
  );
}

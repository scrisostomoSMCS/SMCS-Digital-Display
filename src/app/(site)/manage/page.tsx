import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Section from "@/components/Section";
import ManageCalendar from "@/components/manage/ManageCalendar";
import InfoContentEditor from "@/components/manage/InfoContentEditor";
import CustomSlidesEditor from "@/components/manage/CustomSlidesEditor";
import QuickEventForm from "@/components/manage/QuickEventForm";
import ManageSidebar from "@/components/manage/ManageSidebar";

export const metadata = {
  title: "Manage | SMCS",
};

const STAFF_ROLES = ["employee", "admin"];

/*
  Employee/admin editing page. Role gate here is convenience on top of RLS (the
  real enforcement, only staff can write events). Unauthenticated → login;
  signed-in clients → sent home. Editing lives on this separate route so the
  view-only Live Dashboard never renders editing controls.

  Layout: sticky section sidebar (jump links + slide menus) alongside three
  clearly-separated areas, the calendar, the built-in information pages, and
  the custom slides.
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
    <div className="mx-auto flex max-w-7xl gap-8 px-4 md:px-6">
      {/* Sticky section navigation (its own component). Hidden on small
          screens, where the page just scrolls. */}
      <ManageSidebar />

      <div className="min-w-0 flex-1">
        <Section id="calendar" title="Calendar" className="scroll-mt-6">
          <p className="max-w-3xl text-lg">
            Add and edit the schedule here. Click a time slot to create an event;
            drag to move it, or drag an edge to resize. Click an event to edit or
            delete it. Changes appear on the Live Dashboard within a second or two.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-4 text-base">
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 bg-blue" /> On Live Dashboard
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 bg-teal" /> Off dashboard
              (personal)
            </span>
          </p>

          {/* Second entry point for events, writes to the same events data
              as the calendar (and thus the dashboard + "Events today" slide). */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-blue">Quick add an event</h3>
            <span className="mt-1 mb-3 block h-1 w-16 bg-teal" />
            <p className="mb-4 max-w-3xl text-base text-ink/70">
              Adds to the calendar, the Live Dashboard, and &ldquo;Events
              happening today&rdquo;, the same as adding it on the calendar
              below.
            </p>
            <QuickEventForm />
          </div>

          <div className="mt-8 h-[80vh] min-h-[560px]">
            <ManageCalendar />
          </div>
        </Section>

        <Section
          title="Information display pages"
          className="scroll-mt-6"
        >
          <p className="max-w-3xl text-lg">
            The built-in pages that rotate on the public Information screens. Edit
            their text below, changes show on the display right away.
          </p>
          <div className="mt-6">
            <InfoContentEditor />
          </div>
        </Section>

        <Section title="Custom slides" className="scroll-mt-6">
          <p className="max-w-3xl text-lg">
            Slides you&rsquo;ve added to the rotation. Expand one to edit its
            layout, text, colors, and image; each saves on its own. Add or delete
            slides from the sidebar.
          </p>
          <div className="mt-6">
            <CustomSlidesEditor />
          </div>
        </Section>
      </div>
    </div>
  );
}

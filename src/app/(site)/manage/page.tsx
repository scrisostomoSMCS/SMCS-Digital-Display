import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Section from "@/components/Section";
import ManageCalendar from "@/components/manage/ManageCalendar";
import InfoContentEditor from "@/components/manage/InfoContentEditor";
import CustomSlidesEditor from "@/components/manage/CustomSlidesEditor";
import QuickEventForm from "@/components/manage/QuickEventForm";
import ManageSidebar from "@/components/manage/ManageSidebar";
import BulletinLocationsManager from "@/components/manage/BulletinLocationsManager";
import { bulletinFontClass } from "@/lib/bulletinFonts";

export const metadata = {
  title: "Manage | SMCS",
};

const STAFF_ROLES = ["employee", "admin"];

/*
  Employee/admin editing page. Role gate here is convenience on top of RLS (the
  real enforcement, only staff can write events). Unauthenticated → login;
  signed-in clients → sent home. Editing lives on this separate route so the
  view-only Live Calendar never renders editing controls.

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
    // bulletinFontClass: the slide previews below draw real bulletin pages, and
    // they only wrap text the way the wall screen does if Playfair/Poppins are
    // in scope. next/font can only be called from a Server Component, which is
    // why the variables are applied here rather than inside the preview itself.
    // Declaring the variables does not change this page's own typography — only
    // .font-display / .font-body consume them.
    <div className={`${bulletinFontClass} mx-auto max-w-7xl px-0 lg:px-6`}>
      {/* The nav bar's "Home" leaves for smcares.org, so staff need an explicit
          way back to this site's home page from the editor. */}
      <div className="flex justify-end px-6 pt-6 lg:px-0">
        <Link
          href="/"
          className="inline-block border-2 border-blue px-5 py-2 text-base font-semibold text-blue hover:bg-blue hover:text-paper"
        >
          ← Back to Digital Bulletin Home
        </Link>
      </div>

      <div className="flex gap-0 lg:gap-8">
        {/* Sticky section navigation (its own component). Hidden on small
            screens, where the page just scrolls. */}
        <ManageSidebar />

        <div className="min-w-0 flex-1">
          <Section id="calendar" title="Calendar" className="scroll-mt-6">
            <p className="max-w-3xl text-lg">
              Add and edit the schedule here. Click a time slot to create an
              event; drag to move it, or drag an edge to resize. Click an event
              to edit or delete it. Changes appear on the Live Calendar within a
              second or two.
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-4 text-base">
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 bg-blue" /> On Live
                Calendar
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
                Adds to the calendar, the Live Calendar, and &ldquo;Events
                happening today&rdquo;, the same as adding it on the calendar
                below.
              </p>
              <QuickEventForm />
            </div>

            <div className="mt-8 h-[68dvh] min-h-[460px] lg:h-[80vh] lg:min-h-[560px]">
              <ManageCalendar />
            </div>
          </Section>

          <Section
            id="digital-schedule"
            title="Digital Bulletin pages"
            className="scroll-mt-6"
          >
            <p className="max-w-3xl text-lg">
              The pages that rotate on the public Digital Bulletin screens. Edit
              their text and choose which locations show each page below.
            </p>
            <div className="mt-6 space-y-8">
              <BulletinLocationsManager />
              <div>
                <h3 className="text-2xl font-bold text-blue">
                  Shared bulletin pages
                </h3>
                <p className="mt-1 mb-4 max-w-3xl text-base text-ink/70">
                  Edit each built-in page and choose All locations or specific
                  buildings.
                </p>
                <InfoContentEditor />
              </div>
            </div>
          </Section>

          <Section
            id="custom-slides"
            title="Custom slides"
            className="scroll-mt-6"
          >
            <p className="max-w-3xl text-lg">
              Slides you&rsquo;ve added to the rotation. Expand one to edit its
              layout, text, colors, image, and display locations; each saves on
              its own. Add or delete slides from the sidebar.
            </p>
            <div className="mt-6">
              <CustomSlidesEditor />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

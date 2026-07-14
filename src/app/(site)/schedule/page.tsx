import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Section from "@/components/Section";
import ScheduleCalendar from "@/components/schedule/ScheduleCalendar";

export const metadata = {
  title: "My Schedule | SMCS",
};

/*
  Personal Calendar, the logged-in user's own week. Middleware already gates
  this route; the server-side auth check here is defense-in-depth so the page
  can never render for an unauthenticated request. RLS guarantees the data is
  only ever this user's own signups. Role-agnostic: any signed-in user works.
*/
export default async function SchedulePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/schedule");

  return (
    <Section title="My Schedule">
      <p className="mb-6 max-w-2xl text-lg">
        The services and appointments you&rsquo;re signed up for this week.
      </p>
      {/* Give the week grid a tall, fixed-height container to fill. */}
      <div className="h-[78vh] min-h-[520px]">
        <ScheduleCalendar />
      </div>
    </Section>
  );
}

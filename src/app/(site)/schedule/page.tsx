import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Section from "@/components/Section";
import ScheduleCalendar from "@/components/schedule/ScheduleCalendar";
import { SHOW_MY_SCHEDULE } from "@/lib/siteConfig";

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
  // Feature hidden: send direct visits home before any data is fetched, so
  // nothing renders and there is no flash. Everything below is untouched and
  // comes back as soon as SHOW_MY_SCHEDULE is true again.
  if (!SHOW_MY_SCHEDULE) redirect("/");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/schedule");

  const t = await getTranslations("schedule");

  return (
    <Section title={t("title")}>
      <p className="mb-6 max-w-2xl text-lg">{t("intro")}</p>
      {/* Give the week grid a tall, fixed-height container to fill. */}
      <div className="h-[68dvh] min-h-[420px] lg:h-[78vh] lg:min-h-[520px]">
        <ScheduleCalendar />
      </div>
    </Section>
  );
}

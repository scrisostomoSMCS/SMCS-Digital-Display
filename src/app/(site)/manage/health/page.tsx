import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Section from "@/components/Section";
import ScreenHealth from "@/components/manage/ScreenHealth";

export const metadata = {
  title: "Screen Health | SMCS",
};

const STAFF_ROLES = ["employee", "admin"];

/*
  Which wall TVs running the Digital Bulletin are alive. Each TV checks in from
  /information?screen=<id> (see ScreenHeartbeat); this page reads those
  check-ins. Same gate as /manage: middleware requires sign-in, this redirects
  non-staff, and RLS on public.screens is the real enforcement.
*/
export default async function ScreenHealthPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/manage/health");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !STAFF_ROLES.includes(profile.role)) redirect("/");

  return (
    <div className="mx-auto max-w-[1600px] px-0 lg:px-6">
      <div className="flex justify-end px-6 pt-6 lg:px-0">
        <Link
          href="/manage"
          className="inline-block rounded-full border-2 border-blue px-5 py-2 text-base font-semibold text-blue hover:bg-blue hover:text-paper"
        >
          ← Back to Manage
        </Link>
      </div>

      <Section id="screen-health" title="Screen health" wide dense>
        <p className="max-w-3xl text-lg">
          Each bulletin TV checks in every 5 minutes. A screen that stops
          checking in shows as Delayed after 10 minutes and Offline after 20.
          This page refreshes itself every minute.
        </p>
        <div className="mt-6">
          <ScreenHealth />
        </div>
      </Section>
    </div>
  );
}

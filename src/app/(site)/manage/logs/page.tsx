import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Section from "@/components/Section";
import AuditLogList from "@/components/manage/AuditLogList";

export const metadata = {
  title: "Logs | SMCS",
};

/*
  Admin-only audit log of every Digital Bulletin change (migration 0034).
  Exactly the Admin Panel's gate: middleware requires sign-in, this redirects
  anyone whose role isn't admin, and RLS on public.audit_logs (admins SELECT
  only) is the real enforcement. The sidebar and nav bar come from
  manage/layout.tsx.
*/
export default async function LogsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/manage/logs");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/");

  return (
    <div className="mx-auto max-w-[1600px] px-0 lg:px-6">
      {/* Below lg only: from lg up the manage sidebar is the way back. */}
      <div className="flex justify-end px-6 pt-6 lg:hidden">
        <Link
          href="/manage"
          className="inline-block rounded-full border-2 border-blue px-5 py-2 text-base font-semibold text-blue hover:bg-blue hover:text-paper"
        >
          ← Back to Manage
        </Link>
      </div>

      <Section id="logs" title="Logs" wide dense>
        <p className="max-w-3xl text-base text-ink/70">
          Every change to the Digital Bulletin. Click a row for the details.
          Times are Pacific; entries are kept for 180 days.
        </p>
        <div className="mt-6">
          <AuditLogList />
        </div>
      </Section>
    </div>
  );
}

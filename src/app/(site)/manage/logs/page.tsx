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
  only) is the real enforcement. Laid out like /manage/health.
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
      <div className="flex justify-end px-6 pt-6 lg:px-0">
        <Link
          href="/manage"
          className="inline-block rounded-full border-2 border-blue px-5 py-2 text-base font-semibold text-blue hover:bg-blue hover:text-paper"
        >
          ← Back to Manage
        </Link>
      </div>

      <Section id="logs" title="Logs" wide dense>
        <p className="max-w-3xl text-lg">
          Every change to the Digital Bulletin: who made it, when, and what
          changed. Click an entry to see the details. Times are Pacific.
          Entries are kept for 180 days.
        </p>
        <div className="mt-6">
          <AuditLogList />
        </div>
      </Section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/*
  Auth-aware nav controls. Signed in: a link to the personal calendar + log out.
  Signed out: a log in link. Renders nothing until the session is known to avoid
  a hydration flash (the server doesn't know the client's auth state).
*/
const linkClass =
  "inline-block px-3 py-2 text-lg font-semibold text-ink hover:text-blue hover:underline focus-visible:text-blue";

const STAFF_ROLES = ["employee", "admin"];

export default function AuthNav() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    // Look up the signed-in user's role to decide whether to show the
    // staff-only "Manage" link. (RLS still enforces access regardless of UI.)
    async function syncRole(userId: string | undefined) {
      if (!userId) {
        setIsStaff(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      setIsStaff(!!data && STAFF_ROLES.includes(data.role));
    }

    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      syncRole(data.session?.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
      syncRole(session?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (signedIn === null) return null;

  if (!signedIn) {
    return (
      <li>
        <Link href="/login" className={linkClass}>
          Log in
        </Link>
      </li>
    );
  }

  return (
    <>
      <li>
        <Link href="/schedule" className={linkClass}>
          My Schedule
        </Link>
      </li>
      {isStaff && (
        <li>
          <Link href="/manage" className={linkClass}>
            Manage
          </Link>
        </li>
      )}
      <li>
        <button type="button" onClick={handleLogout} className={linkClass}>
          Log out
        </button>
      </li>
    </>
  );
}

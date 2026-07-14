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
// White account links on the teal top bar (full bar height).
const linkClass =
  "flex h-full items-center px-4 text-base font-semibold text-paper hover:underline";

// The one blue corner block, Log In / Log out (full bar height, flush to edge).
const authBtnClass =
  "flex h-full items-center bg-blue px-6 text-base font-semibold text-paper hover:bg-blue/90";

const STAFF_ROLES = ["employee", "admin"];

export default function AuthNav() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Look up the signed-in user's role to decide which staff-only links to show
    // ("Manage" for staff, "Admin" for admins). RLS still enforces access.
    async function syncRole(userId: string | undefined) {
      if (!userId) {
        setIsStaff(false);
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      setIsStaff(!!data && STAFF_ROLES.includes(data.role));
      setIsAdmin(data?.role === "admin");
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
        <Link href="/login" className={authBtnClass}>
          Log In
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
      {isAdmin && (
        <li>
          <Link href="/admin" className={linkClass}>
            Admin Panel
          </Link>
        </li>
      )}
      <li>
        <button type="button" onClick={handleLogout} className={authBtnClass}>
          Log out
        </button>
      </li>
    </>
  );
}

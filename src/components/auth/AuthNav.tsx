"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

type AuthNavProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

const mobileLinkClass =
  "flex min-h-12 items-center border-l-4 border-transparent px-5 py-3 text-base font-semibold text-ink hover:border-teal hover:bg-blue/5 hover:text-blue";
const mobileAuthBtnClass =
  "flex min-h-12 w-full items-center bg-blue px-6 py-3 text-left text-base font-semibold text-paper hover:bg-blue/90";

export default function AuthNav({
  variant = "desktop",
  onNavigate,
}: AuthNavProps) {
  const router = useRouter();
  const t = useTranslations("auth");
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
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (signedIn === null) return null;

  if (!signedIn) {
    return (
      <li>
        <Link
          href="/login"
          onClick={onNavigate}
          className={variant === "mobile" ? mobileAuthBtnClass : authBtnClass}
        >
          {t("logIn")}
        </Link>
      </li>
    );
  }

  return (
    <>
      <li>
        <Link
          href="/schedule"
          onClick={onNavigate}
          className={variant === "mobile" ? mobileLinkClass : linkClass}
        >
          {t("mySchedule")}
        </Link>
      </li>
      {isStaff && (
        <li>
          <Link
            href="/manage"
            onClick={onNavigate}
            className={variant === "mobile" ? mobileLinkClass : linkClass}
          >
            {t("manage")}
          </Link>
        </li>
      )}
      {isAdmin && (
        <li>
          <Link
            href="/admin"
            onClick={onNavigate}
            className={variant === "mobile" ? mobileLinkClass : linkClass}
          >
            {t("adminPanel")}
          </Link>
        </li>
      )}
      <li>
        <button
          type="button"
          onClick={handleLogout}
          className={variant === "mobile" ? mobileAuthBtnClass : authBtnClass}
        >
          {t("logOut")}
        </button>
      </li>
    </>
  );
}

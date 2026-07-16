"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

/*
  Email + password login. On success the session is stored in cookies (browser
  client), then we send everyone to the home page (staff and clients alike).
  router.refresh() re-runs server components so the nav and protected pages
  immediately see the new session.
*/
export default function LoginForm() {
  const router = useRouter();
  const t = useTranslations("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md" noValidate>
      <label className="mt-4 block text-lg font-semibold" htmlFor="email">
        {t("email")}
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-2 w-full border-2 border-ink/30 px-4 py-3 text-lg focus:border-blue focus:outline-none"
      />

      <label className="mt-6 block text-lg font-semibold" htmlFor="password">
        {t("password")}
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-2 w-full border-2 border-ink/30 px-4 py-3 text-lg focus:border-blue focus:outline-none"
      />

      {error && (
        <p role="alert" className="mt-4 border-l-4 border-blue pl-3 text-lg">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-8 inline-block border-2 border-blue bg-blue px-6 py-3 text-lg font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-60"
      >
        {submitting ? t("signingIn") : t("signIn")}
      </button>
    </form>
  );
}

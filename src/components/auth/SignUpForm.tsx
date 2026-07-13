"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { STAFF_EMAIL_DOMAIN, isStaffEmail } from "@/lib/staffSignup";

/*
  Staff sign-up: create an account with an @smcs.org email + password. The
  domain is checked here for a clear message and enforced again in the database
  (migration 0011) so it can't be bypassed. Email confirmation is required
  (Supabase) — the account isn't active until the emailed link is clicked. New
  accounts get the powerless default role; an admin elevates them separately.
*/
const inputClass =
  "mt-2 w-full border-2 border-ink/30 px-4 py-3 text-lg focus:border-blue focus:outline-none";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isStaffEmail(email)) {
      setError(
        `Sign up is only available for SMCS staff email addresses (@${STAFF_EMAIL_DOMAIN}).`,
      );
      return;
    }
    if (password.length < 6) {
      setError("Please use a password of at least 6 characters.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // After confirming via the email link, land on the sign-in page.
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-md">
        <p className="border-l-4 border-teal bg-teal/10 py-3 pl-4 text-lg">
          Account created. We&rsquo;ve sent a confirmation link to{" "}
          <strong>{email}</strong>. Click it to activate your account, then sign
          in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block border-2 border-blue bg-blue px-6 py-3 text-lg font-semibold text-paper hover:bg-paper hover:text-blue"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md" noValidate>
      <label className="mt-4 block text-lg font-semibold" htmlFor="email">
        SMCS email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        placeholder={`name@${STAFF_EMAIL_DOMAIN}`}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />

      <label className="mt-6 block text-lg font-semibold" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
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
        {submitting ? "Creating account…" : "Create account"}
      </button>

      <p className="mt-6 text-base text-ink/70">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-blue hover:underline">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}

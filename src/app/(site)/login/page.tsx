import { Suspense } from "react";
import Link from "next/link";
import Section from "@/components/Section";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in | SMCS",
};

/*
  Public login page. After signing in, clients can reach their personal
  calendar (/schedule). LoginForm uses useSearchParams, so it's wrapped in
  Suspense per Next.js requirements.
*/
export default function LoginPage() {
  return (
    <Section title="Sign in">
      <p className="max-w-md text-lg">
        Sign in to view your personal calendar — the services and appointments
        you&rsquo;re signed up for.
      </p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p className="mt-8 max-w-md border-t border-placeholder pt-6 text-base">
        SMCS staff member?{" "}
        <Link href="/signup" className="font-semibold text-blue hover:underline">
          Create an account
        </Link>
        .
      </p>
    </Section>
  );
}

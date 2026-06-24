import { Suspense } from "react";
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
    </Section>
  );
}

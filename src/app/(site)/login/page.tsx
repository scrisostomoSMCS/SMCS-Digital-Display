import Link from "next/link";
import Section from "@/components/Section";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in | SMCS",
};

/*
  Public login page. After signing in, everyone is sent to the home page.
*/
export default function LoginPage() {
  return (
    <Section title="Sign in">
      <p className="max-w-md text-lg">
        Sign in to view your personal calendar, the services and appointments
        you&rsquo;re signed up for.
      </p>
      <LoginForm />

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

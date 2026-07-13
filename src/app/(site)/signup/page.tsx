import Section from "@/components/Section";
import SignUpForm from "@/components/auth/SignUpForm";
import { STAFF_EMAIL_DOMAIN } from "@/lib/staffSignup";

export const metadata = {
  title: "Staff sign up | SMCS",
};

/*
  Public staff registration. Only @smcs.org emails can create an account (checked
  here and enforced in the database). New accounts have no editing access until
  an administrator grants employee/admin — the domain gates registration, not
  access. This is separate from the client eligibility path.
*/
export default function SignUpPage() {
  return (
    <Section title="Staff sign up">
      <p className="max-w-md text-lg">
        Create an SMCS staff account using your{" "}
        <strong>@{STAFF_EMAIL_DOMAIN}</strong> email. You&rsquo;ll confirm it by
        email before signing in. New accounts start with{" "}
        <strong>no editing access</strong> — an administrator grants employee or
        admin access afterward.
      </p>
      <SignUpForm />
    </Section>
  );
}

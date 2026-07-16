import { getTranslations } from "next-intl/server";
import Section from "@/components/Section";
import SignUpForm from "@/components/auth/SignUpForm";
import { STAFF_EMAIL_DOMAIN } from "@/lib/staffSignup";

export const metadata = {
  title: "Staff sign up | SMCS",
};

/*
  Public staff registration. Only @smcs.org emails can create an account (checked
  here and enforced in the database). New accounts have no editing access until
  an administrator grants employee/admin, the domain gates registration, not
  access. This is separate from the client eligibility path.
*/
export default async function SignUpPage() {
  const t = await getTranslations("signup");

  return (
    <Section title={t("title")}>
      <p className="max-w-md text-lg">
        {t.rich("intro", {
          domain: STAFF_EMAIL_DOMAIN,
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      <SignUpForm />
    </Section>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Section from "@/components/Section";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in | SMCS",
};

/*
  Public login page. After signing in, everyone is sent to the home page.
*/
export default async function LoginPage() {
  const t = await getTranslations("login");

  return (
    <Section title={t("title")}>
      <p className="max-w-md text-lg">{t("intro")}</p>
      <LoginForm />

      <p className="mt-8 max-w-md border-t border-placeholder pt-6 text-base">
        {t("staffPrompt")}{" "}
        <Link href="/signup" className="font-semibold text-blue hover:underline">
          {t("createAccount")}
        </Link>
        .
      </p>
    </Section>
  );
}

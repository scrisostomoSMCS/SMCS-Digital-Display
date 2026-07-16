import { getTranslations } from "next-intl/server";

/*
  Simple institutional footer.
*/
export default async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-4 border-teal bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-base">{t("rights", { year })}</p>
        <p className="mt-2 text-base text-ink/70">{t("notice")}</p>
      </div>
    </footer>
  );
}

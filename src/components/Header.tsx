import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import AuthNav from "@/components/auth/AuthNav";
import DesktopHeaderContent from "@/components/DesktopHeaderContent";
import MobileHeader from "@/components/MobileHeader";
import LanguageChooser from "@/components/LanguageChooser";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/siteConfig";

/*
  Teal utility top bar (every page): SMCS logo on the left, contact info in the
  middle, the language chooser + auth controls on the right. Only the Log In /
  Log out button carries a blue background.
*/
export default async function Header() {
  const t = await getTranslations("header");
  const telHref = `tel:${CONTACT_PHONE.replace(/[^0-9+]/g, "")}`;

  return (
    <header className="bg-teal text-paper">
      <MobileHeader />

      <DesktopHeaderContent>
        {/* Logo sits on a white block so the blue/teal mark keeps its contrast
            against the teal bar. It links OUT to the main smcares.org site
            rather than to this site's "/", so it is a plain external anchor.
            The mobile header's "SMCS" wordmark still goes to "/". */}
        <a
          href="https://smcares.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center bg-paper px-5 py-2"
          aria-label={t("siteAria")}
        >
          <Image
            src="/smcslogo.png"
            alt={t("logo")}
            width={1468}
            height={354}
            priority
            className="h-9 w-auto"
          />
        </a>

        {/* Contact */}
        <div className="hidden flex-1 items-center justify-center gap-8 px-4 text-base font-semibold md:flex">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center gap-2 hover:underline"
          >
            <Mail size={18} strokeWidth={2} aria-hidden="true" />
            {CONTACT_EMAIL}
          </a>
          <a href={telHref} className="flex items-center gap-2 hover:underline">
            <Phone size={18} strokeWidth={2} aria-hidden="true" />
            {CONTACT_PHONE}
          </a>
        </div>

        {/* Language chooser */}
        <div className="flex items-center px-4">
          <LanguageChooser />
        </div>

        {/* Auth controls, only the Log In / Log out button is the blue corner block */}
        <ul className="flex items-stretch">
          <AuthNav />
        </ul>
      </DesktopHeaderContent>
    </header>
  );
}

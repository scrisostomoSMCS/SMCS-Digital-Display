import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import AuthNav from "@/components/auth/AuthNav";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/siteConfig";

/*
  Teal utility top bar (every page): SMCS logo in a white block, contact info,
  and the auth controls (Log in / account menu) on the right.
*/
export default function Header() {
  const telHref = `tel:${CONTACT_PHONE.replace(/[^0-9+]/g, "")}`;

  return (
    <header className="bg-teal text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2">
        {/* Logo placeholder in a white block */}
        <Link
          href="/"
          className="flex items-center bg-paper px-4 py-2 text-lg font-bold tracking-tight text-blue"
          aria-label="SMCS home"
        >
          SMCS LOGO
        </Link>

        {/* Contact */}
        <div className="hidden items-center gap-6 text-base font-semibold md:flex">
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

        {/* Auth controls (styled for the teal bar) */}
        <ul className="flex items-center gap-1">
          <AuthNav />
        </ul>
      </div>
    </header>
  );
}

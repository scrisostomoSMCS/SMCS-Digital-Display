import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import AuthNav from "@/components/auth/AuthNav";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/siteConfig";

/*
  Teal utility top bar (every page): SMCS logo on the left, contact info in the
  middle, and the auth controls on the right, only the Log In / Log out button
  carries a blue background.
*/
export default function Header() {
  const telHref = `tel:${CONTACT_PHONE.replace(/[^0-9+]/g, "")}`;

  return (
    <header className="bg-teal text-paper">
      <div className="flex items-stretch justify-between">
        {/* Logo placeholder, white text on the teal bar (no box) */}
        <Link
          href="/"
          className="flex items-center px-6 py-3 text-lg font-bold tracking-tight text-paper"
          aria-label="SMCS home"
        >
          SMCS LOGO
        </Link>

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

        {/* Auth controls, only the Log In / Log out button is the blue corner block */}
        <ul className="flex items-stretch">
          <AuthNav />
        </ul>
      </div>
    </header>
  );
}

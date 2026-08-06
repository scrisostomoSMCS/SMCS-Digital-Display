"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { SITE_NAV_LINKS } from "@/lib/siteNavigation";
import StickySubNav from "@/components/StickySubNav";

/*
  Primary page navigation, below the teal top bar on every (site) page.
  On the home page it overlays the hero image (transparent, absolutely
  positioned) so the photo shows behind the links; on every other page it's a
  solid blue bar. (Auth-aware links live in the top bar via AuthNav.)
*/
export default function NavBar() {
  const pathname = usePathname();
  const overlay = pathname === "/";
  const mainNavRef = useRef<HTMLElement>(null);
  const t = useTranslations("nav");

  return (
    <>
      <nav
        ref={mainNavRef}
        aria-label="Primary navigation"
        className={
          overlay
            ? "absolute inset-x-0 top-0 z-20 hidden text-paper md:block"
            : "hidden bg-blue text-paper lg:block"
        }
      >
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 px-4 py-1.5">
          {SITE_NAV_LINKS.map((link) => {
            const className =
              "inline-block px-4 py-2 text-lg font-semibold text-paper hover:underline";
            return (
              <li key={link.href}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {t(link.key)}
                  </a>
                ) : (
                  <Link href={link.href} className={className}>
                    {t(link.key)}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <StickySubNav mainNavRef={mainNavRef} />
    </>
  );
}

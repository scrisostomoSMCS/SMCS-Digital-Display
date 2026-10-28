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

  The staff editor (/manage) is the exception: its dark section sidebar runs
  up beside this bar, so the page renders the bar itself, inside its content
  column (`inManagePage`), and the copy in the site layout renders nothing
  there. The links then line up with the content column's left edge. The
  sidebar also takes the sticky nav's job there, so that stays off.
*/
export default function NavBar({
  inManagePage = false,
}: {
  inManagePage?: boolean;
}) {
  const pathname = usePathname();
  const overlay = pathname === "/";
  const manage = pathname === "/manage";
  const mainNavRef = useRef<HTMLElement>(null);
  const t = useTranslations("nav");

  if (manage && !inManagePage) return null;

  return (
    <>
      <nav
        ref={mainNavRef}
        aria-label="Primary navigation"
        className={
          overlay
            ? "absolute inset-x-0 top-0 z-20 hidden text-paper md:block"
            : manage
              ? // Same height as the sidebar's logo row beside it.
                "hidden min-h-manage-bar items-center bg-blue text-paper lg:flex"
              : "hidden bg-blue text-paper lg:block"
        }
      >
        <ul
          className={
            manage
              ? // Matches the content column below it (see manage/page.tsx):
                // same max width, and 2rem padding so with each link's px-4 the
                // first label starts where the page's headings do (3rem in).
                "mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-2 px-8"
              : "mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 px-4 py-1.5"
          }
        >
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
      {!manage && <StickySubNav mainNavRef={mainNavRef} />}
    </>
  );
}

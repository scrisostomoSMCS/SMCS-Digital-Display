"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SITE_NAV_LINKS } from "@/lib/siteNavigation";

type StickySubNavProps = {
  mainNavRef: RefObject<HTMLElement | null>;
};

/*
  Keeps the primary destinations available after the original navigation has
  left the viewport. IntersectionObserver avoids running work on every scroll.
*/
export default function StickySubNav({ mainNavRef }: StickySubNavProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = useTranslations("nav");
  const tHeader = useTranslations("header");

  useEffect(() => {
    const mainNav = mainNavRef.current;
    if (!mainNav) return;

    const observer = new IntersectionObserver(([entry]) => {
      const scrolledPastNav =
        !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
      setVisible(scrolledPastNav);
    });

    observer.observe(mainNav);
    return () => observer.disconnect();
  }, [mainNavRef]);

  const hiddenState = reduceMotion ? { opacity: 0 } : { opacity: 0, y: "-100%" };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          aria-label="Sticky primary navigation"
          className={`font-body fixed inset-x-0 top-0 z-50 hidden border-b-2 border-teal bg-blue text-paper ${
            pathname === "/" ? "md:block" : "lg:block"
          }`}
          initial={hiddenState}
          animate={{ opacity: 1, y: 0 }}
          exit={hiddenState}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
        >
          <div className="mx-auto flex max-w-6xl items-center px-2 sm:px-4">
            {/* Same white block as the main header: the blue/teal mark needs a
                paper background to stay legible on the blue bar. */}
            <Link
              href="/"
              aria-label={tHeader("homeAria")}
              className="hidden min-h-11 shrink-0 items-center bg-paper px-3 py-1 md:flex"
            >
              <Image
                src="/smcslogo.png"
                alt={tHeader("logo")}
                width={1468}
                height={354}
                className="h-7 w-auto"
              />
            </Link>
            <ul className="flex flex-1 flex-wrap items-center justify-center py-1">
              {SITE_NAV_LINKS.map((link) => {
                const className =
                  "flex min-h-11 items-center px-3 py-2 text-sm font-semibold text-paper hover:underline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-paper sm:text-base md:px-4";
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
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

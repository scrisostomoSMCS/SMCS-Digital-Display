"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mail, Menu, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import AuthNav from "@/components/auth/AuthNav";
import LanguageChooser from "@/components/LanguageChooser";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/siteConfig";
import { SITE_NAV_LINKS } from "@/lib/siteNavigation";

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function MobileHeader() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef(true);
  const panelId = useId();
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const tNav = useTranslations("nav");
  const tHeader = useTranslations("header");
  const telHref = `tel:${CONTACT_PHONE.replace(/[^0-9+]/g, "")}`;

  function openMenu() {
    restoreFocusRef.current = true;
    setOpen(true);
  }

  function closeMenu(restoreFocus = true) {
    restoreFocusRef.current = restoreFocus;
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        restoreFocusRef.current = true;
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (restoreFocusRef.current) trigger?.focus();
      restoreFocusRef.current = true;
    };
  }, [open]);

  const panelHidden = reduceMotion ? { opacity: 0 } : { opacity: 1, x: "-100%" };

  return (
    <div className="font-body md:hidden">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-teal px-3 py-2 text-sm font-medium text-paper">
        <a href={telHref} className="flex min-h-8 items-center gap-1.5 hover:underline">
          <Phone size={15} strokeWidth={2} aria-hidden="true" />
          {CONTACT_PHONE}
        </a>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex min-h-8 items-center gap-1.5 hover:underline"
        >
          <Mail size={15} strokeWidth={2} aria-hidden="true" />
          {CONTACT_EMAIL}
        </a>
      </div>

      <div className="relative flex h-14 items-center border-b border-placeholder bg-paper px-3 text-ink">
        <button
          ref={triggerRef}
          type="button"
          onClick={openMenu}
          aria-label={tHeader("openMenu")}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex h-11 w-11 items-center justify-center text-blue hover:bg-blue/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          <Menu size={28} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <Link
          href="/"
          aria-label={tHeader("homeAria")}
          className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold text-blue"
        >
          SMCS
        </Link>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label={tHeader("closeMenu")}
              className="fixed inset-0 z-50 bg-ink/60"
              onClick={() => closeMenu()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            />
            <motion.aside
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="fixed inset-y-0 left-0 z-[60] flex w-[min(20rem,88vw)] flex-col bg-paper text-ink"
              initial={panelHidden}
              animate={{ opacity: 1, x: 0 }}
              exit={panelHidden}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
            >
              <div className="flex min-h-16 items-center justify-between border-b-2 border-teal px-5">
                <p id={titleId} className="text-xl font-semibold text-blue">
                  SMCS
                </p>
                <button
                  type="button"
                  onClick={() => closeMenu()}
                  aria-label={tHeader("closeMenu")}
                  className="flex h-11 w-11 items-center justify-center text-blue hover:bg-blue/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  <X size={28} strokeWidth={2.25} aria-hidden="true" />
                </button>
              </div>

              <nav aria-label="Mobile navigation" className="overflow-y-auto py-3">
                <ul>
                  {SITE_NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => closeMenu(false)}
                        className="flex min-h-12 items-center border-l-4 border-transparent px-5 py-3 text-base font-semibold text-ink hover:border-teal hover:bg-blue/5 hover:text-blue"
                      >
                        {tNav(link.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
                <ul className="mt-3 border-t border-placeholder pt-3">
                  <AuthNav
                    variant="mobile"
                    onNavigate={() => closeMenu(false)}
                  />
                </ul>
                {/* Language chooser (dark text on the white menu) */}
                <div className="mt-3 border-t border-placeholder px-5 pt-4 text-ink">
                  <LanguageChooser />
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

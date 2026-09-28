"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { BED_RED } from "@/components/BedAvailabilitySlide";
import {
  BED_RESERVE_PHONE,
  FAMILY_LODGE_INTAKE_PHONE,
  formatBedDate,
} from "@/lib/bedAvailability";
import { useBedAvailability } from "@/lib/useBedAvailability";

/*
  Home-page popup of the live bed counts: a taller, more readable version of
  the wide bulletin panel (BedAvailabilitySlide), pinned to the bottom-left
  corner so it never covers the hero headline or the bulletin preview card.

  It is deliberately non-modal — the page stays scrollable and usable behind
  it — so it is a labelled region rather than a dialog, with no focus trap.
  Closing it is remembered for the browser session only: someone arriving at
  the site later still gets the counts, but clicking the X does not make it
  reappear on every hop back to the home page.
*/
const DISMISSED_KEY = "smcs:bed-popup-dismissed";

export default function BedAvailabilityPopup() {
  const t = useTranslations("home.bedPopup");
  const locale = useLocale();
  const data = useBedAvailability();
  const [dismissed, setDismissed] = useState(true); // hidden until the session check runs
  // Drives the slide-in: it starts false so the first paint is off-screen.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    setDismissed(false);
  }, []);

  const close = () => {
    setShown(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
    // Let the slide-out finish before it leaves the tree.
    setTimeout(() => setDismissed(true), 300);
  };

  // Counts arrive a moment after mount; animate in once there is something to
  // show rather than sliding in an empty card.
  const ready = !dismissed && !!data;
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setShown(true), 400);
    return () => clearTimeout(id);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready]);

  if (!ready || !data) return null;

  const asOf = formatBedDate(data.updatedAt, locale, "long");
  const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

  return (
    <aside
      role="region"
      aria-labelledby="bed-popup-title"
      className={`fixed bottom-4 left-4 z-50 flex max-h-[calc(100dvh-2rem)] w-[34rem] max-w-[calc(100vw-2rem)] flex-col overflow-y-auto rounded-2xl text-paper shadow-2xl transition-all duration-300 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      style={{ backgroundColor: BED_RED }}
    >
      <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
        <div>
          <h2 id="bed-popup-title" className="text-xl font-bold leading-tight">
            {t("title")}
          </h2>
          {asOf && (
            <p className="mt-1 text-sm text-paper/85">
              {t("asOf", { date: asOf })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t("close")}
          className="-mr-1 -mt-1 shrink-0 rounded-full p-2 text-paper/90 transition-colors hover:bg-paper/20 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      {/* One program per row, with the full wording ("5 Male beds
          available"). Everything must be readable WITHOUT scrolling, so the
          card is wide enough (34rem) for the longest line, Pathways, to sit
          beside its label, and the rows are tight. There is no inner scroll
          area; the card's own max-h/overflow is only a last resort for a very
          short phone screen, where the rows wrap instead. */}
      <ul className="divide-y divide-paper/20 px-5 pb-1">
        {data.programs.map((p) => {
          const full = p.total === 0;
          return (
            <li
              key={p.key}
              className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5"
            >
              <span className="text-base font-semibold leading-snug">
                {p.label}
              </span>
              {full ? (
                <span className="shrink-0 rounded-full bg-paper/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-paper/90">
                  {t("full")}
                </span>
              ) : (
                <span className="ml-auto text-right text-sm text-paper/90">
                  {Object.entries(p.counts).map(([k, c], i) => (
                    <span key={k} className="whitespace-nowrap">
                      {i > 0 && ", "}
                      <b className="text-lg text-paper">{c.count}</b> {c.label}
                    </span>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-1 bg-black/20 px-5 py-2.5 text-base">
        <p className="font-semibold">
          {t("reserve")}{" "}
          <a
            href={tel(BED_RESERVE_PHONE)}
            className="whitespace-nowrap font-bold underline underline-offset-2 hover:no-underline"
          >
            {BED_RESERVE_PHONE}
          </a>
        </p>
        <p className="text-sm">
          <span className="font-semibold">Family Lodge:</span>{" "}
          {t("familyLodgeNote")}{" "}
          <a
            href={tel(FAMILY_LODGE_INTAKE_PHONE)}
            className="whitespace-nowrap font-bold underline underline-offset-2 hover:no-underline"
          >
            {FAMILY_LODGE_INTAKE_PHONE}
          </a>
        </p>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { BED_RED } from "@/components/BedAvailabilitySlide";
import { shortBedLabel, useBedAvailability } from "@/lib/useBedAvailability";

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
  const ready = !dismissed && !!data?.programs;
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

  if (!ready || !data?.programs) return null;

  return (
    <aside
      role="region"
      aria-labelledby="bed-popup-title"
      className={`fixed bottom-4 left-4 z-50 flex max-h-[75vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl text-paper shadow-2xl transition-all duration-300 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      style={{ backgroundColor: BED_RED }}
    >
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div>
          <h2 id="bed-popup-title" className="text-xl font-bold leading-tight">
            {t("title")}
          </h2>
          {data.updated_at_display && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-paper/75">
              {data.updated_at_display}
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

      {/* One program per row: a single stacked column, unlike the bulletin's
          two-column panel, at roughly double its type size. Label and counts
          share a line so the whole list fits without scrolling on a laptop. */}
      <ul className="flex-1 divide-y divide-paper/20 overflow-y-auto px-5 pb-2">
        {data.programs.map((p) => {
          const full = p.total === 0;
          return (
            <li
              key={p.key}
              className="flex items-baseline justify-between gap-3 py-2.5"
            >
              <span className="text-base font-semibold leading-snug">
                {p.label}
              </span>
              {full ? (
                <span className="shrink-0 rounded-full bg-paper/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-paper/90">
                  {t("full")}
                </span>
              ) : (
                <span className="shrink-0 text-right text-sm text-paper/90">
                  {Object.entries(p.counts).map(([k, c], i) => {
                    const q = shortBedLabel(c.label);
                    return (
                      <span key={k} className="whitespace-nowrap">
                        {i > 0 && <span className="text-paper/50"> · </span>}
                        <b className="text-xl text-paper">{c.count}</b>
                        {q && ` ${q}`}
                      </span>
                    );
                  })}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {data.reserve_phone && (
        <p className="bg-black/20 px-5 py-3 text-base font-semibold">
          {t("reserve")}:{" "}
          <a
            href={`tel:${data.reserve_phone.replace(/[^\d+]/g, "")}`}
            className="whitespace-nowrap font-bold underline underline-offset-2 hover:no-underline"
          >
            {data.reserve_phone}
          </a>
        </p>
      )}
    </aside>
  );
}

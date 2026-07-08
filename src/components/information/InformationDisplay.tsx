"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PAGE_DURATION } from "@/lib/informationContent";
import ServicesOverviewPage from "./ServicesOverviewPage";
import NewArrivalsPage from "./NewArrivalsPage";
import DemographicPage from "./DemographicPage";

// The three rotating pages, in display order. Add/reorder here.
const PAGES = [ServicesOverviewPage, NewArrivalsPage, DemographicPage];

/*
  Rotation controller: auto-advances through the pages on a continuous loop
  (1 → 2 → 3 → 1 → …), each shown for PAGE_DURATION. Runs unattended — no
  clicking needed. Pages are stacked and cross-faded via opacity so the
  transition is smooth. Interval lives in one constant (PAGE_DURATION).
*/
export default function InformationDisplay() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setActive((a) => (a + 1) % PAGES.length),
      PAGE_DURATION,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-paper text-ink">
      {PAGES.map((Page, i) => (
        <div
          key={i}
          aria-hidden={i !== active}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Page />
        </div>
      ))}

      {/* Back to home for anyone who walks up and taps the screen. */}
      <Link
        href="/"
        className="absolute right-8 top-8 z-10 border-2 border-blue bg-paper px-5 py-2 text-lg font-semibold text-blue hover:bg-blue hover:text-paper"
      >
        ← Back to home
      </Link>

      {/* Page indicator dots. */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-4">
        {PAGES.map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-4 w-4 rounded-full border-2 border-blue ${
              i === active ? "bg-blue" : "bg-paper"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

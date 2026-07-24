"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/*
  Clickable, live preview of the Digital Bulletin (/information) for the home
  page hero. The bulletin only renders its kiosk layout at >= 1024px wide
  (below that it falls back to the stacked, scrolling phone layout), so the
  iframe is laid out at a fixed "wall display" size and then scaled down with a
  CSS transform to whatever width the card happens to be.

  1600x900 rather than the card's own size on purpose: it is the 16:9 shape the
  bulletin actually runs at on the signage screens, so the preview shows the
  same layout staff see there (in particular, the bed-availability panel clears
  the bilingual page title, which it does not at narrower viewports). The card
  carries the matching aspect ratio, so the whole page fits with nothing
  cropped at any screen size.

  The iframe is inert: pointer-events are off so clicks fall through to the
  wrapping link, and it is hidden from assistive tech / the tab order because
  the link already describes it.
*/
const FRAME_WIDTH = 1600;
const FRAME_HEIGHT = 900;

export default function BulletinPreviewCard() {
  const t = useTranslations("home.bulletinPreview");
  const viewportRef = useRef<HTMLDivElement>(null);
  // 0 until measured, which also keeps the unscaled iframe from flashing at
  // full size on first paint.
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setScale(width / FRAME_WIDTH);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mt-12 w-full max-w-2xl">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-paper/80">
        {t("label")}
      </p>

      <Link
        href="/information"
        aria-label={t("aria")}
        className="group block cursor-pointer rounded-2xl border-2 border-paper/70 bg-paper shadow-lg transition duration-300 hover:-translate-y-1 hover:border-teal hover:shadow-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper"
      >
        <div
          ref={viewportRef}
          className="relative aspect-video w-full overflow-hidden rounded-2xl bg-paper"
        >
          <iframe
            src="/information"
            title={t("label")}
            aria-hidden="true"
            tabIndex={-1}
            loading="lazy"
            scrolling="no"
            className="absolute left-0 top-0 origin-top-left border-0 transition-opacity duration-500"
            style={{
              width: FRAME_WIDTH,
              height: FRAME_HEIGHT,
              transform: `scale(${scale})`,
              opacity: scale > 0 ? 1 : 0,
              pointerEvents: "none",
            }}
          />

          {/* Corner badge so the card reads as clickable at a glance. */}
          <span className="absolute bottom-3 right-3 rounded-full bg-blue px-4 py-2 text-sm font-semibold text-paper shadow-md transition-colors group-hover:bg-teal">
            {t("cta")} <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";

/*
  Live preview of the Digital Bulletin (/information) for the home page hero.
  The iframe still renders /information, but the card links OUT to the main
  smcares.org site rather than to /information, so this is a plain external
  anchor (target=_blank, like the other outbound links on this page) instead of
  a next/link route change. The bulletin scales its own canvas to fit whatever
  box it is given, so the iframe simply fills the card: no fixed "wall display"
  size and no CSS transform are needed to get the signage layout at this size.

  The card carries the bulletin's 16:9 aspect ratio so the scaled canvas fills it
  edge to edge with no letterboxing. It is the focus of the hero, so it stretches
  to the full width of the hero column and is capped at max-w-6xl so it does not
  blow out on very wide screens; the bulletin re-fits itself to whatever width
  that works out to.

  The iframe is inert: pointer-events are off so clicks fall through to the
  wrapping link, and it is hidden from assistive tech / the tab order because
  the link already describes it.
*/
export default function BulletinPreviewCard() {
  const t = useTranslations("home.bulletinPreview");

  return (
    <div className="mt-8 w-full max-w-6xl">
      <a
        href="https://smcares.org"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("aria")}
        className="group block cursor-pointer rounded-2xl border-2 border-paper/70 bg-paper shadow-lg transition duration-300 hover:-translate-y-1 hover:border-teal hover:shadow-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-paper">
          <iframe
            src="/information"
            title={t("label")}
            aria-hidden="true"
            tabIndex={-1}
            loading="lazy"
            scrolling="no"
            className="absolute inset-0 h-full w-full border-0"
            style={{ pointerEvents: "none" }}
          />

          {/* Corner badge so the card reads as clickable at a glance. */}
          <span className="absolute bottom-3 right-3 rounded-full bg-blue px-4 py-2 text-sm font-semibold text-paper shadow-md transition-colors group-hover:bg-teal">
            {t("cta")} <span aria-hidden="true">→</span>
          </span>
        </div>
      </a>
    </div>
  );
}

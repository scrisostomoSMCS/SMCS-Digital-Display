"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  canvasStyle,
  fitScale,
} from "@/lib/bulletinCanvas";
import BedAvailabilitySlide from "@/components/BedAvailabilitySlide";

/*
  Shows a bulletin page exactly as the wall screen draws it, scaled down to fit
  wherever it is placed. Used by the manage page's previews.

  Why this component exists rather than a preview box per editor: a preview is
  only useful if it is the SAME rendering. It reuses the one canvas contract
  (lib/bulletinCanvas) and the same ResizeObserver + fitScale sizing that
  InformationDisplay uses, and re-draws the live bed-availability panel that
  sits on top of every slide. Without that panel a preview would hide the one
  collision slides actually have to design around (BED_PANEL_CLEARANCE).

  FONTS: the surrounding page must apply bulletinFontClass (lib/bulletinFonts).
  It cannot be applied here — next/font may only be called from a Server
  Component, and this is a client one. The manage page does it at the top of the
  editing area. Get this wrong and the preview silently renders in fallback
  fonts, wrapping text differently from the wall screen, which is precisely the
  lie this preview exists to prevent.

  Static by design: callers pass already-static page components (animate={false}
  / animate="none"), matching the rest of the manage page.
*/
export default function BulletinCanvasPreview({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // 0 until measured, so the full-size canvas never flashes before it is scaled.
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => setScale(fitScale(box.clientWidth, box.clientHeight));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={label ?? "Preview of this page as it appears on the display"}
      className="relative w-full overflow-hidden border-2 border-placeholder bg-paper"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          ...canvasStyle,
          transform: `scale(${scale})`,
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        {children}
        {/* Drawn over every slide on the live display, so it belongs in the
            preview too — this is the corner slides must keep clear. */}
        <BedAvailabilitySlide className="absolute right-5 top-5 z-20 w-[29rem]" />
      </div>
    </div>
  );
}

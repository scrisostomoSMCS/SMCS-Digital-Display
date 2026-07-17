import type { ReactNode } from "react";

/*
  Frame for a signage page. Each page picks a bold full-bleed background so the
  sections feel distinct: white, blue, or teal. Text color is set for contrast.

  Responsive height:
  - Desktop / wall display (lg+): fixed to the viewport (h-full, clipped) so the
    rotating kiosk shows exactly one screen at a time.
  - Mobile / tablet (<lg): at least one screen tall but free to grow, and it does
    NOT clip, so the whole bulletin reads as one long scrollable page with every
    card fully visible (see InformationDisplay's stacked mobile layout).
*/
type Bg = "paper" | "blue" | "teal";

const BG: Record<Bg, string> = {
  paper: "bg-paper text-ink",
  blue: "bg-blue text-paper",
  teal: "bg-teal text-ink",
};

export default function InfoPageShell({
  bg = "paper",
  children,
}: {
  bg?: Bg;
  children: ReactNode;
}) {
  return (
    <div
      className={`font-body relative flex min-h-dvh flex-col overflow-x-hidden px-4 py-8 sm:px-6 lg:h-full lg:min-h-0 lg:overflow-hidden lg:px-16 lg:py-8 ${BG[bg]}`}
    >
      {children}
    </div>
  );
}

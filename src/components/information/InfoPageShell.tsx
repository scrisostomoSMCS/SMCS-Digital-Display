import type { ReactNode } from "react";
import { slideTheme } from "@/lib/slideBackgrounds";

/*
  Frame for a signage page. Each page picks a bold full-bleed background so the
  sections feel distinct. Built-in pages name a brand background ("paper",
  "blue", "teal"); custom slides pass whatever color the employee chose, so the
  color is applied inline and the text color is derived from it for contrast
  (see lib/slideBackgrounds).

  Sizing: fills its parent exactly (h-full) and clips, so a slide is always one
  screenful and never taller. The parent is the fixed bulletin canvas (see
  lib/bulletinCanvas), so "one screenful" means the same composition at every
  output size. Breakpoints here are container queries against that canvas, NOT
  viewport media queries — inside an iframe the viewport is the iframe's own box,
  which is what used to drop the bulletin into a phone layout.
*/
export default function InfoPageShell({
  bg = "paper",
  children,
}: {
  bg?: string;
  children: ReactNode;
}) {
  const theme = slideTheme(bg);
  return (
    <div
      className="font-body relative flex h-full min-h-full flex-col overflow-x-hidden px-4 py-8 @min-[40rem]:px-6 @min-[64rem]:min-h-0 @min-[64rem]:overflow-hidden @min-[64rem]:px-16 @min-[64rem]:py-8"
      style={{ backgroundColor: theme.background, color: theme.foreground }}
    >
      {children}
    </div>
  );
}

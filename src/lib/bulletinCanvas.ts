import type { CSSProperties } from "react";

/*
  The Digital Bulletin is drawn on a fixed 1920x1080 canvas and then scaled to
  fit whatever box it is dropped into: a browser tab, the WordPress iframe, a
  Yodeck screen, or the manage page's slide preview. Fixing the canvas is what
  makes the layout resolution-independent — every slide always lays out at the
  same pixel size, so the composition is identical everywhere and only the scale
  factor changes.

  Consequence for anything rendered inside the canvas: size against the CANVAS,
  never against the viewport. Use container queries (@min-[40rem]:, @min-[64rem]:)
  in place of Tailwind's viewport breakpoints (sm:, lg:), and cqw/cqh in place of
  vw/vh. A viewport unit or media query inside a slide reintroduces the bug this
  canvas exists to prevent: the browser viewport is the iframe's box, so an
  embedded bulletin would silently fall into a layout meant for phones.
*/
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

// Applied to the canvas element itself. `container-type: size` is what lets the
// slides query the canvas (both axes, so cqh works) instead of the viewport.
export const canvasStyle: CSSProperties = {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  containerType: "size",
};

// Largest whole-canvas scale that fits inside a box, i.e. "contain". Letterboxes
// rather than crops, so no slide content is ever cut off at an odd aspect ratio.
export function fitScale(boxWidth: number, boxHeight: number): number {
  return Math.min(boxWidth / CANVAS_WIDTH, boxHeight / CANVAS_HEIGHT);
}

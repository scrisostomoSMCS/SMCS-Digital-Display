import { Playfair_Display, Poppins } from "next/font/google";

/*
  The Digital Bulletin's typography: Playfair Display SemiBold (600) for titles,
  Poppins Medium/SemiBold (500/600) for body/labels/service text. Exposed as CSS
  variables (--font-display / --font-body) that globals.css maps onto the
  .font-display / .font-body utilities, so the rest of the site keeps its own
  typography.

  Shared on purpose: these variables must be in scope for EVERY place a bulletin
  slide is drawn — the live /information route and the manage page's previews
  alike. They used to be declared inline on /information only, which left the
  editor previews rendering in fallback fonts: different glyph widths, different
  line wrapping, so a preview could fit while the wall screen clipped. Anything
  that renders a slide wraps it in bulletinFontClass.
*/
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const bulletinFontClass = `${playfair.variable} ${poppins.variable}`;

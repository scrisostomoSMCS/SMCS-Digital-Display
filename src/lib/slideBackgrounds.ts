/*
  Background color for a custom slide on the Digital Bulletin.

  Employees pick any color (see the manage page's ColorPicker), so nothing here
  may assume one of the three brand backgrounds. A slide stores a hex string;
  rows written before this feature still hold the old keys "blue" | "teal" |
  "paper", which resolve to the same colors they always painted.

  Every other color on the slide — body text, the eyebrow line, the leaf
  watermark, list markers — is DERIVED from the chosen background by WCAG
  contrast rather than hard-coded, so an employee cannot pick a color that
  leaves the wall display unreadable. The brand blue and teal are preferred
  wherever they stay legible; the derivation reproduces the exact palette the
  three original backgrounds used.
*/

export type SlideBackgroundPreset = { name: string; value: string };

const INK = "#000000";
const PAPER = "#ffffff";
const BRAND_BLUE = "#0054a4";
const BRAND_TEAL = "#00aaa6";

export const DEFAULT_SLIDE_BACKGROUND = BRAND_BLUE;

// Quick picks in the editor. The brand backgrounds the bulletin has always
// used; anything else comes from the picker's custom swatch.
export const SLIDE_BACKGROUND_PRESETS: SlideBackgroundPreset[] = [
  { name: "Blue", value: BRAND_BLUE },
  { name: "Teal", value: BRAND_TEAL },
  { name: "White", value: PAPER },
];

// Slides saved before backgrounds were free-form stored a key, not a color.
const LEGACY_KEYS: Record<string, string> = {
  blue: BRAND_BLUE,
  teal: BRAND_TEAL,
  paper: PAPER,
};

// Accepts a legacy key, "#abc", or "#aabbcc" and always returns "#rrggbb".
export function resolveSlideBackground(value: string | null | undefined): string {
  if (!value) return DEFAULT_SLIDE_BACKGROUND;
  const raw = value.trim().toLowerCase();
  const legacy = LEGACY_KEYS[raw];
  if (legacy) return legacy;
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return DEFAULT_SLIDE_BACKGROUND;
}

/* --- contrast (WCAG 2.1 relative luminance) ------------------------------ */

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Text has to read from across a lobby, so hold it near the AA large-text bar.
const TEXT_CONTRAST_MIN = 4.5;
// Leaves and list markers are decoration beside text, not the text itself; they
// only have to be clearly visible against the background.
const ACCENT_CONTRAST_MIN = 1.8;

export type SlideTheme = {
  background: string; // the slide's own color
  foreground: string; // body copy: black or white, whichever reads better
  eyebrow: string; // the "St. Mary's Community Services" line
  accent: string; // eyebrow leaf and list markers
  watermark: string; // the large rotating leaf, already carrying its alpha
};

/*
  Derive the whole slide palette from the chosen background.

  On the three original backgrounds this returns exactly what the hard-coded
  maps used to: white on blue with a teal leaf, black on teal with a blue leaf
  and a white watermark, blue-on-white with a teal leaf.
*/
export function slideTheme(background: string): SlideTheme {
  const bg = resolveSlideBackground(background);
  const foreground =
    contrastRatio(bg, INK) >= contrastRatio(bg, PAPER) ? INK : PAPER;

  // Keep the brand blue on the eyebrow where it is legible; fall back to plain
  // body color on blue-ish or dark backgrounds.
  const eyebrow =
    contrastRatio(bg, BRAND_BLUE) >= TEXT_CONTRAST_MIN ? BRAND_BLUE : foreground;

  const tealReads = contrastRatio(bg, BRAND_TEAL) >= ACCENT_CONTRAST_MIN;
  const accent = tealReads
    ? BRAND_TEAL
    : contrastRatio(bg, BRAND_BLUE) >= ACCENT_CONTRAST_MIN
      ? BRAND_BLUE
      : foreground;

  // On a teal-ish background the leaf disappears into it, so the watermark
  // becomes a soft white wash instead.
  const watermark = tealReads ? `${BRAND_TEAL}40` : `${PAPER}4d`;

  return { background: bg, foreground, eyebrow, accent, watermark };
}

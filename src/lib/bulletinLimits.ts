import type { SlideTemplate } from "./slides";

/*
  Character limits and item caps for everything that can be typed onto the
  Digital Bulletin.

  HOW THESE WERE DERIVED: each page was drawn by its real display component on
  the real 1920x1080 canvas in the real bulletin fonts, seeded with the LIVE
  content from Supabase, then one field at a time was refilled with ordinary
  sentence-case English and Spanish — the shape of copy staff actually write,
  e.g. "Community dinner tonight at 6 PM in the main hall, all welcome." The
  ceiling is the length at which something on the page starts clipping; the
  limit is that ceiling with headroom taken off.

  THREE RULES THAT AN EARLIER VERSION OF THIS FILE GOT WRONG, each of which
  produced limits smaller than text already published and rendering correctly:

  1. Test with realistic sentences, not packed wide capitals or long accented
     vocabulary. Those measure ~29px and ~23px per character against the ~21px
     of real bilingual copy, and the error compounds over a paragraph.
  2. Measure one field at a time against the rest of the page as it really is.
     Every field simultaneously at its maximum is a page that has never
     existed, and sizing for it costs roughly half of each field's capacity.
  3. Ignore clipping smaller than ~6px. The smallest body line on the canvas is
     ~28px tall, so a few pixels is trimmed padding, not a lost word.

  Fill both languages when measuring: one limit governs the English input and
  its Spanish twin, so the case to survive is both at the limit. Spanish runs
  ~15-20% longer, and on several pages it sits in a narrower column.

  SANITY FLOOR: every limit here is at or above the longest value currently
  stored in that field, with headroom. Changing one downward risks truncating
  published text — re-check against Supabase first.
*/

/* --- custom slides ------------------------------------------------------- */

export const SLIDE_LIMITS = {
  title: 120, // clips at 174
  caption: 100, // see slideBodyLimit note below on why this is not the clip point
  item: 75, // clips at 81 with 8 bullets in both languages
  maxItems: 8,
} as const;

/*
  Body copy depends on the layout: "Title + image + text" puts the paragraph in
  a half-width column beside the image, so it holds noticeably less than the
  full-width layouts. Clip points: 525 full width, 376 beside an image.
*/
export const slideBodyLimit = (template: SlideTemplate): number =>
  template === "title-image-text" ? 300 : 400;

/*
  The caption limit is the one number here NOT set by clipping. On "Image with
  caption" the image slot shrinks to make room for the caption, so the page
  keeps fitting until ~282 characters — long after the image has been squeezed
  to a sliver. At 100 the image still holds ~48% of the canvas height, which is
  the point of the template.
*/

/* --- built-in bulletin pages --------------------------------------------- */

/*
  "This Week's Services": up to 4 cards side by side.

  Measured against the densest live page ("Health Services"), where all four
  cards already carry 129-188 characters of English and up to 237 of Spanish.
  That page runs near its ceiling as it stands: one card tops out at 258 and
  all four together at 217. The description limit is set to clear the longest
  published value rather than to guarantee the all-four case — the preview is
  what catches a page where every card has been filled to the brim.

  `time` is a multi-line field (one line per meal sitting); the live value is a
  three-line schedule of 68 characters, which the previous 30-char limit would
  have cut down to a single line.
*/
export const SERVICES_LIMITS = {
  pageTitle: 55, // clips at 66
  serviceName: 36, // clips at 33 across all four cards; live longest is 25
  serviceTime: 90, // clips at 113
  serviceLocation: 24, // clips at 26
  serviceDescription: 260, // live longest 237; clips at 258 (one card) / 217 (all four)
} as const;

/*
  Featured group page: a fixed 3x2 grid of six cards that clip. Tighter than
  the services page, but it comfortably holds a schedule line — the live page
  has one on five of its six cards.
*/
export const DEMOGRAPHIC_LIMITS = {
  heading: 36, // clips at 39
  intro: 110, // clips at 130
  serviceName: 32, // clips at 33; live longest 30 ("Artículos de Maternidad y Bebé")
  serviceTime: 36, // clips at 44
  serviceDescription: 80, // clips at 93
  serviceLocation: 30, // clips at 38
  maxServices: 6, // the grid is 3 columns x 2 rows and clips beyond that
} as const;

/*
  New arrivals. The two item caps are the one pair of numbers not re-measured
  against live content — they came from a harsher method and may be
  conservative, but they cut nothing that is published (the live page has
  exactly 3 steps and 4 items). Re-measure before raising them.
*/
export const NEW_ARRIVALS_LIMITS = {
  headline: 40, // clips at 50
  intro: 180, // clips at 243
  stepsLabel: 40, // clips at 104, but it is a short uppercase label
  stepTitle: 45, // clips at 55
  stepDetail: 110, // clips at 121
  availableLabel: 40, // clips at 148, same reasoning as stepsLabel
  availableItem: 55, // clips at 66
  maxSteps: 3,
  maxAvailableNow: 4,
} as const;

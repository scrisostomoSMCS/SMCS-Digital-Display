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
  template === "event-flyer"
    ? EVENT_FLYER_LIMITS.description
    : template === "title-image-text"
      ? 300
      : 400;

// The headline limit for a template; most share SLIDE_LIMITS.title.
export const slideTitleLimit = (template: SlideTemplate): number =>
  template === "weekly-menu"
    ? WEEKLY_MENU_LIMITS.title
    : template === "event-flyer"
      ? EVENT_FLYER_LIMITS.title
      : template === "resource-card"
        ? RESOURCE_CARD_LIMITS.title
        : template === "card-grid"
          ? CARD_GRID_LIMITS.title
          : template === "weather"
            ? WEATHER_LIMITS.title
            : template === "lost-found"
              ? LOST_FOUND_TITLE_LIMIT
              : SLIDE_LIMITS.title;

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

/*
  "Weekly menu" custom slide: 7 day rows x 3 meal cells. A cell shows its
  English items on one line joined with " · " and the Spanish under them a
  step smaller, in a ~500px column with ~95px of row height — room for one
  English line (~43 characters) and one or two Spanish lines, or two short
  English lines and one Spanish.

  `cell` caps the whole cell textarea (items one per line, newlines counted),
  not each item, because the items share one flowing line on the display.
  Realistic menu text: "Scrambled eggs, toast, fruit" is 28, "Chicken
  enchiladas, rice, beans, salad" is 38. Spanish runs ~15-20% longer, which is
  why `cell` stops near one English line rather than two.
  PROVISIONAL: sized from the layout arithmetic above, not yet re-measured on
  the canvas with live menus the way the rest of this file was.
*/
export const WEEKLY_MENU_LIMITS = {
  title: 60, // a full auto-filled title is 36; the menu headline runs a step smaller
  cell: 45,
  maxItemsPerMeal: 3,
} as const;

/*
  "Event / flyer" custom slide. Measured on the canvas (in the manage preview,
  real fonts, bed panel drawn) with a two-line title, which is the worst case
  for the space below it.

  The tightest arrangement is WITH an image: the image takes the right ~40%,
  and the description sits under the when/where block in the left column at
  text-3xl English / text-2xl Spanish. There, 160 English + 190 Spanish just
  fits (3 + 4 lines); 180 + 215 clips ~30px. The limit is sized for that case
  so adding or removing an image never makes saved text too long; without an
  image the description gets its own column and larger type, and 160 + 190
  fits with room to spare.

  `location` is the one line in the block that can wrap, and a second line
  comes straight out of the description's room: 41 characters ("Dining Hall,
  545 W. Sonora Street, Room 2") already wraps in the image layout. 40 keeps it
  to one line in both languages; "Dining Hall, 545 W. Sonora St." is 30.

  The title is the shared header headline (text-7xl in 68% of the width, clear
  of the bed panel): ~30 characters a line, so 60 caps it at the two lines the
  measurements above assume. "Community Job Fair & Resource Day" is 33.
*/
export const EVENT_FLYER_LIMITS = {
  title: 60,
  description: 160, // 160 + 190 Spanish fits beside an image; 180 + 215 clips
  location: 40, // wraps at 41 beside an image
} as const;

/*
  "Contact / resource card" custom slide: up to six services in a 3 x 2 grid
  (3 in one row, 4 as 2 x 2, 5-6 as 3 x 2). Measured on the canvas with a
  two-line title and all six entries filled with realistic text near these
  limits (e.g. "Community Dining Room Breakfast", "Mon–Sun, 7:00 AM – 8:30 AM
  and 11 AM" with its Spanish), which fills the space under the header exactly.

  `phone` is the largest text in each entry and never wraps: at 16 characters
  ("209-467-0703 x12") it just fits a third of the canvas at the 56px used
  three across, where text-6xl overflowed by 13px. `title` 50 keeps the
  headline to the two lines that measurement assumed.
*/
export const RESOURCE_CARD_LIMITS = {
  title: 50,
  name: 32,
  phone: 16,
  hours: 40,
} as const;

/*
  "Grid of cards" custom slide. One set of limits for both layouts, so
  switching a slide between 2 x 2 and 3 x 2 can never leave saved text too
  long for its card; 2 x 2 uses its wider cards for larger type.

  Measured on the canvas with a two-line slide headline and every visible card
  filled: 2 x 2 and 3 x 2, at every count from 1 to 6, fill the space under the
  header exactly. `cardText` 60 is two lines of English in a 3 x 2 card
  ("Free at the clinic, 9 AM to noon. No appointment needed.") with up to two
  lines of Spanish ~15-20% longer; at 80 the English ran to three lines and
  the grid overflowed. `cardTitle` 30 is one line in most cases and two at
  worst: all six titles wrapping to two lines overflows only 3px, under the
  ~6px threshold this file ignores.
*/
export const CARD_GRID_LIMITS = {
  title: 50,
  cardTitle: 30,
  cardText: 60,
} as const;

/*
  "Weather" custom slide. The forecast is drawn from data, so only the
  headline and the staff note are typed, and both have to leave the forecast
  its room: on the canvas a two-line headline plus a two-line note pushed the
  bottom of the forecast under the note band. So each is held to one line:
  `title` 30 at text-7xl beside the bed panel ("Today's Weather" is 15), and
  `note` 80, one line of English at text-4xl across the full width, with its
  Spanish (~15-20% longer) one line at text-3xl.
*/
export const WEATHER_LIMITS = {
  title: 30,
  note: 80,
} as const;

/*
  "Lost & found" custom slide. Its items are not typed into the slide (see
  lib/lostFound, which holds their limits); only the headline is, held to one
  line so the list below keeps its rows: "Lost & Found" is the expected title.
*/
export const LOST_FOUND_TITLE_LIMIT = 30;

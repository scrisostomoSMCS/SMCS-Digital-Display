/*
  Single source of truth for the Live Calendar display settings.
  Everything an operator might want to tweak lives here so it's a one-spot
  change today and an easy target for a CMS/admin editor in a later phase.
*/

// How many day columns the week shows. This is the ONLY edit needed to switch
// the display range, e.g. 7 for the full week, or 5 (with FIRST_DAY = 1) for
// a Mon–Fri view. The grid always aligns to the start of the current week.
export const DAYS_SHOWN = 7;

// Which day the week starts on: 0 = Sunday, 1 = Monday.
export const FIRST_DAY = 0;

// Vertical time window of the week grid (24-hour clock). The grid shows only
// these hours and stretches them to fill the screen, so the whole week fits
// on one display with no scrolling. Widen/narrow this to fit your schedule.
export const DAY_START_HOUR = 8; // 8:00 AM
export const DAY_END_HOUR = 20; // 8:00 PM

// Content of the scrolling info bar at the top of the screen. Each string is
// one item in the marquee: a welcome line, the live SMCS contact details, and
// standing announcements. Kept as a single config value so making it staff-
// editable later is a one-spot change. The phone and email are duplicated in
// siteConfig.ts for the site header; update both together.
export const INFO_BAR_ITEMS: string[] = [
  "Welcome to SMCS, this week's scheduled services are shown below",
  "Phone: (209) 467-0703",
  "Email: info@smcares.org",
  "Dining Room · Open Daily",
];

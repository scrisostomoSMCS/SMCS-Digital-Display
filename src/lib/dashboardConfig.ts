/*
  Single source of truth for the Live Dashboard display settings.
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
// one item in the marquee. Kept as a single config value (placeholder contact
// info + announcements for now) so it's trivial to make editable later.
export const INFO_BAR_ITEMS: string[] = [
  "Welcome to SMCS, this week's scheduled services are shown below",
  "Phone: (555) 123-4567",
  "Email: info@smcs.example",
  "Office hours: Monday–Friday, 9:00 AM – 5:00 PM",
];

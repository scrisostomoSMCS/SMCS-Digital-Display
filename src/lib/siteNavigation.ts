/*
  Primary navigation links, shared by the desktop nav, sticky nav, and mobile
  menu. `key` maps to the "nav" section of the translation files
  (messages/<locale>.json), so labels are translated, not hardcoded here.
*/
export const SITE_NAV_LINKS = [
  { key: "home", href: "/" },
  { key: "about", href: "/#about" },
  { key: "services", href: "/#services" },
  { key: "liveCalendar", href: "/dashboard" },
  { key: "bulletin", href: "/information" },
] as const;

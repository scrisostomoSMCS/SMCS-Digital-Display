/*
  Primary navigation links, shared by the desktop nav, sticky nav, and mobile
  menu. `key` maps to the "nav" section of the translation files
  (messages/<locale>.json), so labels are translated, not hardcoded here.

  `external: true` means the href leaves this site: renderers must emit a plain
  <a target="_blank" rel="noopener noreferrer"> rather than a next/link route
  change. "Home" points at the main smcares.org site, not this site's "/" (the
  sticky nav's "SMCS" link and the mobile wordmark still go to "/").
*/
export const SITE_NAV_LINKS = [
  { key: "home", href: "https://smcares.org", external: true },
  { key: "about", href: "/#about", external: false },
  { key: "services", href: "/#services", external: false },
  { key: "liveCalendar", href: "/dashboard", external: false },
  { key: "bulletin", href: "/information", external: false },
] as const;

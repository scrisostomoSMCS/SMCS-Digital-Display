/*
  Site-wide contact details shown in the top bar (and in the mobile menu).
  These are the live SMCS values, kept in one spot so they're easy to change.
  The same phone and email also appear in the Live Calendar's scrolling info
  bar (see dashboardConfig.ts); update both together.
*/
export const CONTACT_EMAIL = "info@smcares.org";
export const CONTACT_PHONE = "(209) 467-0703";

/*
  Feature flag for the personal calendar ("My Schedule"). Set to false to hide
  the feature everywhere in the UI: the account link in the top bar and mobile
  menu (AuthNav.tsx), the admin sidebar entry (AdminSidebar.tsx), and the page
  itself, which redirects home instead of rendering ((site)/schedule/page.tsx).
  All of the underlying code stays in place, so flipping this back to true is
  the only change needed to bring the feature back.
*/
// Annotated `boolean` (not the inferred `false` literal) so flipping the value
// is genuinely a one-line change with no type errors elsewhere.
export const SHOW_MY_SCHEDULE: boolean = false;

/*
  The manage sidebar's collapsed/expanded choice, remembered per browser.

  The look is driven by an attribute on <html> rather than React state, so the
  server render and the first client render always match. On a full page load
  COLLAPSED_SIDEBAR_SCRIPT sets it while the HTML is still being parsed, before
  the first paint (manage/page.tsx renders it just ahead of the sidebar); on a
  client-side navigation the sidebar sets it in a layout effect instead. The
  root layout's <html> carries suppressHydrationWarning for this attribute.

  Lives here rather than in the sidebar because the page, a Server Component,
  needs the values, and exports from a "use client" module are not readable
  there.
*/
export const SIDEBAR_COLLAPSED_KEY = "manage-sidebar-collapsed";
export const SIDEBAR_COLLAPSED_ATTR = "data-manage-sidebar";

export const COLLAPSED_SIDEBAR_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(
  SIDEBAR_COLLAPSED_KEY,
)})==="1")document.documentElement.setAttribute(${JSON.stringify(
  SIDEBAR_COLLAPSED_ATTR,
)},"collapsed")}catch(e){}`;

// Reads the saved choice; storage blocked or unreadable counts as expanded.
export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function applySidebarCollapsed(collapsed: boolean) {
  if (collapsed) {
    document.documentElement.setAttribute(SIDEBAR_COLLAPSED_ATTR, "collapsed");
  } else {
    document.documentElement.removeAttribute(SIDEBAR_COLLAPSED_ATTR);
  }
}

export function saveSidebarCollapsed(collapsed: boolean) {
  applySidebarCollapsed(collapsed);
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Storage blocked; the choice just won't survive a reload.
  }
}

import { supabase } from "./supabase";
import {
  FIXED_BULLETIN_PAGE_KEYS,
  servicePageKey,
  type BulletinPageLocationMap,
} from "./bulletinLocations";
import type { InfoContent } from "./infoContent";
import type { Slide } from "./slides";

/*
  Which built-in slides are hidden from the rotation. Lets an employee "delete"
  a built-in slide (services / new-arrivals / demographic / events-today)
  without losing its editor, it's just removed from the display. Stored as a
  singleton row in public.display_settings.
*/
export type BuiltinKey =
  | "services"
  | "new-arrivals"
  | "demographic"
  | "events-today";

export async function fetchHiddenBuiltins(): Promise<BuiltinKey[]> {
  const { data, error } = await supabase
    .from("display_settings")
    .select("hidden_builtins")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return [];
  return (data.hidden_builtins ?? []) as BuiltinKey[];
}

export async function setHiddenBuiltins(
  hidden: BuiltinKey[],
): Promise<string | null> {
  // updated_at is stamped by the trigger in migration 0023 (see the note in
  // the info_content save route), so it is not sent from the browser.
  const { error } = await supabase
    .from("display_settings")
    .upsert({ id: 1, hidden_builtins: hidden });
  return error ? error.message : null;
}

/*
  Built-in pages staff have paused with "Hide slide" (migration 0032), by
  bulletin page key (servicePageKey(id) or a FIXED_BULLETIN_PAGE_KEYS value), so
  each services page pauses on its own. Unlike hidden_builtins above, a paused
  page keeps its place in the manage page and sidebar; it is only kept off the
  screens, and the display's never-blank fallback never brings it back.
  Custom slides pause on their own row instead (slides.is_paused, 0031).
*/
// Fired on window after a pause/unpause saves, so this tab updates without
// waiting for realtime.
export const PAUSED_PAGES_EVENT = "smcs:paused-pages-change";

// null when the read failed, which is not "nothing paused": reading it as []
// would put every paused page back on the screens. Callers keep what they have.
export async function fetchPausedPages(): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("display_settings")
    .select("paused_pages")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.warn("Paused pages unavailable:", error.message);
    return null;
  }
  return (data?.paused_pages ?? []) as string[];
}

export async function setPagePaused(
  pageKey: string,
  paused: boolean,
): Promise<string | null> {
  const current = await fetchPausedPages();
  // Writing from a failed read would un-pause every other page.
  if (current === null) return "Couldn't read the current hidden pages. Please try again.";
  const next = paused
    ? [...new Set([...current, pageKey])]
    : current.filter((key) => key !== pageKey);
  const { error } = await supabase
    .from("display_settings")
    .upsert({ id: 1, paused_pages: next });
  if (error) return error.message;
  window.dispatchEvent(new Event(PAUSED_PAGES_EVENT));
  return null;
}

/*
  Staff-chosen names for the manage page's sidebar entries, keyed by page key
  (the bulletin page keys, or customSlideNameKey). Manage-page labels only, never shown on the display.
  A missing key means the entry keeps its default name.
*/
export type SidebarNames = Record<string, string>;

export const customSlideNameKey = (id: string) => `slide:${id}`;

// Fired on window after a rename saves, so the panel headings in this tab
// update without waiting for realtime.
export const SIDEBAR_NAMES_EVENT = "smcs:sidebar-names-change";

export async function fetchSidebarNames(): Promise<SidebarNames> {
  const { data, error } = await supabase
    .from("display_settings")
    .select("sidebar_names")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return {};
  return (data.sidebar_names ?? {}) as SidebarNames;
}

// Pass an empty name to go back to the default.
export async function setSidebarName(
  key: string,
  name: string,
): Promise<string | null> {
  const next = { ...(await fetchSidebarNames()) };
  const trimmed = name.trim();
  if (trimmed) next[key] = trimmed;
  else delete next[key];
  const { error } = await supabase
    .from("display_settings")
    .upsert({ id: 1, sidebar_names: next, updated_at: new Date().toISOString() });
  if (error) return error.message;
  window.dispatchEvent(new Event(SIDEBAR_NAMES_EVENT));
  return null;
}

/*
  Does this location render none of its own configured content? True when no
  built-in page reaches it (hidden globally, or targeted at other locations
  only) AND no visible custom slide reaches it.

  Computed from the SAVED config, deliberately: the display's never-blank
  fallback (see InformationDisplay) will put the built-ins on the screen anyway
  in this state, so "what the TV is currently showing" would report the location
  as fine. It isn't — staff configured nothing for it. This is the one function
  that decides that, so the display and the manage page cannot drift apart on
  what "empty" means.
*/
function reachesLocation(
  pageKey: string,
  locationId: string,
  pageLocations: BulletinPageLocationMap,
  paused: string[],
): boolean {
  // A paused page reaches nowhere, and the display never falls back to it.
  if (paused.includes(pageKey)) return false;
  const targets = pageLocations[pageKey] ?? [];
  // No targeting rows at all = "All locations".
  return targets.length === 0 || targets.includes(locationId);
}

export function locationRotationIsEmpty({
  locationId,
  hidden,
  paused,
  pageLocations,
  slides,
  content,
}: {
  locationId: string;
  hidden: BuiltinKey[];
  paused: string[];
  pageLocations: BulletinPageLocationMap;
  slides: Slide[];
  content: InfoContent;
}): boolean {
  // Services is one key covering N numbered pages; a page with no services is
  // never rendered, so it cannot rescue the location either.
  if (
    !hidden.includes("services") &&
    content.services.pages.some(
      (page) =>
        page.services.length > 0 &&
        reachesLocation(servicePageKey(page.id), locationId, pageLocations, paused),
    )
  ) {
    return false;
  }

  const fixed: [BuiltinKey, string][] = [
    ["new-arrivals", FIXED_BULLETIN_PAGE_KEYS.newArrivals],
    ["demographic", FIXED_BULLETIN_PAGE_KEYS.demographic],
    ["events-today", FIXED_BULLETIN_PAGE_KEYS.eventsToday],
  ];
  if (
    fixed.some(
      ([key, pageKey]) =>
        !hidden.includes(key) &&
        reachesLocation(pageKey, locationId, pageLocations, paused),
    )
  ) {
    return false;
  }

  // `slides` must be the VISIBLE set (fetchSlides already drops soft-deleted
  // and paused rows); an empty locationIds means the slide shows everywhere.
  return !slides.some(
    (slide) =>
      slide.locationIds.length === 0 || slide.locationIds.includes(locationId),
  );
}

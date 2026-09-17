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
  const { error } = await supabase
    .from("display_settings")
    .upsert({ id: 1, hidden_builtins: hidden, updated_at: new Date().toISOString() });
  return error ? error.message : null;
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
): boolean {
  const targets = pageLocations[pageKey] ?? [];
  // No targeting rows at all = "All locations".
  return targets.length === 0 || targets.includes(locationId);
}

export function locationRotationIsEmpty({
  locationId,
  hidden,
  pageLocations,
  slides,
  content,
}: {
  locationId: string;
  hidden: BuiltinKey[];
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
        reachesLocation(servicePageKey(page.id), locationId, pageLocations),
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
        reachesLocation(pageKey, locationId, pageLocations),
    )
  ) {
    return false;
  }

  // `slides` must be the VISIBLE set (fetchSlides already drops soft-deleted
  // rows); an empty locationIds means the slide shows everywhere.
  return !slides.some(
    (slide) =>
      slide.locationIds.length === 0 || slide.locationIds.includes(locationId),
  );
}

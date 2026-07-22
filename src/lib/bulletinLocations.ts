import { supabase } from "./supabase";

export type BulletinLocation = {
  id: string;
  name: string;
  slug: string;
};

export const FIXED_BULLETIN_PAGE_KEYS = {
  newArrivals: "builtin:new-arrivals",
  demographic: "builtin:demographic",
  eventsToday: "builtin:events-today",
} as const;

export const servicePageKey = (id: string) => `builtin:services:${id}`;

export type BulletinPageLocationMap = Record<string, string[]>;

type LocationRow = BulletinLocation;

export async function fetchBulletinLocations(): Promise<BulletinLocation[]> {
  const { data, error } = await supabase
    .from("bulletin_locations")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    console.warn("Bulletin locations unavailable:", error.message);
    return [];
  }

  return (data ?? []) as LocationRow[];
}

export function locationSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createBulletinLocation(
  name: string,
): Promise<string | null> {
  const cleanName = name.trim();
  const slug = locationSlug(cleanName);

  if (!cleanName || !slug) return "Enter a location name using letters or numbers.";

  const { error } = await supabase
    .from("bulletin_locations")
    .insert({ name: cleanName, slug });

  if (!error) return null;
  if (error.code === "23505") return "A location with that name or URL already exists.";
  return error.message;
}

export async function deleteBulletinLocation(id: string): Promise<string | null> {
  const { error } = await supabase
    .from("bulletin_locations")
    .delete()
    .eq("id", id);

  if (!error) return null;
  if (error.code === "23503") {
    return "Remove this location from every page and slide before deleting it.";
  }
  return error.message;
}

export async function fetchBulletinLocationId(
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("bulletin_locations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.warn("Bulletin location unavailable:", error.message);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

export async function fetchBulletinPageLocations(): Promise<BulletinPageLocationMap> {
  const { data, error } = await supabase
    .from("builtin_page_locations")
    .select("page_key, location_id");
  if (error) {
    console.warn("Built-in page locations unavailable:", error.message);
    return {};
  }

  return (data ?? []).reduce<BulletinPageLocationMap>((map, row) => {
    const key = row.page_key as string;
    const locationId = row.location_id as string;
    map[key] = [...(map[key] ?? []), locationId];
    return map;
  }, {});
}

export async function setBulletinPageLocations(
  pageKey: string,
  locationIds: string[],
): Promise<string | null> {
  const desired = [...new Set(locationIds)];
  const { data, error } = await supabase
    .from("builtin_page_locations")
    .select("location_id")
    .eq("page_key", pageKey);
  if (error) return error.message;

  const current = (data ?? []).map((row) => row.location_id as string);
  const additions = desired.filter((id) => !current.includes(id));
  const removals = current.filter((id) => !desired.includes(id));

  if (additions.length > 0) {
    const { error: insertError } = await supabase
      .from("builtin_page_locations")
      .insert(additions.map((locationId) => ({ page_key: pageKey, location_id: locationId })));
    if (insertError) return insertError.message;
  }

  if (removals.length > 0) {
    const { error: deleteError } = await supabase
      .from("builtin_page_locations")
      .delete()
      .eq("page_key", pageKey)
      .in("location_id", removals);
    if (deleteError) return deleteError.message;
  }

  return null;
}

export async function deleteBulletinPageLocations(
  pageKey: string,
): Promise<string | null> {
  const { error } = await supabase
    .from("builtin_page_locations")
    .delete()
    .eq("page_key", pageKey);
  return error ? error.message : null;
}

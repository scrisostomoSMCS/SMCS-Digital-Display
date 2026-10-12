import { supabase } from "./supabase";
import {
  DEFAULT_SLIDE_BACKGROUND,
  resolveSlideBackground,
} from "./slideBackgrounds";
import { parseMenu, type WeeklyMenu } from "./weeklyMenu";

/*
  Custom slides for the /information display. Data-driven: the public display
  reads them, employees create/edit/delete them from the manage page. Each slide
  picks one of a few on-brand LAYOUT TEMPLATES; employees supply content only.
  Images live in Supabase Storage (bucket "slide-images"); the slide stores the
  object path, not the file.
*/

export type SlideTemplate =
  | "title-body" // big title + paragraph
  | "title-image-text" // title + image + paragraph
  | "image-focus" // large image + short caption
  | "title-list" // title + list of items
  | "weekly-menu" // title + a week of Breakfast / Lunch / Dinner (see lib/weeklyMenu)
  | "event-flyer" // title + when/where block + optional image (see lib/eventFlyer)
  | "resource-card" // title + 3-6 services with icon, phone, hours (see lib/resourceCard)
  | "card-grid" // title + 2x2 or 3x2 short announcement cards (see lib/cardGrid)
  | "weather" // title + automatic Stockton forecast + staff note (see lib/weather)
  | "lost-found"; // title + found items, behind SHOW_LOST_FOUND (see lib/lostFound)

export const SLIDE_TEMPLATES: { key: SlideTemplate; label: string; hint: string }[] =
  [
    { key: "title-body", label: "Title + text", hint: "A headline and a paragraph." },
    {
      key: "title-image-text",
      label: "Title + image + text",
      hint: "Headline, an image, and a paragraph.",
    },
    {
      key: "image-focus",
      label: "Image with caption",
      hint: "A large image and a short caption.",
    },
    { key: "title-list", label: "Title + list", hint: "A headline and a bullet list." },
    {
      key: "weekly-menu",
      label: "Weekly menu",
      hint: "Breakfast, lunch, and dinner for Monday to Sunday.",
    },
    {
      key: "event-flyer",
      label: "Event / flyer",
      hint: "One event: date, time, place, and an optional image.",
    },
    {
      key: "resource-card",
      label: "Contact / resource card",
      hint: "3 to 6 services, each with an icon, phone number, and hours.",
    },
    {
      key: "card-grid",
      label: "Grid of cards",
      hint: "4 or 6 short announcements, each a title and a line or two.",
    },
    {
      key: "weather",
      label: "Weather",
      hint: "Automatic Stockton forecast, plus a note from staff.",
    },
    {
      key: "lost-found",
      label: "Lost & found",
      hint: "Found items and the date found. Items come down on their own.",
    },
  ];

/*
  A slide's background is a free-form color the employee picks. It is a hex
  string ("#0054a4"); rows written before the picker existed still hold the keys
  "blue" | "teal" | "paper". Always read it through resolveSlideBackground (or
  slideTheme) in lib/slideBackgrounds rather than comparing the raw value.
*/
export type SlideBackground = string;

/*
  Every text field has an English value and a Spanish counterpart (…Es). The
  Digital Bulletin renders both together; the editor collects both. Spanish
  fields may be empty (the display then just shows English).
*/
export type Slide = {
  id: string;
  template: SlideTemplate;
  background: SlideBackground;
  title: string;
  titleEs: string;
  body: string;
  bodyEs: string;
  items: string[];
  itemsEs: string[];
  caption: string;
  captionEs: string;
  imagePath: string | null;
  // "Weekly menu" content; null for every other template (and for rows written
  // before migration 0025). Always a complete grid when present — see parseMenu.
  menu: WeeklyMenu | null;
  /*
    Structured content for the templates added after the weekly menu (migration
    0027), raw as stored. Its shape depends on `template`, so it is parsed where
    it is used, by that template's own module (e.g. parseEventFlyer), which
    reads anything malformed as empty. null for the older templates.
  */
  content: unknown;
  position: number;
  hidden: boolean; // soft-deleted (recoverable), not shown on the display
  locationIds: string[]; // empty = shown at every bulletin location
  /*
    When this slide's CONTENT last changed, stamped by the database (migration
    0023). Only the manage page shows it. null for slides last written before
    that migration, which have no real history to report. Reordering, soft
    deleting, and changing display locations deliberately do not move it.
  */
  updatedAt: string | null;
};

export type SlideInput = {
  template: SlideTemplate;
  background: SlideBackground;
  title: string;
  titleEs: string;
  body: string;
  bodyEs: string;
  items: string[];
  itemsEs: string[];
  caption: string;
  captionEs: string;
  imagePath: string | null;
  menu: WeeklyMenu | null;
  content: unknown;
  locationIds: string[];
};

type SlideRow = {
  id: string;
  template: string | null;
  background: string | null;
  title: string;
  title_es: string | null;
  body: string | null;
  body_es: string | null;
  items: unknown;
  items_es: unknown;
  caption: string | null;
  caption_es: string | null;
  image_path: string | null;
  menu: unknown;
  content: unknown;
  position: number;
  hidden: boolean | null;
  updated_at: string | null;
  slide_locations: { location_id: string }[] | null;
};

// "mail-call" was this template's key while it also listed names (before
// migration 0029); a slide saved then opens as the lost & found it now is.
const templateOf = (t: string | null): SlideTemplate =>
  t === "mail-call" ? "lost-found" : ((t as SlideTemplate | null) ?? "title-body");

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? (v as string[]) : [];

function fromRow(r: SlideRow): Slide {
  return {
    id: r.id,
    template: templateOf(r.template),
    background: r.background ?? DEFAULT_SLIDE_BACKGROUND,
    title: r.title,
    titleEs: r.title_es ?? "",
    body: r.body ?? "",
    bodyEs: r.body_es ?? "",
    items: asStringArray(r.items),
    itemsEs: asStringArray(r.items_es),
    caption: r.caption ?? "",
    captionEs: r.caption_es ?? "",
    imagePath: r.image_path,
    menu: r.menu == null ? null : parseMenu(r.menu),
    content: r.content ?? null,
    position: r.position,
    hidden: r.hidden ?? false,
    updatedAt: r.updated_at,
    locationIds: (r.slide_locations ?? []).map((x) => x.location_id),
  };
}

const COLUMNS =
  "id, template, background, title, title_es, body, body_es, items, items_es, caption, caption_es, image_path, menu, content, position, hidden, updated_at, slide_locations(location_id)";

// Visible slides (shown on the display and as normal sidebar entries).
// An unreadable table reads as no slides; see fetchSlidesOrNull for callers
// that must tell the two apart.
export async function fetchSlides(locationSlug?: string): Promise<Slide[]> {
  return (await fetchSlidesOrNull(locationSlug)) ?? [];
}

/*
  Same as fetchSlides, but null when the read failed. null is not "no slides":
  the wall display keeps the slides it already has on null (last known good,
  the same rule as the bed counts) instead of dropping every custom slide from
  the rotation until the next successful poll.
*/
export async function fetchSlidesOrNull(locationSlug?: string): Promise<Slide[] | null> {
  const { data, error } = await supabase
    .from("slides")
    .select(COLUMNS)
    .eq("hidden", false)
    .order("position", { ascending: true });
  if (error) {
    console.warn("Slides unavailable:", error.message);
    return null;
  }
  const slides = (data ?? []).map((r) => fromRow(r as SlideRow));
  if (!locationSlug) return slides;

  const { data: location, error: locationError } = await supabase
    .from("bulletin_locations")
    .select("id")
    .eq("slug", locationSlug)
    .maybeSingle();

  if (locationError) {
    console.warn("Bulletin location unavailable:", locationError.message);
  }

  const locationId = location?.id as string | undefined;
  return slides.filter(
    (slide) =>
      slide.locationIds.length === 0 ||
      (locationId !== undefined && slide.locationIds.includes(locationId)),
  );
}

// Soft-deleted slides (for the "Recently deleted" recovery list).
export async function fetchDeletedSlides(): Promise<Slide[]> {
  const { data, error } = await supabase
    .from("slides")
    .select(COLUMNS)
    .eq("hidden", true)
    .order("position", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => fromRow(r as SlideRow));
}

/*
  Every slide write asks PostgREST to return the ids it touched. Without that,
  a write RLS filtered out (or one aimed at a slide that is already gone)
  "succeeds" with no error while changing nothing, and staff never find out.
*/
const NO_ROWS =
  "You don't have permission to change this slide, or it no longer exists.";

// Fired on window after a slide write succeeds, so the manage page reloads in
// this tab without waiting for realtime (same pattern as SIDEBAR_NAMES_EVENT).
export const SLIDES_CHANGED_EVENT = "smcs:slides-changed";
const slidesChanged = () => window.dispatchEvent(new Event(SLIDES_CHANGED_EVENT));

// Soft-delete (hidden=true) or restore (false).
export async function setSlideHidden(
  id: string,
  hidden: boolean,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("slides")
    .update({ hidden })
    .eq("id", id)
    .select("id");
  if (error) return error.message;
  if (!data?.length) return NO_ROWS;
  slidesChanged();
  return null;
}

function toRow(input: SlideInput) {
  return {
    template: input.template,
    // Normalized on the way in so the column only ever gains hex values; the
    // legacy keys already in the table keep working through fromRow.
    background: resolveSlideBackground(input.background),
    title: input.title,
    title_es: input.titleEs,
    body: input.body,
    body_es: input.bodyEs,
    items: input.items,
    items_es: input.itemsEs,
    caption: input.caption,
    caption_es: input.captionEs,
    image_path: input.imagePath,
    menu: input.menu,
    content: input.content ?? null,
  };
}

async function setSlideLocations(
  slideId: string,
  locationIds: string[],
): Promise<string | null> {
  const desired = [...new Set(locationIds)];
  const { data, error } = await supabase
    .from("slide_locations")
    .select("location_id")
    .eq("slide_id", slideId);
  if (error) return error.message;

  const current = (data ?? []).map((row) => row.location_id as string);
  const additions = desired.filter((id) => !current.includes(id));
  const removals = current.filter((id) => !desired.includes(id));

  // Add first so changing a targeted slide never briefly makes it global.
  if (additions.length > 0) {
    const { error: insertError } = await supabase
      .from("slide_locations")
      .insert(additions.map((locationId) => ({ slide_id: slideId, location_id: locationId })));
    if (insertError) return insertError.message;
  }

  if (removals.length > 0) {
    const { error: deleteError } = await supabase
      .from("slide_locations")
      .delete()
      .eq("slide_id", slideId)
      .in("location_id", removals);
    if (deleteError) return deleteError.message;
  }

  return null;
}

// New slides go to the end of the rotation.
export async function createSlide(
  input: SlideInput,
): Promise<{ id: string | null; error: string | null }> {
  const { data: last } = await supabase
    .from("slides")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("slides")
    .insert({ ...toRow(input), position })
    .select("id")
    .single();
  if (error) return { id: null, error: error.message };
  const id = data.id as string;
  const locationError = await setSlideLocations(id, input.locationIds);
  slidesChanged();
  return { id, error: locationError };
}

export async function updateSlide(
  id: string,
  input: SlideInput,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("slides")
    .update(toRow(input))
    .eq("id", id)
    .select("id");
  if (error) return error.message;
  if (!data?.length) return NO_ROWS;
  const locationError = await setSlideLocations(id, input.locationIds);
  slidesChanged();
  return locationError;
}

export async function deleteSlide(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("slides")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return error.message;
  if (!data?.length) return NO_ROWS;
  slidesChanged();
  return null;
}

export async function swapSlidePositions(a: Slide, b: Slide): Promise<void> {
  await supabase.from("slides").update({ position: b.position }).eq("id", a.id);
  await supabase.from("slides").update({ position: a.position }).eq("id", b.id);
}

// Persist an explicit order (used after drag-reorder): position = index.
export async function persistSlideOrder(
  orderedIds: string[],
): Promise<string | null> {
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("slides").update({ position: i }).eq("id", id).select("id"),
    ),
  );
  const failed = results.find((r) => r.error || !r.data?.length);
  if (failed) return failed.error?.message ?? NO_ROWS;
  slidesChanged();
  return null;
}

/*
  Fill in Spanish for whatever English changed since `loaded` (the last saved
  state), server-side through /api/slides/translate — see
  translateSlide.server.ts for the rules. Never fails a save: if the route
  cannot be reached, the input comes back unchanged with a warning, and the
  caller saves English with Spanish as typed.
*/
export async function translateSlide(
  loaded: SlideInput,
  input: SlideInput,
): Promise<{ input: SlideInput; warnings: string[] }> {
  const unavailable = (why: string) => ({
    input,
    warnings: [
      `Auto-translate unavailable (${why}): saved with Spanish as typed; you may want to check it by hand.`,
    ],
  });
  try {
    const res = await fetch("/api/slides/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loaded, input }),
    });
    const json = (await res.json().catch(() => null)) as
      | { input?: SlideInput; warnings?: string[]; error?: string }
      | null;
    if (!res.ok || !json?.input) return unavailable(json?.error ?? `HTTP ${res.status}`);
    return { input: json.input, warnings: json.warnings ?? [] };
  } catch (err) {
    return unavailable(err instanceof Error ? err.message : "network error");
  }
}

/* --- images (Supabase Storage: bucket "slide-images") -------------------- */

// Upload an image and return its storage path (stored on the slide).
export async function uploadSlideImage(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("slide-images")
    .upload(path, file, { upsert: false });
  if (error) {
    console.error("Image upload failed:", error.message);
    return null;
  }
  return path;
}

// Public URL for a stored image path.
export function slideImageUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from("slide-images").getPublicUrl(path).data.publicUrl;
}

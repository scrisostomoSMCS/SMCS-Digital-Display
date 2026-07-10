import { supabase } from "./supabase";

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
  | "title-list"; // title + list of items

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
  ];

export type SlideBackground = "blue" | "teal" | "paper";

export const SLIDE_BACKGROUNDS: { key: SlideBackground; label: string }[] = [
  { key: "blue", label: "Blue" },
  { key: "teal", label: "Teal" },
  { key: "paper", label: "White" },
];

export type Slide = {
  id: string;
  template: SlideTemplate;
  background: SlideBackground;
  title: string;
  body: string;
  items: string[];
  caption: string;
  imagePath: string | null;
  position: number;
  hidden: boolean; // soft-deleted (recoverable), not shown on the display
};

export type SlideInput = {
  template: SlideTemplate;
  background: SlideBackground;
  title: string;
  body: string;
  items: string[];
  caption: string;
  imagePath: string | null;
};

type SlideRow = {
  id: string;
  template: string | null;
  background: string | null;
  title: string;
  body: string | null;
  items: unknown;
  caption: string | null;
  image_path: string | null;
  position: number;
  hidden: boolean | null;
};

function fromRow(r: SlideRow): Slide {
  return {
    id: r.id,
    template: (r.template as SlideTemplate) ?? "title-body",
    background: (r.background as SlideBackground) ?? "blue",
    title: r.title,
    body: r.body ?? "",
    items: Array.isArray(r.items) ? (r.items as string[]) : [],
    caption: r.caption ?? "",
    imagePath: r.image_path,
    position: r.position,
    hidden: r.hidden ?? false,
  };
}

const COLUMNS =
  "id, template, background, title, body, items, caption, image_path, position, hidden";

// Visible slides (shown on the display and as normal sidebar entries).
export async function fetchSlides(): Promise<Slide[]> {
  const { data, error } = await supabase
    .from("slides")
    .select(COLUMNS)
    .eq("hidden", false)
    .order("position", { ascending: true });
  if (error) {
    console.warn("Slides unavailable:", error.message);
    return [];
  }
  return (data ?? []).map((r) => fromRow(r as SlideRow));
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

// Soft-delete (hidden=true) or restore (false).
export async function setSlideHidden(
  id: string,
  hidden: boolean,
): Promise<string | null> {
  const { error } = await supabase.from("slides").update({ hidden }).eq("id", id);
  return error ? error.message : null;
}

function toRow(input: SlideInput) {
  return {
    template: input.template,
    background: input.background,
    title: input.title,
    body: input.body,
    items: input.items,
    caption: input.caption,
    image_path: input.imagePath,
  };
}

// New slides go to the end of the rotation.
export async function createSlide(input: SlideInput): Promise<string | null> {
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
  if (error) {
    console.error("Create slide failed:", error.message);
    return null;
  }
  return data.id as string;
}

export async function updateSlide(
  id: string,
  input: SlideInput,
): Promise<string | null> {
  const { error } = await supabase.from("slides").update(toRow(input)).eq("id", id);
  return error ? error.message : null;
}

export async function deleteSlide(id: string): Promise<string | null> {
  const { error } = await supabase.from("slides").delete().eq("id", id);
  return error ? error.message : null;
}

export async function swapSlidePositions(a: Slide, b: Slide): Promise<void> {
  await supabase.from("slides").update({ position: b.position }).eq("id", a.id);
  await supabase.from("slides").update({ position: a.position }).eq("id", b.id);
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

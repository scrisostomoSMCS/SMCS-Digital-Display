import { supabase } from "./supabase";

/*
  Custom slides for the /information display. Data-driven: the public display
  reads them, employees create/edit/delete them from the manage page. A slide is
  a plain Title + optional message + optional list of bullet items — styling is
  applied automatically so the rotation stays cohesive.
*/
export type Slide = {
  id: string;
  title: string;
  body: string;
  items: string[];
  position: number;
};

export type SlideInput = {
  title: string;
  body: string;
  items: string[];
};

type SlideRow = {
  id: string;
  title: string;
  body: string | null;
  items: unknown;
  position: number;
};

function fromRow(r: SlideRow): Slide {
  return {
    id: r.id,
    title: r.title,
    body: r.body ?? "",
    items: Array.isArray(r.items) ? (r.items as string[]) : [],
    position: r.position,
  };
}

export async function fetchSlides(): Promise<Slide[]> {
  const { data, error } = await supabase
    .from("slides")
    .select("id, title, body, items, position")
    .order("position", { ascending: true });
  if (error) {
    console.warn("Slides unavailable:", error.message);
    return [];
  }
  return (data ?? []).map((r) => fromRow(r as SlideRow));
}

// New slides go to the end of the rotation (next position after the max).
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
    .insert({ title: input.title, body: input.body, items: input.items, position })
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
  const { error } = await supabase
    .from("slides")
    .update({ title: input.title, body: input.body, items: input.items })
    .eq("id", id);
  return error ? error.message : null;
}

export async function deleteSlide(id: string): Promise<string | null> {
  const { error } = await supabase.from("slides").delete().eq("id", id);
  return error ? error.message : null;
}

// Reorder by swapping two slides' position values.
export async function swapSlidePositions(a: Slide, b: Slide): Promise<void> {
  await supabase.from("slides").update({ position: b.position }).eq("id", a.id);
  await supabase.from("slides").update({ position: a.position }).eq("id", b.id);
}

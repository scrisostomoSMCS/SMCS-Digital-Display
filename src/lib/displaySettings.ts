import { supabase } from "./supabase";

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

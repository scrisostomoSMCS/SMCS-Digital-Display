import { supabase } from "./supabase";

/*
  "Lost & found" items for the Digital Bulletin, stored in
  public.lost_found_items (migrations 0028 + 0029) — NOT in the slide itself,
  because the slides table is readable forever while these must come down on
  their own. Behind SHOW_LOST_FOUND (lib/siteConfig).

  Each item is what was found, when, and which building has it. Nothing about
  a person: there is no name field anywhere, in the form or the table.
    * Every item expires (EXPIRY_CHOICES, at most 30 days). RLS hides expired
      rows from every reader; the display also re-checks the time itself.
    * Every item belongs to one bulletin location and only shows on that
      location's screens (?location=). A bulletin without a location — the
      plain /information URL, embedded on the public website — shows none.
    * The item text is free text, so the editor asks staff to describe the
      thing only (no owner's name or ID details).
*/

export type LostFoundItem = {
  id: string;
  item: string;
  itemEs: string;
  foundOn: string; // "YYYY-MM-DD"
  locationId: string;
  expiresAt: string;
  createdAt: string;
};

export const LOST_FOUND_LIMITS = { item: 50, itemEs: 80 } as const;

// How long an item stays up, in days. The database caps it at 30.
export const EXPIRY_CHOICES = [7, 14, 30] as const;
export const DEFAULT_EXPIRY_DAYS = 14;

// Items one slide shows (2 columns x 5 rows); the rest are summed up as
// "and N more — ask at the front desk".
export const MAX_LOST_ITEMS = 10;

/* --- reading ---------------------------------------------------------------- */

type Row = {
  id: string;
  item: string | null;
  item_es: string | null;
  found_on: string | null;
  location_id: string;
  expires_at: string;
  created_at: string;
};

const COLUMNS = "id, item, item_es, found_on, location_id, expires_at, created_at";

// Rows are re-checked, not trusted: one missing its item or date is dropped.
function fromRow(r: Row): LostFoundItem | null {
  if (!r.item?.trim() || !r.found_on) return null;
  return {
    id: r.id,
    item: r.item.trim(),
    itemEs: (r.item_es ?? "").trim(),
    foundOn: r.found_on,
    locationId: r.location_id,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  };
}

// Live items, or null when the read failed (callers keep what they have).
export async function fetchLostFoundItems(): Promise<LostFoundItem[] | null> {
  const { data, error } = await supabase
    .from("lost_found_items")
    .select(COLUMNS)
    .gt("expires_at", new Date().toISOString())
    .order("found_on", { ascending: false });
  if (error) {
    console.warn("Lost & found unavailable:", error.message);
    return null;
  }
  return (data as Row[]).map(fromRow).filter((e): e is LostFoundItem => e !== null);
}

/*
  Items to draw right now: live and in scope, newest find first. `scope` is a
  location id on a wall screen, or "all" in the manage-page preview, which has
  no location of its own. A wall screen with no location never calls this.
  Expiry is re-checked against the clock so an item leaves on time even
  between database reads.
*/
export function itemsFor(
  items: LostFoundItem[],
  scope: string | "all",
  now = Date.now(),
): LostFoundItem[] {
  return items
    .filter((e) => Date.parse(e.expiresAt) > now && (scope === "all" || e.locationId === scope))
    .sort((a, b) => b.foundOn.localeCompare(a.foundOn));
}

// "10/3" for a found date (no year: items live at most 30 days).
export function shortDate(ymd: string): string {
  const m = ymd.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[1])}/${Number(m[2])}` : "";
}

/* --- writing (staff; RLS is the real guard) -------------------------------- */

// From the staff laptop's clock; the database allows a day of slack on its
// 30-day cap for a clock that runs fast.
const expiryFrom = (days: number) =>
  new Date(Date.now() + Math.min(days, 30) * 86_400_000).toISOString();

export async function addLostItem(
  item: string,
  itemEs: string,
  foundOn: string,
  locationId: string,
  days: number,
): Promise<string | null> {
  const { error } = await supabase.from("lost_found_items").insert({
    item: item.trim().slice(0, LOST_FOUND_LIMITS.item),
    item_es: itemEs.trim().slice(0, LOST_FOUND_LIMITS.itemEs),
    found_on: foundOn,
    location_id: locationId,
    expires_at: expiryFrom(days),
  });
  return error ? error.message : null;
}

export async function deleteLostItem(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("lost_found_items")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return error.message;
  if (!data?.length) return "That item was already removed or has expired.";
  return null;
}

// Removes expired rows for good (they are already invisible). Best effort.
export async function purgeExpiredLostFound(): Promise<void> {
  const { error } = await supabase.rpc("purge_expired_lost_found");
  if (error) console.warn("Lost & found purge failed:", error.message);
}

/*
  Spanish for an item, via /api/translate. Never throws: on any failure it
  returns "" with a warning and the item saves in English only.
*/
export async function translateItem(item: string): Promise<{ es: string; warning: string | null }> {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [item] }),
    });
    const json = (await res.json().catch(() => null)) as
      | { results?: ({ ok: true; text: string } | { ok: false; error: string })[] }
      | null;
    const r = json?.results?.[0];
    if (res.ok && r?.ok) return { es: r.text, warning: null };
    return { es: "", warning: "Auto-translate failed; the item was added in English only." };
  } catch {
    return { es: "", warning: "Auto-translate unavailable; the item was added in English only." };
  }
}

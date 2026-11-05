import type { AuditLog } from "./auditLogs";

/*
  The colored "Action" pill on the Logs table, derived in the browser from an
  entry's summary, table and action. There is no action-type column.

  !!! This mapping depends on the exact summary wording written by
  !!! audit_describe() in supabase/migrations/0034_audit_logs.sql. Changing or
  !!! adding a summary there means checking the rules below. A summary that no
  !!! rule matches still gets a pill, from the plain insert/update/delete
  !!! fallback at the bottom, so a wording change degrades rather than breaks.

  Colors, all WCAG AA on the white page (text contrast in brackets):
    blue  created / added        white on blue  (7.5:1)
    red   deleted / removed      white on red   (6.2:1)
    amber hidden, shown, restored, moved, reordered, targeting
                                 white on amber (5.0:1)
    gray  edited / updated       black on a light gray tint (~16:1)
    teal  bed counts from a LABELED automation (summary says "automatically")
                                 black on teal  (7.3:1); white would fail
  "Direct database edit" bed changes are a person, so they get the gray pill.
*/

export type PillTone = "blue" | "red" | "amber" | "gray" | "teal";
export type ActionPill = { label: string; tone: PillTone };

export const PILL_TONE_CLASS: Record<PillTone, string> = {
  blue: "bg-blue text-paper",
  red: "bg-red text-paper",
  amber: "bg-amber text-paper",
  gray: "bg-ink/10 text-ink",
  teal: "bg-teal text-ink",
};

// What kind of record an entry is about, from the table it was written for.
const NOUN: Record<string, string> = {
  slides: "Slide",
  slide_locations: "Slide",
  info_content: "Page",
  display_settings: "Page",
  builtin_page_locations: "Page",
  bulletin_locations: "Location",
  events: "Event",
  screens: "Screen",
  lost_found_items: "Item",
  announcements: "Announcement",
  bed_availability: "Bed count",
};

type Rule = [RegExp, (noun: string) => ActionPill];

// First match wins, so the specific rules sit above the general verbs.
const RULES: Rule[] = [
  // Bed counts: the teal one is only for labeled automations.
  [/^Bed count updated automatically/, () => ({ label: "Bed count (auto)", tone: "teal" })],
  [/^Bed count updated/, () => ({ label: "Bed count updated", tone: "gray" })],

  // Announcements.
  [/^Pushed announcement/, () => ({ label: "Announcement pushed", tone: "blue" })],
  [/^Ended announcement/, () => ({ label: "Announcement ended", tone: "amber" })],

  // Slide images.
  [/^Added image to/, () => ({ label: "Image added", tone: "blue" })],
  [/^Removed image from/, () => ({ label: "Image removed", tone: "red" })],
  [/^Replaced image/, () => ({ label: "Image replaced", tone: "gray" })],

  // Location targeting of slides and built-in pages.
  [
    /^(Added|Removed) .+ the locations for|^Changed the locations/,
    () => ({ label: "Locations changed", tone: "amber" }),
  ],

  // Visibility, order, and moves.
  [/^Hid /, (n) => ({ label: `${n} hidden`, tone: "amber" })],
  [/^Showed /, (n) => ({ label: `${n} shown`, tone: "amber" })],
  [/^Restored /, (n) => ({ label: `${n} restored`, tone: "amber" })],
  [/^Reordered/, (n) => ({ label: `${n}s reordered`, tone: "amber" })],
  [/^Moved event/, () => ({ label: "Event moved", tone: "amber" })],
  [/^Moved screen/, () => ({ label: "Screen moved", tone: "amber" })],
  [/^(Put|Took) .+Live Calendar/, () => ({ label: "Live Calendar", tone: "amber" })],

  // Deletions.
  [/^Permanently deleted/, (n) => ({ label: `${n} deleted forever`, tone: "red" })],
  [/^Deleted /, (n) => ({ label: `${n} deleted`, tone: "red" })],
  [/^Removed /, (n) => ({ label: `${n} removed`, tone: "red" })],

  // Creations.
  [/^(Added|Saved) /, (n) => ({ label: `${n} added`, tone: "blue" })],

  // Edits.
  [/^Updated weekly menu/, () => ({ label: "Menu updated", tone: "gray" })],
  [/^Updated Spanish/, () => ({ label: "Spanish updated", tone: "gray" })],
  [/^Turned weather/, () => ({ label: "Weather changed", tone: "gray" })],
  [/in the manage sidebar$/, () => ({ label: "Sidebar renamed", tone: "gray" })],
  [/^Renamed /, (n) => ({ label: `${n} renamed`, tone: "gray" })],
  [/^Edited /, (n) => ({ label: `${n} edited`, tone: "gray" })],
  [/^Updated /, (n) => ({ label: `${n} updated`, tone: "gray" })],
];

const FALLBACK: Record<AuditLog["action"], PillTone> = {
  insert: "blue",
  delete: "red",
  update: "gray",
};
const FALLBACK_VERB: Record<AuditLog["action"], string> = {
  insert: "added",
  delete: "deleted",
  update: "edited",
};

export function actionPill(log: Pick<AuditLog, "summary" | "tableName" | "action">): ActionPill {
  // A combined entry ("A; B") is labeled by its first part.
  const first = log.summary.split("; ")[0];
  const noun = NOUN[log.tableName] ?? "Record";
  for (const [pattern, make] of RULES) {
    if (pattern.test(first)) return make(noun);
  }
  return { label: `${noun} ${FALLBACK_VERB[log.action]}`, tone: FALLBACK[log.action] };
}

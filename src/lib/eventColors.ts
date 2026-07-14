/*
  Palette an employee can pick from when coloring a calendar event. Colors are
  dark enough for the white event text to stay legible, and distinct from each
  other so overlapping events on the Live Calendar are easy to tell apart.
  Blue and teal lead (the brand colors); the rest are accents for separation.
*/
export type EventColor = { name: string; value: string };

export const DEFAULT_EVENT_COLOR = "#0054a4";

export const EVENT_COLORS: EventColor[] = [
  { name: "Blue", value: "#0054a4" },
  { name: "Teal", value: "#00838f" },
  { name: "Green", value: "#2e7d32" },
  { name: "Purple", value: "#6a1b9a" },
  { name: "Magenta", value: "#ad1457" },
  { name: "Red", value: "#c62828" },
  { name: "Orange", value: "#e65100" },
  { name: "Slate", value: "#455a64" },
];

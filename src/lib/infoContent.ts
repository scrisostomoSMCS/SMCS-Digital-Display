import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed,
  BedDouble,
  Droplets,
  Stethoscope,
  Users,
  Shirt,
  Apple,
  Baby,
  Moon,
  Heart,
  Phone,
  MapPin,
} from "lucide-react";
import { supabase } from "./supabase";
import {
  servicesPage,
  weeklyServices,
  newArrivals,
  featuredDemographic,
  type Service,
} from "./informationContent";

/*
  Editable content for the three messaging pages of the /information display.
  Stored as a single JSON blob in Supabase (public.info_content, one row) so
  employees can edit it and the public display reads it. Defaults below come
  from informationContent.ts and are used until/if a saved row exists.

  A service's `time` field may contain multiple lines (e.g. per-meal times) —
  the display splits it on newlines. Icons are NOT edited (too technical); the
  display looks them up by service name via serviceIconFor().
*/

export type InfoService = {
  name: string;
  time?: string; // may be multi-line
  description?: string;
  location?: string;
  icon?: string; // icon key (see SERVICE_ICONS); "" / undefined = no icon
};

/*
  Friendly icon choices for the editor's per-card dropdown. The `key` is what's
  saved in the content; `label` is the plain wording employees see; `Icon` is
  the lucide component the display renders.
*/
export const SERVICE_ICONS: { key: string; label: string; Icon: LucideIcon }[] =
  [
    { key: "meals", label: "Meals", Icon: UtensilsCrossed },
    { key: "bed", label: "Bed / Shelter", Icon: BedDouble },
    { key: "shower", label: "Shower / Hygiene", Icon: Droplets },
    { key: "medical", label: "Medical", Icon: Stethoscope },
    { key: "people", label: "People / Support", Icon: Users },
    { key: "clothing", label: "Clothing", Icon: Shirt },
    { key: "food", label: "Food / Nutrition", Icon: Apple },
    { key: "baby", label: "Baby", Icon: Baby },
    { key: "rest", label: "Rest", Icon: Moon },
    { key: "care", label: "Care", Icon: Heart },
    { key: "phone", label: "Phone", Icon: Phone },
    { key: "location", label: "Location", Icon: MapPin },
  ];

export const iconFromKey = (key?: string): LucideIcon | undefined =>
  key ? SERVICE_ICONS.find((x) => x.key === key)?.Icon : undefined;

// Default icon key per built-in service name (so defaults keep their icons).
const DEFAULT_ICON_KEY: Record<string, string> = {
  "Hot Meals": "meals",
  "Overnight Shelter": "bed",
  "Showers & Hygiene": "shower",
  "Medical Clinic": "medical",
  "Caseworker Support": "people",
  "Clothing Closet": "clothing",
  "Prenatal Check-ups": "medical",
  "Nutritious Meals": "food",
  "Maternity & Baby Supplies": "baby",
  "Private Rest Area": "rest",
  "Program Referrals": "people",
};

export type InfoStep = { title: string; detail: string };

export type InfoContent = {
  services: { title: string; items: InfoService[] };
  newArrivals: {
    headline: string;
    intro: string;
    stepsLabel: string;
    steps: InfoStep[];
    availableLabel: string;
    availableNow: string[];
  };
  demographic: {
    heading: string;
    intro: string;
    services: InfoService[];
  };
};

// Collapse a coded Service into the editable shape (details/schedule → time).
function toInfoService(s: Service): InfoService {
  return {
    name: s.name,
    time: s.details ? s.details.join("\n") : s.schedule,
    description: s.description,
    location: s.location,
    icon: DEFAULT_ICON_KEY[s.name],
  };
}

export const defaultInfoContent: InfoContent = {
  services: {
    title: servicesPage.title,
    items: weeklyServices.map(toInfoService),
  },
  newArrivals: {
    headline: newArrivals.headline,
    intro: newArrivals.intro,
    stepsLabel: newArrivals.stepsLabel,
    steps: newArrivals.steps.map((s) => ({ title: s.title, detail: s.detail })),
    availableLabel: newArrivals.availableLabel,
    availableNow: [...newArrivals.availableNow],
  },
  demographic: {
    heading: featuredDemographic.heading,
    intro: featuredDemographic.intro,
    services: featuredDemographic.services.map(toInfoService),
  },
};

// Icon lookup by service name (icons live in code, not in the editable content).
const ICON_BY_NAME: Record<string, LucideIcon> = {};
for (const s of [...weeklyServices, ...featuredDemographic.services]) {
  if (s.icon) ICON_BY_NAME[s.name] = s.icon;
}
export const serviceIconFor = (name: string): LucideIcon | undefined =>
  ICON_BY_NAME[name];

// Merge a saved (possibly partial) blob over the defaults so missing keys fall
// back gracefully.
function mergeWithDefaults(saved: Partial<InfoContent> | null): InfoContent {
  const d = defaultInfoContent;
  if (!saved) return d;
  return {
    services: { ...d.services, ...(saved.services ?? {}) },
    newArrivals: { ...d.newArrivals, ...(saved.newArrivals ?? {}) },
    demographic: { ...d.demographic, ...(saved.demographic ?? {}) },
  };
}

// Read the editable content (falls back to defaults when nothing is saved yet).
export async function fetchInfoContent(): Promise<InfoContent> {
  const { data, error } = await supabase
    .from("info_content")
    .select("content")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    // Expected before migration 0006 runs (no table yet) — fall back quietly.
    console.warn("Info content unavailable, using defaults:", error.message);
    return defaultInfoContent;
  }
  return mergeWithDefaults((data?.content ?? null) as Partial<InfoContent> | null);
}

// Save the editable content (staff only, enforced by RLS).
export async function saveInfoContent(
  content: InfoContent,
): Promise<string | null> {
  const { error } = await supabase
    .from("info_content")
    .upsert({ id: 1, content, updated_at: new Date().toISOString() });
  return error ? error.message : null;
}

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

  A service's `time` field may contain multiple lines (e.g. per-meal times),
  the display splits it on newlines. Icons are NOT edited (too technical); the
  display looks them up by service name via serviceIconFor().
*/

/*
  Bilingual note: text fields have optional Spanish counterparts (…Es). The
  Digital Bulletin shows English + Spanish together. `time` (numbers) and
  `location` (place names) are language-neutral, so they're shown once. Spanish
  fields are optional, so existing saved content and the defaults keep working.
*/
export type InfoService = {
  name: string;
  nameEs?: string;
  time?: string; // may be multi-line (language-neutral, shown once)
  description?: string;
  descriptionEs?: string;
  location?: string; // language-neutral (place name), shown once
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

export type InfoStep = {
  title: string;
  titleEs?: string;
  detail: string;
  detailEs?: string;
};

export type InfoContent = {
  services: { title: string; titleEs?: string; items: InfoService[] };
  newArrivals: {
    headline: string;
    headlineEs?: string;
    intro: string;
    introEs?: string;
    stepsLabel: string;
    stepsLabelEs?: string;
    steps: InfoStep[];
    availableLabel: string;
    availableLabelEs?: string;
    availableNow: string[];
    availableNowEs?: string[];
  };
  demographic: {
    heading: string;
    headingEs?: string;
    intro: string;
    introEs?: string;
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

/*
  Initial Spanish for the default built-in content, so the Digital Bulletin is
  bilingual out of the box. Staff edit any of it (English or Spanish) on the
  manage page. DRAFT translation, should be reviewed by a fluent speaker.
*/
const SERVICE_ES: Record<string, { nameEs: string; descriptionEs?: string }> = {
  "Hot Meals": { nameEs: "Comidas Calientes" },
  "Overnight Shelter": {
    nameEs: "Refugio Nocturno",
    descriptionEs: "Una cama segura y cálida para pasar la noche.",
  },
  "Showers & Hygiene": {
    nameEs: "Duchas e Higiene",
    descriptionEs: "Duchas, artículos de aseo y toallas limpias.",
  },
  "Medical Clinic": {
    nameEs: "Clínica Médica",
    descriptionEs: "Atención sin cita de enfermeras en el lugar.",
  },
  "Caseworker Support": {
    nameEs: "Apoyo de Trabajador Social",
    descriptionEs: "Ayuda con vivienda, beneficios y próximos pasos.",
  },
  "Clothing Closet": {
    nameEs: "Ropero Comunitario",
    descriptionEs: "Ropa, zapatos y artículos de temporada gratis.",
  },
  "Prenatal Check-ups": {
    nameEs: "Chequeos Prenatales",
    descriptionEs: "Atención médica en el lugar durante todo el embarazo.",
  },
  "Nutritious Meals": {
    nameEs: "Comidas Nutritivas",
    descriptionEs: "Acceso prioritario a comidas y refrigerios saludables.",
  },
  "Maternity & Baby Supplies": {
    nameEs: "Artículos de Maternidad y Bebé",
    descriptionEs: "Ropa de maternidad, pañales y artículos para recién nacidos.",
  },
  "Private Rest Area": {
    nameEs: "Área de Descanso Privada",
    descriptionEs: "Un espacio tranquilo y cómodo para descansar.",
  },
  "Program Referrals": {
    nameEs: "Referencias a Programas",
    descriptionEs: "Conexiones con programas prenatales y de crianza.",
  },
};

const withEs = (s: InfoService): InfoService => ({ ...s, ...SERVICE_ES[s.name] });

const STEP_ES = [
  {
    titleEs: "Regístrate en la Recepción",
    detailEs:
      "Justo dentro del Edificio Principal. Alguien te dará la bienvenida y te ayudará de inmediato.",
  },
  {
    titleEs: "Toma una comida caliente",
    detailEs: "El comedor está abierto ahora, sin costo y sin preguntas.",
  },
  {
    titleEs: "Habla con un trabajador social",
    detailEs:
      "Ayuda gratuita y privada con refugio, beneficios y tus próximos pasos.",
  },
];

export const defaultInfoContent: InfoContent = {
  services: {
    title: servicesPage.title,
    titleEs: "Servicios de Esta Semana",
    items: weeklyServices.map(toInfoService).map(withEs),
  },
  newArrivals: {
    headline: newArrivals.headline,
    headlineEs: "Bienvenido.",
    intro: newArrivals.intro,
    introEs:
      "Si acabas de llegar, estás en el lugar correcto. Aquí te explicamos cómo empezar y lo que tienes disponible ahora mismo.",
    stepsLabel: newArrivals.stepsLabel,
    stepsLabelEs: "Por dónde empezar",
    steps: newArrivals.steps.map((s, i) => ({
      title: s.title,
      titleEs: STEP_ES[i]?.titleEs,
      detail: s.detail,
      detailEs: STEP_ES[i]?.detailEs,
    })),
    availableLabel: newArrivals.availableLabel,
    availableLabelEs: "Disponible ahora",
    availableNow: [...newArrivals.availableNow],
    availableNowEs: [
      "Baños, duchas y ropa limpia",
      "Un lugar seguro y cálido para descansar",
      "Agua y una comida caliente",
      "Alguien con quien hablar",
    ],
  },
  demographic: {
    heading: featuredDemographic.heading,
    headingEs: "Apoyo para Futuras Madres",
    intro: featuredDemographic.intro,
    introEs:
      "Si estás embarazada, tenemos cuidado reservado para ti y tu bebé. Eres bienvenida aquí.",
    services: featuredDemographic.services.map(toInfoService).map(withEs),
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
    // Expected before migration 0006 runs (no table yet), fall back quietly.
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

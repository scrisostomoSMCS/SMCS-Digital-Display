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
  // Stable identity for matching this service across a save, independent of
  // its (editable) name — see translateChangedFields, which diffs name and
  // description separately and needs a key that doesn't change when the
  // name does. Backfilled on read for content saved before this field
  // existed (see fillServiceEs); always present in practice.
  id?: string;
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

// Max services shown on one "This Week's Services" page (kept to 4 tall cards).
export const MAX_SERVICES_PER_PAGE = 4;

export const DEFAULT_SERVICES_TITLE = servicesPage.title;
export const DEFAULT_SERVICES_TITLE_ES = "Servicios de Esta Semana";

// One numbered "This Week's Services" page: its OWN title (each page can differ)
// plus up to MAX_SERVICES_PER_PAGE services.
export type InfoServicePage = {
  id: string;
  title: string;
  titleEs?: string;
  services: InfoService[];
};

export const newServicePage = (): InfoServicePage => ({
  id: crypto.randomUUID(),
  title: DEFAULT_SERVICES_TITLE,
  titleEs: DEFAULT_SERVICES_TITLE_ES,
  services: [],
});

export type InfoServicesContent = {
  // One or more numbered pages, shown consecutively in the rotation.
  pages: InfoServicePage[];
};

export type InfoContent = {
  services: InfoServicesContent;
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
    id: s.name,
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
  "Showers & Clothing Center": {
    nameEs: "Centro de Duchas y Ropa",
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

const DEFAULT_AVAILABLE_NOW_ES = [
  "Baños, duchas y ropa limpia",
  "Un lugar seguro y cálido para descansar",
  "Agua y una comida caliente",
  "Alguien con quien hablar",
];

/*
  English-keyed Spanish lookups, built from the defaults. Used to backfill
  Spanish onto known content that was saved before the bilingual fields existed
  (see backfillSpanish) so the display and editor show Spanish without staff
  having to retype it. Edited/custom names simply won't match and stay as-is.
*/
const STEP_ES_BY_TITLE: Record<string, { titleEs: string; detailEs: string }> =
  {};
newArrivals.steps.forEach((s, i) => {
  if (STEP_ES[i]) STEP_ES_BY_TITLE[s.title] = STEP_ES[i];
});

const AVAILABLE_ES_BY_TEXT: Record<string, string> = {};
newArrivals.availableNow.forEach((t, i) => {
  if (DEFAULT_AVAILABLE_NOW_ES[i]) AVAILABLE_ES_BY_TEXT[t] = DEFAULT_AVAILABLE_NOW_ES[i];
});

// Split a flat list into pages of at most `size` (always at least one page).
function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out.length ? out : [[]];
}

const defaultWeeklyServices = weeklyServices.map(toInfoService).map(withEs);

export const defaultInfoContent: InfoContent = {
  services: {
    pages: chunk(defaultWeeklyServices, MAX_SERVICES_PER_PAGE).map((s, i) => ({
      id: `default-${i + 1}`,
      title: DEFAULT_SERVICES_TITLE,
      titleEs: DEFAULT_SERVICES_TITLE_ES,
      services: s,
    })),
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
    availableNowEs: [...DEFAULT_AVAILABLE_NOW_ES],
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

type SavedServicePage = {
  id?: string;
  title?: string;
  titleEs?: string;
  services?: InfoService[];
};
type SavedServicesContent = {
  title?: string; // legacy SHARED title (migrated onto each page)
  titleEs?: string;
  pages?: (SavedServicePage | InfoService[])[]; // page objects OR legacy arrays
  page1?: InfoService[]; // legacy fixed two-page shape
  page2?: InfoService[];
  items?: InfoService[]; // oldest single-list shape
};

type SavedInfoContent = Omit<Partial<InfoContent>, "services"> & {
  services?: SavedServicesContent;
};

/*
  Normalize saved services into per-page objects, reading any past shape: the
  current page objects, the recent array-of-arrays, the legacy fixed
  `page1`/`page2`, or the oldest single `items` list. A previously-shared title
  migrates onto each page. Service objects are preserved as-is; each page is
  capped at MAX_SERVICES_PER_PAGE and there is always ≥1 page.
*/
function normalizeServices(saved?: SavedServicesContent): InfoServicesContent {
  const d = defaultInfoContent.services;
  if (!saved) return d;

  const fallbackTitle = saved.title ?? DEFAULT_SERVICES_TITLE;
  const fallbackTitleEs = saved.titleEs ?? DEFAULT_SERVICES_TITLE_ES;
  const toPage = (
    services: InfoService[] | undefined,
    id: string,
    title?: string,
    titleEs?: string,
  ): InfoServicePage => ({
    id,
    title: title ?? fallbackTitle,
    titleEs: titleEs ?? fallbackTitleEs,
    services: (Array.isArray(services) ? services : []).slice(
      0,
      MAX_SERVICES_PER_PAGE,
    ),
  });

  let pages: InfoServicePage[];
  if (Array.isArray(saved.pages)) {
    pages = saved.pages.map((p, i) =>
      Array.isArray(p)
        ? toPage(p, `saved-${i + 1}`)
        : toPage(p.services, p.id ?? `saved-${i + 1}`, p.title, p.titleEs),
    );
  } else if (Array.isArray(saved.page1) || Array.isArray(saved.page2)) {
    pages = [
      toPage(saved.page1, "legacy-1"),
      toPage(saved.page2, "legacy-2"),
    ];
  } else if (Array.isArray(saved.items)) {
    pages = chunk(saved.items, MAX_SERVICES_PER_PAGE).map((s, i) =>
      toPage(s, `legacy-items-${i + 1}`),
    );
  } else {
    pages = d.pages;
  }

  if (pages.length === 0) pages = [toPage([], "saved-1")];
  return { pages };
}

// Merge a saved (possibly partial) blob over the defaults so missing keys fall
// back gracefully.
function mergeWithDefaults(saved: SavedInfoContent | null): InfoContent {
  const d = defaultInfoContent;
  if (!saved) return d;
  return {
    services: normalizeServices(saved.services),
    newArrivals: { ...d.newArrivals, ...(saved.newArrivals ?? {}) },
    demographic: { ...d.demographic, ...(saved.demographic ?? {}) },
  };
}

// Fill a service's Spanish from the known-name lookup when it's missing, and
// backfill `id` for content saved before that field existed (see InfoService).
function fillServiceEs(s: InfoService): InfoService {
  const withId = s.id ? s : { ...s, id: crypto.randomUUID() };
  const es = SERVICE_ES[withId.name];
  if (!es) return withId;
  return {
    ...withId,
    nameEs: withId.nameEs || es.nameEs,
    descriptionEs: withId.descriptionEs || es.descriptionEs,
  };
}

/*
  Backfill Spanish onto content that predates the bilingual fields, matching by
  English text. Anything already translated (or with an edited/custom name)
  keeps its own value. This runs on read, so the display and the editor both see
  the Spanish, and saving from the editor persists it.
*/
function backfillSpanish(c: InfoContent): InfoContent {
  return {
    ...c,
    services: {
      ...c.services,
      pages: c.services.pages.map((page) => ({
        ...page,
        services: page.services.map(fillServiceEs),
      })),
    },
    newArrivals: {
      ...c.newArrivals,
      steps: c.newArrivals.steps.map((step) => {
        const es = STEP_ES_BY_TITLE[step.title];
        if (!es) return step;
        return {
          ...step,
          titleEs: step.titleEs || es.titleEs,
          detailEs: step.detailEs || es.detailEs,
        };
      }),
      availableNowEs: c.newArrivals.availableNow.map(
        (item, i) =>
          (c.newArrivals.availableNowEs ?? [])[i] ||
          AVAILABLE_ES_BY_TEXT[item] ||
          "",
      ),
    },
    demographic: {
      ...c.demographic,
      services: c.demographic.services.map(fillServiceEs),
    },
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
  return backfillSpanish(
    mergeWithDefaults((data?.content ?? null) as SavedInfoContent | null),
  );
}

export type SaveInfoContentResult = {
  error: string | null;
  warnings: string[];
  content: InfoContent | null;
};

/*
  Save the editable content (staff only, enforced server-side + RLS). Posts to
  /api/info-content/save instead of writing to Supabase directly, so the
  Google Translate call in translateInfoContent.server.ts can run with a
  server-only API key.

  `loaded` is the content as it was fetched (or last saved) — the server
  diffs against it to auto-translate only English fields that actually
  changed, so a hand-edited Spanish field is never overwritten by a save that
  didn't touch its English counterpart. Returns the merged content (including
  any freshly auto-translated Spanish) so the editor can show it without a
  refetch, plus any "translation may be too long for this field" warnings.
*/
export async function saveInfoContent(
  content: InfoContent,
  loaded: InfoContent,
): Promise<SaveInfoContentResult> {
  const normalized: InfoContent = {
    ...content,
    services: {
      ...content.services,
      pages: content.services.pages.map((p) => ({
        ...p,
        services: p.services.slice(0, MAX_SERVICES_PER_PAGE),
      })),
    },
  };
  try {
    const res = await fetch("/api/info-content/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: normalized, loaded }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        error: data?.error ?? `Save failed (${res.status})`,
        warnings: [],
        content: null,
      };
    }
    return { error: null, warnings: data.warnings ?? [], content: data.content ?? null };
  } catch (err) {
    console.error("Info content save request failed:", err);
    return { error: "Network error while saving.", warnings: [], content: null };
  }
}

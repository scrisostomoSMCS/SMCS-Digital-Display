/*
  The "Contact / resource card" custom slide: 3 to 6 services, each with an
  icon, a name, a phone number, and hours. Stored in the slides.content jsonb
  column (migration 0027). Pure helpers only, no Supabase and no React — shared
  by the manage editor, the display renderer, and the server-side translator.
  The icon KEYS live here; the Phosphor components they draw are mapped in
  components/information/resourceIcons.

  Stored shape (every key optional on read; parseResourceCard fills the gaps):
    {
      "services": [
        { "id": "b1f…", "icon": "food", "name": "Food Pantry",
          "nameEs": "Despensa de alimentos", "phone": "(209) 555-0123",
          "hours": "Mon–Fri, 9 AM – 3 PM", "hoursEs": "lun–vie, 9 AM – 3 PM" }
      ]
    }

  `id` is stable across edits and reorders so the translator can tell a
  renamed service from a new one (the same reason InfoService has one).
  The phone number is never translated and is limited to the characters a
  phone number uses, so nothing but digits and punctuation can reach the
  largest text on the slide.
*/

export const RESOURCE_ICONS = [
  { key: "info", label: "Information" },
  { key: "phone", label: "Phone / hotline" },
  { key: "food", label: "Meals" },
  { key: "pantry", label: "Food pantry / groceries" },
  { key: "medical", label: "Medical clinic" },
  { key: "first-aid", label: "First aid" },
  { key: "dental", label: "Dental" },
  { key: "pharmacy", label: "Pharmacy / medication" },
  { key: "vaccine", label: "Shots / vaccines" },
  { key: "mental-health", label: "Mental health" },
  { key: "recovery", label: "Recovery / crisis support" },
  { key: "shower", label: "Showers" },
  { key: "laundry", label: "Laundry" },
  { key: "clothing", label: "Clothing" },
  { key: "housing", label: "Housing" },
  { key: "shelter", label: "Shelter / beds" },
  { key: "transport", label: "Transportation" },
  { key: "jobs", label: "Jobs / employment" },
  { key: "education", label: "Education / classes" },
  { key: "legal", label: "Legal help" },
  { key: "id", label: "ID documents" },
  { key: "mail", label: "Mail" },
  { key: "money", label: "Benefits / money" },
  { key: "computer", label: "Computers / internet" },
  { key: "family", label: "Families" },
  { key: "baby", label: "Babies / children" },
  { key: "veterans", label: "Veterans" },
  { key: "pets", label: "Pets" },
  { key: "language", label: "Interpretation / language" },
  { key: "outreach", label: "Outreach / caseworkers" },
] as const;

export type ResourceIconKey = (typeof RESOURCE_ICONS)[number]["key"];

export const DEFAULT_RESOURCE_ICON: ResourceIconKey = "info";

const ICON_KEYS = new Set<string>(RESOURCE_ICONS.map((i) => i.key));

export type ResourceService = {
  id: string;
  icon: ResourceIconKey;
  name: string;
  nameEs: string;
  phone: string;
  hours: string;
  hoursEs: string;
};

export type ResourceCard = { services: ResourceService[] };

// The grid holds at most 3 x 2; see RESOURCE_CARD_LIMITS for the text limits.
export const MAX_RESOURCE_SERVICES = 6;

export const emptyResourceCard = (): ResourceCard => ({ services: [] });

export function newResourceService(): ResourceService {
  return {
    id: crypto.randomUUID(),
    icon: DEFAULT_RESOURCE_ICON,
    name: "",
    nameEs: "",
    phone: "",
    hours: "",
    hoursEs: "",
  };
}

// Keeps only what a phone number is written with: digits, spaces, + ( ) - .
// and a lowercase x for an extension ("x12"). A capital X is lowered.
export const cleanPhoneInput = (value: string) =>
  value.replace(/X/g, "x").replace(/[^0-9+().\-x ]/g, "");

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/*
  Always returns a usable card. Null (a slide that was never a resource card),
  another template's blob, or wrong-typed fields read as empty; an unknown icon
  falls back to the default rather than drawing nothing. Capped at
  MAX_RESOURCE_SERVICES so bad data can never overflow the grid.
*/
export function parseResourceCard(raw: unknown): ResourceCard {
  const list = asRecord(raw).services;
  if (!Array.isArray(list)) return emptyResourceCard();
  const services = list.slice(0, MAX_RESOURCE_SERVICES).map((item, i) => {
    const s = asRecord(item);
    const icon = str(s.icon);
    return {
      id: str(s.id) || `service-${i}`,
      icon: (ICON_KEYS.has(icon) ? icon : DEFAULT_RESOURCE_ICON) as ResourceIconKey,
      name: str(s.name),
      nameEs: str(s.nameEs),
      phone: cleanPhoneInput(str(s.phone)),
      hours: str(s.hours),
      hoursEs: str(s.hoursEs),
    };
  });
  return { services };
}

// A service shows on the display once it has a name or a phone number.
export const hasResourceContent = (s: ResourceService) =>
  Boolean(s.name.trim() || s.phone.trim());

// Trimmed, with services that have neither a name nor a phone dropped.
export function cleanResourceCard(raw: unknown): ResourceCard {
  return {
    services: parseResourceCard(raw)
      .services.map((s) => ({
        ...s,
        name: s.name.trim(),
        nameEs: s.nameEs.trim(),
        phone: s.phone.trim(),
        hours: s.hours.trim(),
        hoursEs: s.hoursEs.trim(),
      }))
      .filter(hasResourceContent),
  };
}

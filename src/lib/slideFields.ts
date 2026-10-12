import type { SlideTemplate } from "./slides";

/*
  Which fields each custom slide template uses. Pure (no Supabase), so the
  manage editor and the server-side translator (translateSlide.server.ts) read
  the same table: a field the editor does not show is never sent for
  translation, and vice versa.

  `title` here means a headline ON the slide. "Image with caption" has none —
  its title column is only the page's name in the manage sidebar — so it is
  false there and that name is never translated.
*/
export type SlideFieldUse = {
  title: boolean;
  body: boolean;
  items: boolean;
  image: boolean;
  caption: boolean;
  menu: boolean;
  event: boolean;
  resources: boolean;
  cards: boolean;
  weather: boolean;
  lostFound: boolean;
};

const NONE: SlideFieldUse = {
  title: false,
  body: false,
  items: false,
  image: false,
  caption: false,
  menu: false,
  event: false,
  resources: false,
  cards: false,
  weather: false,
  lostFound: false,
};

export const SLIDE_TEMPLATE_FIELDS: Record<SlideTemplate, SlideFieldUse> = {
  "title-body": { ...NONE, title: true, body: true },
  "title-image-text": { ...NONE, title: true, body: true, image: true },
  "image-focus": { ...NONE, image: true, caption: true },
  "title-list": { ...NONE, title: true, items: true },
  "weekly-menu": { ...NONE, title: true, menu: true },
  "event-flyer": { ...NONE, title: true, body: true, image: true, event: true },
  "resource-card": { ...NONE, title: true, resources: true },
  "card-grid": { ...NONE, title: true, cards: true },
  weather: { ...NONE, title: true, weather: true },
  "lost-found": { ...NONE, title: true, lostFound: true },
};

/*
  Tidies an English list and its Spanish twin TOGETHER, so Spanish keeps
  pairing with English by position. Blank English lines are dropped along
  with whatever Spanish sat beside them; a blank Spanish slot beside real
  English is kept as "" (no Spanish for that item yet) rather than removed,
  because removing it would shift every later Spanish line onto the wrong
  English one — e.g. after one item's auto-translate fails and the next
  succeeds. Spanish past the last English line has nothing to pair with and
  is dropped. Trailing empty Spanish is trimmed.
*/
export function cleanPairedList(en: string[], es: string[]): { en: string[]; es: string[] } {
  const outEn: string[] = [];
  const outEs: string[] = [];
  en.forEach((text, i) => {
    const t = text.trim();
    if (!t) return;
    outEn.push(t);
    outEs.push((es[i] ?? "").trim());
  });
  while (outEs.length > 0 && !outEs[outEs.length - 1]) outEs.pop();
  return { en: outEn, es: outEs };
}

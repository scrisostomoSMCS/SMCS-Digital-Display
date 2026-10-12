import type { SlideInput } from "./slides";
import { SLIDE_TEMPLATE_FIELDS } from "./slideFields";
import {
  EVENT_FLYER_LIMITS,
  RESOURCE_CARD_LIMITS,
  CARD_GRID_LIMITS,
  WEATHER_LIMITS,
  SLIDE_LIMITS,
  WEEKLY_MENU_LIMITS,
  slideBodyLimit,
  slideTitleLimit,
} from "./bulletinLimits";
import { MENU_DAYS, MENU_MEALS, parseMenu, weekTitle, weekTitleEs } from "./weeklyMenu";
import { parseEventFlyer } from "./eventFlyer";
import { parseResourceCard } from "./resourceCard";
import { cardGridSlots, parseCardGrid } from "./cardGrid";
import { parseWeatherSlide } from "./weather";
import { translateTexts } from "./translate.server";

/*
  Server-side auto-translate for a custom slide, run once per save. Same rules
  as translateInfoContent.server.ts, which this mirrors:

  - A field is translated only when its English changed since `loaded` (the
    last saved state) OR its Spanish is empty. An unchanged field keeps its
    Spanish, which is what protects a hand-corrected translation; an empty one
    is retried, so a failed translation heals on the next save.
  - Only fields the slide's template actually shows are considered (see
    slideFields), so a page name or a leftover field from a previous layout is
    never sent out.
  - List items (title + list, menu cells) are matched by their English text,
    not position, the same convention as availableNow in the info translator;
    Spanish still pairs with English by position on the display.
  - Never throws. Each string is isolated (translateTexts uses
    Promise.allSettled): a failed one keeps the Spanish as submitted and is
    reported in `warnings`, and successful ones still apply.

  Not translated on purpose: the weekly menu's auto-filled title (it already
  has a fixed Spanish twin, see weekTitleEs) and anything that is not prose —
  dates and times are formatted bilingually in code.
*/

type Job = {
  label: string;
  english: string;
  limit?: number;
  apply: (es: string) => void;
};

// Spanish list aligned to English by position, padded so index i exists.
function setAt(list: string[], i: number, value: string) {
  while (list.length <= i) list.push("");
  list[i] = value;
}

export async function translateSlideInput(
  loaded: SlideInput,
  input: SlideInput,
): Promise<{ merged: SlideInput; warnings: string[] }> {
  // Deep copy so job.apply() can freely mutate nested fields.
  const merged: SlideInput = JSON.parse(JSON.stringify(input));
  const uses = SLIDE_TEMPLATE_FIELDS[merged.template] ?? SLIDE_TEMPLATE_FIELDS["title-body"];
  const jobs: Job[] = [];
  const warnings: string[] = [];

  const scalar = (
    label: string,
    loadedEn: string,
    currentEn: string,
    currentEs: string,
    limit: number | undefined,
    apply: (es: string) => void,
  ) => {
    if (!currentEn) return;
    if (currentEn !== loadedEn || !currentEs) {
      jobs.push({ label, english: currentEn, limit, apply });
    }
  };

  // Items whose English is new, or whose Spanish slot is still empty.
  const list = (
    label: string,
    loadedEn: string[],
    en: string[],
    es: string[],
    limit: number | undefined,
  ) => {
    const known = new Set(loadedEn);
    en.forEach((text, i) => {
      if (!text) return;
      if (known.has(text) && es[i]) return;
      jobs.push({ label: `${label} ${i + 1}`, english: text, limit, apply: (t) => setAt(es, i, t) });
    });
  };

  if (uses.title) {
    const menuWeek = uses.menu ? merged.menu?.weekOf : null;
    const autoTitle =
      !!menuWeek &&
      merged.title === weekTitle(menuWeek) &&
      merged.titleEs === weekTitleEs(menuWeek);
    if (!autoTitle) {
      scalar("Title", loaded.title, merged.title, merged.titleEs, slideTitleLimit(merged.template), (es) => (merged.titleEs = es));
    }
  }
  if (uses.body) {
    scalar("Body text", loaded.body, merged.body, merged.bodyEs, slideBodyLimit(merged.template), (es) => (merged.bodyEs = es));
  }
  if (uses.caption) {
    scalar("Caption", loaded.caption, merged.caption, merged.captionEs, SLIDE_LIMITS.caption, (es) => (merged.captionEs = es));
  }
  if (uses.items) {
    list("List item", loaded.items, merged.items, merged.itemsEs, SLIDE_LIMITS.item);
  }
  if (uses.menu && merged.menu) {
    const menu = parseMenu(merged.menu);
    const loadedMenu = parseMenu(loaded.menu);
    for (const d of MENU_DAYS) {
      for (const m of MENU_MEALS) {
        const meal = menu.days[d.key][m.key];
        list(
          `${d.label} ${m.label.toLowerCase()} item`,
          loadedMenu.days[d.key][m.key].items,
          meal.items,
          meal.itemsEs,
          WEEKLY_MENU_LIMITS.cell,
        );
      }
    }
    merged.menu = menu;
  }
  if (uses.event) {
    const flyer = parseEventFlyer(merged.content);
    const loadedFlyer = parseEventFlyer(loaded.content);
    scalar("Location", loadedFlyer.location, flyer.location, flyer.locationEs, EVENT_FLYER_LIMITS.location, (es) => (flyer.locationEs = es));
    merged.content = flyer;
  }
  if (uses.resources) {
    // Matched by stable id, so reordering services never reads as an edit and
    // a renamed service retranslates its name only. Phone numbers are never
    // sent out.
    const card = parseResourceCard(merged.content);
    const loadedById = new Map(parseResourceCard(loaded.content).services.map((s) => [s.id, s]));
    card.services.forEach((service, i) => {
      const before = loadedById.get(service.id);
      const label = `Service ${i + 1}`;
      scalar(`${label} name`, before?.name ?? "", service.name, service.nameEs, RESOURCE_CARD_LIMITS.name, (es) => (service.nameEs = es));
      scalar(`${label} hours`, before?.hours ?? "", service.hours, service.hoursEs, RESOURCE_CARD_LIMITS.hours, (es) => (service.hoursEs = es));
    });
    merged.content = card;
  }
  if (uses.cards) {
    // Only the slots the chosen layout shows; matched by id so moving a card
    // never reads as an edit.
    const grid = parseCardGrid(merged.content);
    const loadedById = new Map(parseCardGrid(loaded.content).cards.map((c) => [c.id, c]));
    grid.cards.slice(0, cardGridSlots(grid.layout)).forEach((card, i) => {
      const before = loadedById.get(card.id);
      const label = `Card ${i + 1}`;
      scalar(`${label} title`, before?.title ?? "", card.title, card.titleEs, CARD_GRID_LIMITS.cardTitle, (es) => (card.titleEs = es));
      scalar(`${label} text`, before?.text ?? "", card.text, card.textEs, CARD_GRID_LIMITS.cardText, (es) => (card.textEs = es));
    });
    merged.content = grid;
  }
  if (uses.weather) {
    // Only the staff note: forecast words and the automatic notice have fixed
    // Spanish in lib/weather.
    const w = parseWeatherSlide(merged.content);
    const before = parseWeatherSlide(loaded.content);
    scalar("Weather note", before.note, w.note, w.noteEs, WEATHER_LIMITS.note, (es) => (w.noteEs = es));
    merged.content = w;
  }

  if (jobs.length === 0) return { merged, warnings };

  try {
    const results = await translateTexts(jobs.map((j) => j.english));
    jobs.forEach((job, i) => {
      const result = results[i];
      if (result.ok) {
        job.apply(result.text);
        if (job.limit !== undefined && result.text.length > job.limit) {
          warnings.push(
            `${job.label}: Spanish translation is ${result.text.length} characters, over the ${job.limit}-character display limit — check the preview in case it clips.`,
          );
        }
      } else {
        console.error(`Auto-translate failed for ${job.label}:`, result.error);
        warnings.push(
          `${job.label}: auto-translate failed (${result.error}) — Spanish left as submitted; you may want to translate it by hand.`,
        );
      }
    });
  } catch (err) {
    // Defense in depth, as in translateInfoContent: translateTexts should not
    // throw, but if it does the save must still go through with Spanish as typed.
    console.error("Auto-translate failed unexpectedly (Spanish left unchanged):", err);
    return {
      merged: input,
      warnings: ["Auto-translate failed unexpectedly — Spanish fields were left as submitted."],
    };
  }

  return { merged, warnings };
}

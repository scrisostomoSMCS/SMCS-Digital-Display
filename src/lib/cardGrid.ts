/*
  The "Grid of cards" custom slide: short announcements in a 2 x 2 or 3 x 2
  grid that staff choose. Stored in the slides.content jsonb column (migration
  0027). Pure helpers only, no Supabase and no React — shared by the manage
  editor, the display renderer, and the server-side translator.

  Stored shape (every key optional on read; parseCardGrid fills the gaps):
    {
      "layout": "3x2",
      "cards": [
        { "id": "card-0", "title": "Flu shots Friday", "titleEs": "...",
          "text": "Free at the clinic, 9 AM to noon.", "textEs": "..." },
        ... always six slots ...
      ]
    }

  Always six slots, whichever layout is picked: a 2 x 2 grid shows the first
  four and keeps the other two, so switching layouts back and forth never
  throws a card away. Ids are the slot a card was created in and travel with
  it when cards are moved, which is what lets the translator tell an edited
  card from one that only changed places.
*/

export type CardGridLayout = "2x2" | "3x2";

export const CARD_GRID_LAYOUTS: { key: CardGridLayout; label: string; slots: number }[] = [
  { key: "2x2", label: "2 × 2 (4 larger cards)", slots: 4 },
  { key: "3x2", label: "3 × 2 (6 cards)", slots: 6 },
];

export const CARD_GRID_SLOTS = 6;

export type GridCard = {
  id: string;
  title: string;
  titleEs: string;
  text: string;
  textEs: string;
};

export type CardGrid = { layout: CardGridLayout; cards: GridCard[] };

const emptyCard = (i: number): GridCard => ({
  id: `card-${i}`,
  title: "",
  titleEs: "",
  text: "",
  textEs: "",
});

export const emptyCardGrid = (): CardGrid => ({
  layout: "2x2",
  cards: Array.from({ length: CARD_GRID_SLOTS }, (_, i) => emptyCard(i)),
});

// How many slots the layout shows.
export const cardGridSlots = (layout: CardGridLayout) => (layout === "3x2" ? 6 : 4);

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/*
  Always returns exactly six slots and a valid layout. Null (a slide that was
  never a card grid), another template's blob, a short or overlong list, or
  wrong-typed fields all read as empty slots rather than throwing. A duplicate
  or missing id is replaced so every slot stays distinct.
*/
export function parseCardGrid(raw: unknown): CardGrid {
  const obj = asRecord(raw);
  const list = Array.isArray(obj.cards) ? obj.cards : [];
  const seen = new Set<string>();
  const cards = Array.from({ length: CARD_GRID_SLOTS }, (_, i) => {
    const c = asRecord(list[i]);
    let id = str(c.id);
    if (!id || seen.has(id)) id = `card-${i}`;
    // A fallback id can still collide with a stored one; walk to a free one.
    for (let n = i; seen.has(id); n += CARD_GRID_SLOTS) id = `card-${n}`;
    seen.add(id);
    return {
      id,
      title: str(c.title),
      titleEs: str(c.titleEs),
      text: str(c.text),
      textEs: str(c.textEs),
    };
  });
  return { layout: obj.layout === "3x2" ? "3x2" : "2x2", cards };
}

// A card shows once it has a title or text.
export const hasCardContent = (c: GridCard) => Boolean(c.title.trim() || c.text.trim());

// The cards the display draws: the layout's slots, empty ones dropped.
export const visibleCards = (grid: CardGrid) =>
  grid.cards.slice(0, cardGridSlots(grid.layout)).filter(hasCardContent);

export function cleanCardGrid(raw: unknown): CardGrid {
  const grid = parseCardGrid(raw);
  return {
    layout: grid.layout,
    cards: grid.cards.map((c) => ({
      id: c.id,
      title: c.title.trim(),
      titleEs: c.titleEs.trim(),
      text: c.text.trim(),
      textEs: c.textEs.trim(),
    })),
  };
}

"use client";

import { useEffect, useState } from "react";
import {
  translateSlide,
  updateSlide,
  type SlideInput,
  uploadSlideImage,
  slideImageUrl,
  SLIDE_TEMPLATES,
  type Slide,
  type SlideTemplate,
} from "@/lib/slides";
import {
  SLIDE_BACKGROUND_PRESETS,
  resolveSlideBackground,
} from "@/lib/slideBackgrounds";
import ColorPicker from "./ColorPicker";
import SlideTemplateView from "@/components/information/SlideTemplateView";
import BulletinCanvasPreview from "@/components/information/BulletinCanvasPreview";
import {
  EVENT_FLYER_LIMITS,
  RESOURCE_CARD_LIMITS,
  CARD_GRID_LIMITS,
  WEATHER_LIMITS,
  SLIDE_LIMITS,
  WEEKLY_MENU_LIMITS,
  slideBodyLimit,
  slideTitleLimit,
} from "@/lib/bulletinLimits";
import { SLIDE_TEMPLATE_FIELDS, cleanPairedList } from "@/lib/slideFields";
import {
  cleanEventFlyer,
  formatEventDate,
  formatEventTime,
  parseEventFlyer,
  type EventFlyer,
} from "@/lib/eventFlyer";
import {
  MAX_RESOURCE_SERVICES,
  RESOURCE_ICONS,
  cleanPhoneInput,
  cleanResourceCard,
  newResourceService,
  parseResourceCard,
  type ResourceIconKey,
  type ResourceService,
} from "@/lib/resourceCard";
import { resourceIcon } from "@/components/information/resourceIcons";
import {
  CARD_GRID_LAYOUTS,
  cardGridSlots,
  cleanCardGrid,
  parseCardGrid,
  type CardGrid,
  type GridCard,
} from "@/lib/cardGrid";
import {
  COLD_NOTICE_F,
  HEAT_NOTICE_F,
  WEATHER_PLACE,
  cleanWeatherSlide,
  parseWeatherSlide,
  upcomingDays,
  weatherCondition,
  weatherNotice,
  type WeatherSlide,
} from "@/lib/weather";
import { useWeather } from "@/lib/useWeather";
import { SHOW_LOST_FOUND } from "@/lib/siteConfig";
import LostFoundManager from "./LostFoundManager";
import {
  MENU_DAYS,
  MENU_MEALS,
  cleanMenu,
  emptyMenu,
  mondayOf,
  weekRangeLabel,
  weekTitle,
  weekTitleEs,
  type MenuDayKey,
  type MenuMealKey,
} from "@/lib/weeklyMenu";
import { useBulletinLocations } from "./LocationBadges";
import {
  BilingualField,
  CharCount,
  Field,
  StringListEditor,
  inputClass,
  labelClass,
  smallBtn,
} from "./editorFields";

/*
  Structured editor for one custom slide, used inline on the manage page. Employees
  pick a layout, any background color, fill in text, and upload an image into a
  fitted slot, no free positioning and no font control. Text and accent colors
  are derived from the background rather than chosen, so a slide stays readable
  whatever color is picked. The live preview renders the EXACT display component
  (SlideTemplateView) scaled down, so it always matches the wall screen. Saves to
  Supabase; the rotation updates via realtime.
*/

// Template-specific content, cleaned by that template's own module. Content a
// different template left behind is kept as-is (like `menu`), so switching
// layouts back and forth never throws work away.
function cleanContent(s: Slide): unknown {
  if (s.template === "event-flyer") return cleanEventFlyer(s.content);
  if (s.template === "resource-card") return cleanResourceCard(s.content);
  if (s.template === "card-grid") return cleanCardGrid(s.content);
  if (s.template === "weather") return cleanWeatherSlide(s.content);
  return s.content ?? null;
}

// What save() writes, trimmed and cleaned. Also used to compare a draft with
// the last saved state, so only a real edit counts as unsaved.
function toInput(s: Slide): SlideInput {
  const items = cleanPairedList(s.items, s.itemsEs);
  return {
    template: s.template,
    background: s.background,
    title: s.title.trim(),
    titleEs: s.titleEs.trim(),
    body: s.body.trim(),
    bodyEs: s.bodyEs.trim(),
    items: items.en,
    itemsEs: items.es,
    caption: s.caption.trim(),
    captionEs: s.captionEs.trim(),
    imagePath: s.imagePath,
    menu: s.menu ? cleanMenu(s.menu) : null,
    content: cleanContent(s),
    locationIds: s.locationIds,
  };
}

const sameContent = (a: Slide, b: Slide) =>
  JSON.stringify(toInput(a)) === JSON.stringify(toInput(b));

export default function SlideEditor({
  slide,
  onSaved,
  onDirtyChange,
}: {
  slide: Slide;
  onSaved?: () => void;
  // Tells the panel whether closing it would throw away unsaved edits.
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Slide>(slide);
  // The last state known to be in the database: the slide as loaded, then
  // whatever the most recent successful save wrote.
  const [baseline, setBaseline] = useState<Slide>(slide);
  // Re-seed only when a genuinely different slide is passed (keeps in-progress
  // edits from being clobbered by realtime refreshes of the same slide).
  useEffect(() => {
    setDraft(slide);
    setBaseline(slide);
  }, [slide.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !sameContent(draft, baseline);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  // Closing the tab or navigating away with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Auto-translate notes from the last save (a failed field, or Spanish that
  // came back longer than the display limit). The save itself still succeeded.
  const [warnings, setWarnings] = useState<string[]>([]);
  const locations = useBulletinLocations(`slide-editor-${slide.id}`);
  // Which language the weekly-menu grid is editing. Spanish is filled in on
  // save (see translateSlide.server); this view is for correcting it.
  const [menuLang, setMenuLang] = useState<"en" | "es">("en");

  const set = <K extends keyof Slide>(k: K, v: Slide[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const uses = SLIDE_TEMPLATE_FIELDS[draft.template];
  // "Title + image + text" gives the paragraph a half-width column, so it holds
  // less than the full-width layouts.
  const bodyLimit = slideBodyLimit(draft.template);
  const titleLimit = slideTitleLimit(draft.template);

  // Event / flyer. Parsed on every render so a slide switched to this layout
  // (or one holding another template's content) starts from empty fields.
  const flyer = parseEventFlyer(draft.content);
  const setFlyer = (patch: Partial<EventFlyer>) =>
    setDraft((d) => ({ ...d, content: { ...parseEventFlyer(d.content), ...patch } }));
  const flyerDate = formatEventDate(flyer.date);
  const flyerTime = formatEventTime(flyer.startTime, flyer.endTime);

  // Contact / resource card. Same idea: parsed from content on every render.
  const services = parseResourceCard(draft.content).services;
  const setServices = (next: ResourceService[]) =>
    setDraft((d) => ({ ...d, content: { services: next } }));
  const updateService = (id: string, patch: Partial<ResourceService>) =>
    setServices(services.map((sv) => (sv.id === id ? { ...sv, ...patch } : sv)));
  const moveService = (i: number, dir: -1 | 1) => {
    const next = [...services];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setServices(next);
  };

  // Grid of cards. Always six slots in the data; the layout decides how many
  // are offered here and drawn on the display.
  const grid = parseCardGrid(draft.content);
  const gridSlots = cardGridSlots(grid.layout);
  const setGrid = (patch: Partial<CardGrid>) =>
    setDraft((d) => ({ ...d, content: { ...parseCardGrid(d.content), ...patch } }));
  const updateCard = (id: string, patch: Partial<GridCard>) =>
    setGrid({ cards: grid.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const moveCard = (i: number, dir: -1 | 1) => {
    const next = [...grid.cards];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setGrid({ cards: next });
  };
  // Weather. The forecast itself is live data, shown here so staff can see
  // what the slide will say before writing a note.
  const weatherSlide = parseWeatherSlide(draft.content);
  const setWeather = (patch: Partial<WeatherSlide>) =>
    setDraft((d) => ({ ...d, content: { ...parseWeatherSlide(d.content), ...patch } }));
  const forecast = useWeather(uses.weather);
  const forecastDays = upcomingDays(forecast);
  const autoNoticeNow = weatherNotice(forecastDays);

  const hiddenCardCount = grid.cards
    .slice(gridSlots)
    .filter((c) => c.title.trim() || c.text.trim()).length;

  // Weekly menu. A slide switched to this layout starts from an empty grid.
  const menu = draft.menu ?? emptyMenu();

  // Picking any date snaps to that week's Monday and rewrites both titles
  // (still editable afterwards). Clearing the date leaves the titles alone.
  function pickWeek(value: string) {
    const monday = value ? mondayOf(value) : null;
    setDraft((d) => {
      const current = d.menu ?? emptyMenu();
      if (!monday) return { ...d, menu: { ...current, weekOf: null } };
      return {
        ...d,
        menu: { ...current, weekOf: monday },
        title: weekTitle(monday),
        titleEs: weekTitleEs(monday),
      };
    });
  }

  // One item per line. Kept raw (untrimmed, blank lines included) while typing
  // so Enter and spaces behave normally; cleanMenu tidies it on save. Lines
  // past the per-meal cap are dropped rather than overflowing the display.
  function setMealText(day: MenuDayKey, meal: MenuMealKey, text: string) {
    const lines = text.split("\n").slice(0, WEEKLY_MENU_LIMITS.maxItemsPerMeal);
    const field = menuLang === "en" ? "items" : "itemsEs";
    setDraft((d) => {
      const current = d.menu ?? emptyMenu();
      return {
        ...d,
        menu: {
          ...current,
          days: {
            ...current.days,
            [day]: {
              ...current.days[day],
              [meal]: { ...current.days[day][meal], [field]: lines },
            },
          },
        },
      };
    });
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const path = await uploadSlideImage(file);
    setUploading(false);
    if (!path) {
      setError("Image upload failed. Please try again.");
      return;
    }
    set("imagePath", path);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    setWarnings([]);
    const submitted = draft;
    // Spanish is filled in for whatever English changed since the last save.
    // translateSlide never fails the save: at worst it hands the input back
    // unchanged with a warning, and the slide saves with Spanish as typed.
    const translated = await translateSlide(toInput(baseline), toInput(submitted));
    const input = translated.input;
    const err = await updateSlide(submitted.id, input);
    setSaving(false);
    if (err) {
      // The draft is left exactly as typed so nothing is lost
      setError(`Not saved: ${err}`);
      return;
    }
    setWarnings(translated.warnings);
    const savedSlide = { ...submitted, ...input };
    setBaseline(savedSlide);
    // Show the new Spanish in the fields and preview. If staff kept typing
    // while the save ran, keep their draft instead (it now differs from the
    // baseline, so it reads as unsaved and the next save translates it).

    setDraft((d) => (d === submitted ? savedSlide : d));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved?.();
  }

  const currentImg = slideImageUrl(draft.imagePath);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <p className={labelClass}>Layout</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
            {/* Lost & found stays out of the picker while its flag is off, unless
                this slide already uses it (so the current choice still shows). */}
            {SLIDE_TEMPLATES.filter(
              (t) => t.key !== "lost-found" || SHOW_LOST_FOUND || draft.template === "lost-found",
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => set("template", t.key as SlideTemplate)}
                className={`border-2 px-3 py-2 text-left text-base font-semibold ${
                  draft.template === t.key
                    ? "border-blue bg-blue/5 text-blue"
                    : "border-ink/30 hover:border-blue"
                }`}
              >
                {t.label}
                <span className="block text-sm font-normal text-ink/60">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Any color, same picker the calendar uses for event colors. Text,
            eyebrow, leaf, and list markers are derived from the choice (see
            lib/slideBackgrounds), so nothing here can be made unreadable. The
            value is resolved first because slides saved before this picker
            existed store a brand name rather than a hex. */}
        <div>
          <ColorPicker
            label="Background color"
            value={resolveSlideBackground(draft.background)}
            onChange={(v) => set("background", v)}
            presets={SLIDE_BACKGROUND_PRESETS}
          />
          <p className="mt-1 text-sm text-ink/60">
            The preview below shows the exact colors the display will use.
          </p>
        </div>

        <fieldset>
          <legend className={labelClass}>Display locations</legend>
          <p className="text-sm text-ink/60">
            Choose All locations for shared announcements, or select one or more
            buildings for a targeted slide.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={draft.locationIds.length === 0}
              onClick={() => set("locationIds", [])}
              className={`min-h-12 border-2 px-3 py-2 text-left text-base font-semibold ${
                draft.locationIds.length === 0
                  ? "border-blue bg-blue/5 text-blue"
                  : "border-ink/30 hover:border-blue"
              }`}
            >
              All locations
              <span className="block text-sm font-normal text-ink/60">
                Includes the main /information URL
              </span>
            </button>
            {locations.map((location) => {
              const checked = draft.locationIds.includes(location.id);
              return (
                <label
                  key={location.id}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 border-2 px-3 py-2 text-base font-semibold ${
                    checked
                      ? "border-blue bg-blue/5 text-blue"
                      : "border-ink/30 hover:border-blue"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-blue"
                    checked={checked}
                    onChange={() =>
                      set(
                        "locationIds",
                        checked
                          ? draft.locationIds.filter((id) => id !== location.id)
                          : [...draft.locationIds, location.id],
                      )
                    }
                  />
                  {location.name}
                </label>
              );
            })}
          </div>
          {locations.length === 0 && (
            <p className="mt-2 text-sm text-ink/60">
              Add a display location above to target this slide to a building.
            </p>
          )}
        </fieldset>

        {/* Templates WITH a headline use `title` for two jobs at once: the words
            on the wall AND the name of this page in the sidebar, the panel
            header, and the delete prompts. Templates without a headline still
            need the second job done — otherwise every "Image with caption" page
            sits in the list as "New slide" and staff cannot tell them apart. So
            the same column is offered here as an off-screen page name. It is
            never rendered by SlideTemplateView's image-focus branch. */}
        {!uses.title && (
          <Field
            label="Page name"
            hint="Names this page in the list on the left. It is not shown on the display."
            value={draft.title}
            onChange={(v) => set("title", v)}
            maxLength={SLIDE_LIMITS.title}
          />
        )}
        {uses.menu && (
          <label className="block">
            <span className={labelClass}>Week of</span>
            <span className="block text-sm text-ink/60">
              Pick any day of the week. It snaps to that Monday and fills in
              both titles below.
            </span>
            <input
              type="date"
              className={`${inputClass} sm:w-auto`}
              value={menu.weekOf ?? ""}
              onChange={(e) => pickWeek(e.target.value)}
            />
            {menu.weekOf && (
              <span className="mt-1 block text-sm text-ink/60">
                Monday to Sunday: {weekRangeLabel(menu.weekOf)}
              </span>
            )}
          </label>
        )}
        {/* English is typed here; Spanish is filled in automatically on save
            (translateSlide.server) and sits behind "Edit Spanish manually"
            for corrections, the same as the built-in page editors. */}
        {uses.title && (
          <BilingualField
            label="Title"
            value={draft.title}
            onChange={(v) => set("title", v)}
            valueEs={draft.titleEs}
            onChangeEs={(v) => set("titleEs", v)}
            maxLength={titleLimit}
          />
        )}
        {uses.event && (
          <fieldset className="space-y-4 border-2 border-placeholder p-3">
            <legend className="px-1 text-base font-bold text-blue">When and where</legend>
            <p className="text-sm text-ink/60">
              Shown big so it can be read from across the room. Leave anything
              you don&rsquo;t know blank and it is left off the slide.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block min-w-0">
                <span className={labelClass}>Date</span>
                <input
                  type="date"
                  className={inputClass}
                  value={flyer.date ?? ""}
                  onChange={(e) => setFlyer({ date: e.target.value || null })}
                />
              </label>
              <label className="block min-w-0">
                <span className={labelClass}>Starts</span>
                <input
                  type="time"
                  className={inputClass}
                  value={flyer.startTime ?? ""}
                  onChange={(e) => setFlyer({ startTime: e.target.value || null })}
                />
              </label>
              <label className="block min-w-0">
                <span className={labelClass}>Ends (optional)</span>
                <input
                  type="time"
                  className={inputClass}
                  value={flyer.endTime ?? ""}
                  disabled={!flyer.startTime}
                  onChange={(e) => setFlyer({ endTime: e.target.value || null })}
                />
              </label>
            </div>
            {(flyerDate || flyerTime) && (
              <p className="text-sm text-ink/60">
                Shows as: {[flyerDate?.en, flyerTime].filter(Boolean).join(" · ")}
                {flyerDate && ` (${flyerDate.es})`}
              </p>
            )}
            <BilingualField
              label="Location"
              hint="Building or room, e.g. Dining Hall."
              value={flyer.location}
              onChange={(v) => setFlyer({ location: v })}
              valueEs={flyer.locationEs}
              onChangeEs={(v) => setFlyer({ locationEs: v })}
              maxLength={EVENT_FLYER_LIMITS.location}
            />
          </fieldset>
        )}
        {uses.resources && (
          <div className="space-y-3">
            <div>
              <p className={labelClass}>Services</p>
              <p className="text-sm text-ink/60">
                3 to 6 fill the screen best: 3 sit in one row, 4 in two rows of
                two, 5 or 6 in two rows of three. The phone number is shown
                largest. A service with no name and no phone is left off.
              </p>
            </div>
            {services.map((service, i) => {
              const Icon = resourceIcon(service.icon);
              return (
                <fieldset key={service.id} className="space-y-3 border-2 border-placeholder p-3">
                  <legend className="px-1 text-base font-bold text-blue">
                    Service {i + 1}
                    {service.name.trim() && ` · ${service.name.trim()}`}
                  </legend>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="block min-w-0 flex-1">
                      <span className={labelClass}>Icon</span>
                      <select
                        className={inputClass}
                        value={service.icon}
                        onChange={(e) =>
                          updateService(service.id, { icon: e.target.value as ResourceIconKey })
                        }
                      >
                        {RESOURCE_ICONS.map((icon) => (
                          <option key={icon.key} value={icon.key}>
                            {icon.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Icon size={44} weight="bold" className="mb-1 shrink-0 text-blue" aria-hidden="true" />
                  </div>
                  <BilingualField
                    label="Name"
                    value={service.name}
                    onChange={(v) => updateService(service.id, { name: v })}
                    valueEs={service.nameEs}
                    onChangeEs={(v) => updateService(service.id, { nameEs: v })}
                    maxLength={RESOURCE_CARD_LIMITS.name}
                  />
                  <Field
                    label="Phone"
                    hint="Digits and ( ) - + . only, x for an extension, e.g. (209) 555-0123 or 209-555-0123 x2."
                    value={service.phone}
                    onChange={(v) => updateService(service.id, { phone: cleanPhoneInput(v) })}
                    maxLength={RESOURCE_CARD_LIMITS.phone}
                  />
                  <BilingualField
                    label="Hours"
                    hint="e.g. Mon–Fri, 9 AM – 3 PM"
                    value={service.hours}
                    onChange={(v) => updateService(service.id, { hours: v })}
                    valueEs={service.hoursEs}
                    onChangeEs={(v) => updateService(service.id, { hoursEs: v })}
                    maxLength={RESOURCE_CARD_LIMITS.hours}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={smallBtn}
                      disabled={i === 0}
                      onClick={() => moveService(i, -1)}
                      aria-label={`Move service ${i + 1} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={smallBtn}
                      disabled={i === services.length - 1}
                      onClick={() => moveService(i, 1)}
                      aria-label={`Move service ${i + 1} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={smallBtn}
                      onClick={() => setServices(services.filter((sv) => sv.id !== service.id))}
                    >
                      Remove
                    </button>
                  </div>
                </fieldset>
              );
            })}
            <button
              type="button"
              className={`${smallBtn} disabled:cursor-not-allowed disabled:opacity-45`}
              disabled={services.length >= MAX_RESOURCE_SERVICES}
              onClick={() => setServices([...services, newResourceService()])}
            >
              + Add service
            </button>
            {services.length >= MAX_RESOURCE_SERVICES && (
              <p className="text-sm font-semibold text-ink/60">
                Maximum of {MAX_RESOURCE_SERVICES} fits on the display.
              </p>
            )}
          </div>
        )}
        {uses.cards && (
          <div className="space-y-3">
            <div>
              <p className={labelClass}>Grid</p>
              <div role="group" aria-label="Grid layout" className="mt-2 grid gap-2 sm:grid-cols-2">
                {CARD_GRID_LAYOUTS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    aria-pressed={grid.layout === l.key}
                    onClick={() => setGrid({ layout: l.key })}
                    className={`min-h-12 border-2 px-3 py-2 text-left text-base font-semibold ${
                      grid.layout === l.key
                        ? "border-blue bg-blue/5 text-blue"
                        : "border-ink/30 hover:border-blue"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-ink/60">
                Leave a card empty and it is left off; the others spread out to
                fill the space.
              </p>
              {hiddenCardCount > 0 && (
                <p className="mt-1 text-sm font-semibold text-ink/70">
                  {hiddenCardCount === 1 ? "1 card is" : `${hiddenCardCount} cards are`} kept
                  from the 3 × 2 layout but not shown in 2 × 2.
                </p>
              )}
            </div>
            {grid.cards.slice(0, gridSlots).map((card, i) => (
              <fieldset key={card.id} className="space-y-3 border-2 border-placeholder p-3">
                <legend className="px-1 text-base font-bold text-blue">
                  Card {i + 1}
                  {card.title.trim() && ` · ${card.title.trim()}`}
                </legend>
                <BilingualField
                  label="Card title"
                  value={card.title}
                  onChange={(v) => updateCard(card.id, { title: v })}
                  valueEs={card.titleEs}
                  onChangeEs={(v) => updateCard(card.id, { titleEs: v })}
                  maxLength={CARD_GRID_LIMITS.cardTitle}
                />
                <BilingualField
                  label="Card text"
                  hint="A line or two."
                  value={card.text}
                  onChange={(v) => updateCard(card.id, { text: v })}
                  valueEs={card.textEs}
                  onChangeEs={(v) => updateCard(card.id, { textEs: v })}
                  textarea
                  maxLength={CARD_GRID_LIMITS.cardText}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={smallBtn}
                    disabled={i === 0}
                    onClick={() => moveCard(i, -1)}
                    aria-label={`Move card ${i + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={smallBtn}
                    disabled={i === gridSlots - 1}
                    onClick={() => moveCard(i, 1)}
                    aria-label={`Move card ${i + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={smallBtn}
                    onClick={() =>
                      updateCard(card.id, { title: "", titleEs: "", text: "", textEs: "" })
                    }
                  >
                    Clear
                  </button>
                </div>
              </fieldset>
            ))}
          </div>
        )}
        {uses.weather && (
          <div className="space-y-4">
            <div className="border-l-4 border-blue pl-3 text-sm text-ink/80">
              <p className="font-semibold">Forecast for {WEATHER_PLACE.en}, updated automatically</p>
              {forecastDays[0] ? (
                <p>
                  Today: high {forecastDays[0].high}°, low {forecastDays[0].low}°
                  {weatherCondition(forecastDays[0].code) &&
                    `, ${weatherCondition(forecastDays[0].code)!.en.toLowerCase()}`}
                  . The slide shows today and the next four days.
                </p>
              ) : (
                <p>
                  The forecast isn&rsquo;t available right now. The slide will show
                  just your note until it comes back, and sits out of the rotation if
                  there is no note either.
                </p>
              )}
            </div>
            <BilingualField
              label="Note (optional)"
              hint="Shown in a band under the forecast, e.g. “Cooling center open in the Dining Hall until 8 PM.”"
              value={weatherSlide.note}
              onChange={(v) => setWeather({ note: v })}
              valueEs={weatherSlide.noteEs}
              onChangeEs={(v) => setWeather({ noteEs: v })}
              maxLength={WEATHER_LIMITS.note}
            />
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-blue"
                checked={weatherSlide.autoNotice}
                onChange={(e) => setWeather({ autoNotice: e.target.checked })}
              />
              <span>
                <span className={labelClass}>Automatic heat and cold notice</span>
                <span className="block text-sm text-ink/60">
                  When there is no note above, shows a safety notice on days at or
                  above {HEAT_NOTICE_F}° or nights at or below {COLD_NOTICE_F}°. Your
                  note always replaces it.
                </span>
                {weatherSlide.autoNotice && !weatherSlide.note.trim() && (
                  <span className="mt-1 block text-sm font-semibold text-ink/80">
                    {autoNoticeNow
                      ? `Showing now: “${autoNoticeNow.en}”`
                      : "Not showing now: the forecast is within the normal range."}
                  </span>
                )}
              </span>
            </label>
          </div>
        )}
        {uses.lostFound && !SHOW_LOST_FOUND && (
          <p className="border-l-4 border-blue pl-3 text-sm font-semibold text-ink/80">
            Lost &amp; found is turned off (SHOW_LOST_FOUND in siteConfig), so this
            slide is not shown on the bulletin. Pick another layout, or ask a
            developer to turn the feature on.
          </p>
        )}
        {uses.lostFound && SHOW_LOST_FOUND && <LostFoundManager locations={locations} />}
        {uses.body && (
          <BilingualField
            label={uses.event ? "Description" : "Body text"}
            hint={uses.event ? "A sentence or two: who it is for and what to bring." : undefined}
            value={draft.body}
            onChange={(v) => set("body", v)}
            valueEs={draft.bodyEs}
            onChangeEs={(v) => set("bodyEs", v)}
            textarea
            rows={uses.event ? 3 : 4}
            maxLength={bodyLimit}
          />
        )}
        {uses.caption && (
          <BilingualField
            label="Caption"
            hint="Short line shown under the image."
            value={draft.caption}
            onChange={(v) => set("caption", v)}
            valueEs={draft.captionEs}
            onChangeEs={(v) => set("captionEs", v)}
            maxLength={SLIDE_LIMITS.caption}
          />
        )}
        {uses.items && (
          <div className="space-y-3">
            <div>
              <p className={labelClass}>List items</p>
              <div className="mt-2">
                <StringListEditor
                  items={draft.items}
                  onChange={(items) => set("items", items)}
                  maxItems={SLIDE_LIMITS.maxItems}
                  maxLength={SLIDE_LIMITS.item}
                />
              </div>
            </div>
            <div>
              <p className={labelClass}>List items (Español)</p>
              <p className="text-sm text-ink/60">
                Filled in automatically when you save; edit here to correct.
                Same order as English; each line pairs with the English item
                above it.
              </p>
              <div className="mt-2">
                <StringListEditor
                  items={draft.itemsEs}
                  onChange={(items) => set("itemsEs", items)}
                  maxItems={SLIDE_LIMITS.maxItems}
                  maxLength={SLIDE_LIMITS.item}
                />
              </div>
            </div>
          </div>
        )}
        {uses.menu && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={labelClass}>Menu</p>
                <p className="text-sm text-ink/60">
                  One item per line, up to {WEEKLY_MENU_LIMITS.maxItemsPerMeal}{" "}
                  per meal. Leave a meal empty if nothing is served.
                </p>
              </div>
              <div role="group" aria-label="Menu language" className="flex">
                {(["en", "es"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    aria-pressed={menuLang === lang}
                    onClick={() => setMenuLang(lang)}
                    className={`min-h-11 border-2 px-4 py-1 text-base font-semibold ${
                      menuLang === lang
                        ? "border-blue bg-blue text-paper"
                        : "border-ink/30 hover:border-blue"
                    }`}
                  >
                    {lang === "en" ? "English" : "Español"}
                  </button>
                ))}
              </div>
            </div>
            {menuLang === "es" && (
              <p className="text-sm text-ink/60">
                Spanish is filled in automatically when you save; edit here to
                correct it. Each Spanish line pairs with the English line in
                the same place, and the grey text is that English.
              </p>
            )}
            {MENU_DAYS.map((d) => (
              <fieldset key={d.key} className="border-2 border-placeholder p-3">
                <legend className="px-1 text-base font-bold text-blue">
                  {d.label} · {d.labelEs}
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {MENU_MEALS.map((m) => {
                    const meal = menu.days[d.key][m.key];
                    const text = (menuLang === "en" ? meal.items : meal.itemsEs).join("\n");
                    return (
                      <label key={m.key} className="block min-w-0">
                        <span className="block text-sm font-semibold">
                          {menuLang === "en" ? m.label : m.labelEs}
                        </span>
                        <textarea
                          className={`${inputClass} resize-y`}
                          rows={3}
                          value={text}
                          maxLength={WEEKLY_MENU_LIMITS.cell}
                          placeholder={
                            menuLang === "en" ? "One item per line" : meal.items.join("\n")
                          }
                          onChange={(e) => setMealText(d.key, m.key, e.target.value)}
                        />
                        <CharCount value={text} max={WEEKLY_MENU_LIMITS.cell} />
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
        {uses.image && (
          <div>
            <p className={labelClass}>
              {uses.event ? "Image (optional)" : "Image / logo"}
            </p>
            <p className="text-sm text-ink/60">
              {uses.event
                ? "A flyer photo or logo. Without one, the date and place get the extra room."
                : "Fitted automatically into the layout’s image slot."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 lg:flex-nowrap">
              <label className={`${smallBtn} cursor-pointer`}>
                {uploading ? "Uploading…" : currentImg ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickImage}
                />
              </label>
              {currentImg && (
                <button
                  type="button"
                  className={smallBtn}
                  onClick={() => set("imagePath", null)}
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-1 lg:flex-nowrap">
          <button
            type="button"
            onClick={save}
            disabled={saving || uploading}
            className="border-2 border-blue bg-blue px-6 py-2 text-base font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save slide"}
          </button>
          {saved && <span className="text-base font-semibold text-blue">✓ Saved</span>}
          {dirty && !saving && !saved && !error && (
            <span className="text-base text-ink/60">Unsaved changes</span>
          )}
          {error && (
            <span role="alert" className="text-base font-semibold text-blue">
              {error}
            </span>
          )}
        </div>
        {warnings.length > 0 && (
          <div role="status" className="border-l-4 border-blue pl-3 text-sm text-ink/80">
            <p className="font-semibold">Saved, with translation notes:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div>
        <p className={labelClass}>Preview</p>
        <div className="mt-2">
          <BulletinCanvasPreview label="Preview of this slide as it appears on the display">
            <SlideTemplateView slide={draft} animate={false} />
          </BulletinCanvasPreview>
        </div>
        <p className="mt-2 text-sm text-ink/60">
          Exactly how the slide appears in the rotating display, including the
          live bed-availability panel that sits on top of it.
        </p>
      </div>
    </div>
  );
}

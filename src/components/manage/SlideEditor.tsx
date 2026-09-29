"use client";

import { useEffect, useState } from "react";
import {
  updateSlide,
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
  SLIDE_LIMITS,
  WEEKLY_MENU_LIMITS,
  slideBodyLimit,
} from "@/lib/bulletinLimits";
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

// Which fields each template uses.
const USES = {
  "title-body": { title: true, body: true, items: false, image: false, caption: false, menu: false },
  "title-image-text": { title: true, body: true, items: false, image: true, caption: false, menu: false },
  "image-focus": { title: false, body: false, items: false, image: true, caption: true, menu: false },
  "title-list": { title: true, body: false, items: true, image: false, caption: false, menu: false },
  "weekly-menu": { title: true, body: false, items: false, image: false, caption: false, menu: true },
} as const;

export default function SlideEditor({
  slide,
  onSaved,
}: {
  slide: Slide;
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState<Slide>(slide);
  // Re-seed only when a genuinely different slide is passed (keeps in-progress
  // edits from being clobbered by realtime refreshes of the same slide).
  useEffect(() => setDraft(slide), [slide.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locations = useBulletinLocations(`slide-editor-${slide.id}`);
  // Which language the weekly-menu grid is editing. Spanish is typed by hand
  // for now, like every other custom slide field.
  const [menuLang, setMenuLang] = useState<"en" | "es">("en");

  const set = <K extends keyof Slide>(k: K, v: Slide[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const uses = USES[draft.template];
  // "Title + image + text" gives the paragraph a half-width column, so it holds
  // less than the full-width layouts.
  const bodyLimit = slideBodyLimit(draft.template);
  const titleLimit = uses.menu ? WEEKLY_MENU_LIMITS.title : SLIDE_LIMITS.title;

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
    const err = await updateSlide(draft.id, {
      template: draft.template,
      background: draft.background,
      title: draft.title.trim(),
      titleEs: draft.titleEs.trim(),
      body: draft.body.trim(),
      bodyEs: draft.bodyEs.trim(),
      items: draft.items.map((s) => s.trim()).filter(Boolean),
      itemsEs: draft.itemsEs.map((s) => s.trim()).filter(Boolean),
      caption: draft.caption.trim(),
      captionEs: draft.captionEs.trim(),
      imagePath: draft.imagePath,
      menu: draft.menu ? cleanMenu(draft.menu) : null,
      locationIds: draft.locationIds,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
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
            {SLIDE_TEMPLATES.map((t) => (
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
        {uses.title && (
          <div className="space-y-2">
            <Field
              label="Title"
              value={draft.title}
              onChange={(v) => set("title", v)}
              maxLength={titleLimit}
            />
            <Field
              label="Title (Español)"
              value={draft.titleEs}
              onChange={(v) => set("titleEs", v)}
              maxLength={titleLimit}
            />
          </div>
        )}
        {uses.body && (
          <div className="space-y-2">
            <Field
              label="Body text"
              value={draft.body}
              onChange={(v) => set("body", v)}
              textarea
              rows={4}
              maxLength={bodyLimit}
            />
            <Field
              label="Body text (Español)"
              value={draft.bodyEs}
              onChange={(v) => set("bodyEs", v)}
              textarea
              rows={4}
              maxLength={bodyLimit}
            />
          </div>
        )}
        {uses.caption && (
          <div className="space-y-2">
            <Field
              label="Caption"
              hint="Short line shown under the image."
              value={draft.caption}
              onChange={(v) => set("caption", v)}
              maxLength={SLIDE_LIMITS.caption}
            />
            <Field
              label="Caption (Español)"
              value={draft.captionEs}
              onChange={(v) => set("captionEs", v)}
              maxLength={SLIDE_LIMITS.caption}
            />
          </div>
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
                Each Spanish line pairs with the English line in the same
                place. The grey text is the English to translate; a meal left
                blank shows English only.
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
            <p className={labelClass}>Image / logo</p>
            <p className="text-sm text-ink/60">
              Fitted automatically into the layout&rsquo;s image slot.
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
          {error && (
            <span role="alert" className="text-base font-semibold text-blue">
              {error}
            </span>
          )}
        </div>
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

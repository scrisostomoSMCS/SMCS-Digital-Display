"use client";

import { useEffect, useRef, useState } from "react";
import {
  updateSlide,
  uploadSlideImage,
  slideImageUrl,
  SLIDE_TEMPLATES,
  SLIDE_BACKGROUNDS,
  type Slide,
  type SlideTemplate,
  type SlideBackground,
} from "@/lib/slides";
import SlideTemplateView from "@/components/information/SlideTemplateView";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  canvasStyle,
} from "@/lib/bulletinCanvas";
import { useBulletinLocations } from "./LocationBadges";
import { Field, StringListEditor, labelClass, smallBtn } from "./editorFields";

/*
  Structured editor for one custom slide, used inline on the manage page. Employees
  pick a layout + brand color, fill in text, and upload an image into a fitted
  slot, no free positioning, no font/color control. The live preview renders the
  EXACT display component (SlideTemplateView) scaled down, so it always matches
  the wall screen. Saves to Supabase; the rotation updates via realtime.
*/

// Which fields each template uses.
const USES = {
  "title-body": { title: true, body: true, items: false, image: false, caption: false },
  "title-image-text": { title: true, body: true, items: false, image: true, caption: false },
  "image-focus": { title: false, body: false, items: false, image: true, caption: true },
  "title-list": { title: true, body: false, items: true, image: false, caption: false },
} as const;

// Live preview: render the real display component on the real bulletin canvas
// and scale it into the available width (proportions stay identical to the wall
// screen). canvasStyle is what makes this a true preview: the slide's breakpoints
// are container queries against the canvas, so without it they would resolve
// against the admin's browser window and show a layout the wall screen never uses.
function Preview({ slide }: { slide: Slide }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / CANVAS_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden border-2 border-placeholder"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ ...canvasStyle, transform: `scale(${scale})` }}
      >
        <SlideTemplateView slide={slide} animate={false} />
      </div>
    </div>
  );
}

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

  const set = <K extends keyof Slide>(k: K, v: Slide[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const uses = USES[draft.template];

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

        <div>
          <p className={labelClass}>Background color</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-nowrap">
            {SLIDE_BACKGROUNDS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => set("background", b.key as SlideBackground)}
                className={`flex items-center gap-2 border-2 px-3 py-2 text-base font-semibold ${
                  draft.background === b.key ? "border-blue" : "border-ink/30"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 border border-ink/20 ${
                    b.key === "blue" ? "bg-blue" : b.key === "teal" ? "bg-teal" : "bg-paper"
                  }`}
                />
                {b.label}
              </button>
            ))}
          </div>
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

        {uses.title && (
          <div className="space-y-2">
            <Field
              label="Title"
              value={draft.title}
              onChange={(v) => set("title", v)}
            />
            <Field
              label="Title (Español)"
              value={draft.titleEs}
              onChange={(v) => set("titleEs", v)}
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
            />
            <Field
              label="Body text (Español)"
              value={draft.bodyEs}
              onChange={(v) => set("bodyEs", v)}
              textarea
              rows={4}
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
            />
            <Field
              label="Caption (Español)"
              value={draft.captionEs}
              onChange={(v) => set("captionEs", v)}
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
                />
              </div>
            </div>
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
          <Preview slide={draft} />
        </div>
        <p className="mt-2 text-sm text-ink/60">
          Exactly how the slide appears in the rotating display.
        </p>
      </div>
    </div>
  );
}

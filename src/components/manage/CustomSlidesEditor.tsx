"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchSlides,
  updateSlide,
  deleteSlide,
  swapSlidePositions,
  type Slide,
} from "@/lib/slides";
import { Field, Group, StringListEditor, smallBtn } from "./editorFields";

/*
  Editor for employee-created slides. Reuses the same field/group pattern as the
  info-content editor. Each slide is its own jump target (id "slide-<id>") so the
  sidebar can link to it. Stays in sync via realtime on the slides table.
*/

// One slide's editable form. Local state is seeded once so edits aren't clobbered
// when the parent re-loads (e.g. after another slide is added).
function SlideEditor({
  slide,
  index,
  count,
  onMove,
  onDeleted,
}: {
  slide: Slide;
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(slide.title);
  const [body, setBody] = useState(slide.body);
  const [items, setItems] = useState<string[]>(slide.items);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const err = await updateSlide(slide.id, {
      title: title.trim(),
      body: body.trim(),
      items: items.map((s) => s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (!err) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this slide? This can’t be undone.")) return;
    await deleteSlide(slide.id);
    onDeleted();
  }

  return (
    <Group
      id={`slide-${slide.id}`}
      title={title.trim() || "Untitled slide"}
      action={
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className={smallBtn}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move slide up"
          >
            ↑
          </button>
          <button
            type="button"
            className={smallBtn}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            aria-label="Move slide down"
          >
            ↓
          </button>
        </div>
      }
    >
      <Field label="Title" value={title} onChange={setTitle} />
      <Field
        label="Message"
        value={body}
        onChange={setBody}
        textarea
        rows={3}
      />
      <div>
        <p className="text-base font-semibold">List items</p>
        <div className="mt-2">
          <StringListEditor items={items} onChange={setItems} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="border-2 border-blue bg-blue px-5 py-2 text-base font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save slide"}
        </button>
        {saved && (
          <span className="text-base font-semibold text-blue">✓ Saved</span>
        )}
        <button
          type="button"
          onClick={remove}
          className="ml-auto border-2 border-teal px-5 py-2 text-base font-semibold text-teal hover:bg-teal hover:text-paper"
        >
          Delete slide
        </button>
      </div>
    </Group>
  );
}

export default function CustomSlidesEditor() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setSlides(await fetchSlides());
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("slides-editor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "slides" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function move(index: number, dir: -1 | 1) {
    const other = slides[index + dir];
    if (!other) return;
    await swapSlidePositions(slides[index], other);
    // realtime will refresh order
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-lg">
        Slides you create appear in the rotating display after the built-in
        pages. Add one with <strong>“Add new slide”</strong> in the sidebar.
      </p>

      {loaded && slides.length === 0 ? (
        <p className="text-lg text-ink/60">No custom slides yet.</p>
      ) : (
        slides.map((s, i) => (
          <SlideEditor
            key={s.id}
            slide={s}
            index={i}
            count={slides.length}
            onMove={(dir) => move(i, dir)}
            onDeleted={load}
          />
        ))
      )}
    </div>
  );
}

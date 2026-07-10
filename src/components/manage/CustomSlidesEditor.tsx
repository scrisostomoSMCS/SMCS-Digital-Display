"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchSlides, swapSlidePositions, type Slide } from "@/lib/slides";
import SlideEditor from "./SlideEditor";
import { smallBtn } from "./editorFields";

/*
  Inline editors for the employee-created slides — one collapsible card per slide,
  each a full structured editor (SlideEditor). Reactive: adding a slide makes its
  card appear (and auto-expands it) with no refresh. Each card is a jump target
  (id "slide-<id>") for the sidebar.
*/
export default function CustomSlidesEditor() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const known = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const next = await fetchSlides();
    // A brand-new slide (id not seen before) is auto-expanded + scrolled to.
    const added = next.find((s) => !known.current.has(s.id));
    known.current = new Set(next.map((s) => s.id));
    setSlides(next);
    setLoaded(true);
    if (added) {
      setExpandedId(added.id);
      setTimeout(
        () =>
          document
            .getElementById(`slide-${added.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        120,
      );
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("custom-slides-editor")
      .on("postgres_changes", { event: "*", schema: "public", table: "slides" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Expand + scroll when the sidebar links here via the URL hash.
  useEffect(() => {
    const onHash = () => {
      const m = location.hash.match(/^#slide-(.+)$/);
      if (!m) return;
      setExpandedId(m[1]);
      setTimeout(
        () =>
          document
            .getElementById(`slide-${m[1]}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50,
      );
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [slides.length]);

  async function move(i: number, dir: -1 | 1) {
    const other = slides[i + dir];
    if (other) await swapSlidePositions(slides[i], other);
  }

  if (loaded && slides.length === 0) {
    return (
      <p className="text-lg text-ink/60">
        No custom slides yet. Use <strong>“Add new slide”</strong> in the sidebar
        to create one.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {slides.map((s, i) => {
        const open = expandedId === s.id;
        return (
          <section
            key={s.id}
            id={`slide-${s.id}`}
            className="scroll-mt-8 border-2 border-placeholder"
          >
            <div className="flex items-center justify-between gap-3 bg-ink/5 px-5 py-3">
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : s.id)}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span aria-hidden="true" className="text-lg text-ink/50">
                  {open ? "▾" : "▸"}
                </span>
                <span className="truncate text-xl font-bold text-blue">
                  {s.title.trim() || "Untitled slide"}
                </span>
              </button>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className={smallBtn}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move slide up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={smallBtn}
                  disabled={i === slides.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move slide down"
                >
                  ↓
                </button>
              </div>
            </div>
            {open && (
              <div className="p-5">
                <SlideEditor slide={s} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

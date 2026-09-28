"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchSlides, persistSlideOrder, type Slide } from "@/lib/slides";
import type { BulletinLocation } from "@/lib/bulletinLocations";
import SlideEditor from "./SlideEditor";
import LocationBadges, { useBulletinLocations } from "./LocationBadges";
import UpdatedAt from "./UpdatedAt";
import { smallBtn } from "./editorFields";
import { useSidebarNames } from "./useSidebarNames";
import { customSlideNameKey } from "@/lib/displaySettings";

/*
  Inline editors for employee-created slides, one collapsible panel per slide
  (collapsed by default so the page is a compact, scannable list). Reorder by
  dragging the grip handle OR the ↑/↓ buttons; the new order persists to Supabase
  (position) and drives the rotation. Reactive: a newly added slide's panel
  appears and auto-expands. Each panel is a jump target (id "slide-<id>").

  Each header also reports when that slide's content last changed, for staff
  only. The public Digital Bulletin never shows it.
*/

function SlidePanel({
  slide,
  name,
  locations,
  index,
  count,
  open,
  savedAt,
  onToggle,
  onMove,
  onDragEnd,
  onSaved,
}: {
  slide: Slide;
  // The sidebar rename, if any; the slide's own title otherwise.
  name?: string;
  locations: BulletinLocation[];
  index: number;
  count: number;
  open: boolean;
  // Set the moment this slide saves, so the header reads "Updated just now"
  // without waiting for the realtime round trip. See CustomSlidesEditor.
  savedAt: string | null;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onDragEnd: () => void;
  onSaved: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={slide}
      id={`slide-${slide.id}`}
      dragListener={false} // only the grip handle starts a drag
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="scroll-mt-8 border-2 border-placeholder bg-paper"
    >
      <div className="flex flex-wrap items-center gap-2 bg-ink/5 px-3 py-3 lg:flex-nowrap">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none text-ink/40 hover:text-ink active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical size={22} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-left"
        >
          <span aria-hidden="true" className="text-lg text-ink/50">
            {open ? "▾" : "▸"}
          </span>
          <span className="truncate text-xl font-bold text-blue">
            {name || slide.title.trim() || "Untitled slide"}
          </span>
          <LocationBadges
            locationIds={slide.locationIds}
            locations={locations}
            expanded={open}
          />
          {/* Prefer the just-saved time over the row's: a save the realtime
              refresh has not delivered yet would otherwise still show the
              PREVIOUS edit's timestamp, which reads as a failed save. */}
          <UpdatedAt at={savedAt ?? slide.updatedAt} />
        </button>
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
      </div>
      {open && (
        <div className="p-3 lg:p-5">
          <SlideEditor slide={slide} onSaved={onSaved} />
        </div>
      )}
    </Reorder.Item>
  );
}

export default function CustomSlidesEditor() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const known = useRef<Set<string>>(new Set());
  const firstLoadDone = useRef(false);
  const slidesRef = useRef<Slide[]>([]);
  slidesRef.current = slides;
  /*
    Per-slide "saved at" times, held only until the realtime refresh brings the
    row's own updated_at back. Keyed by slide id rather than a single value
    because each panel saves on its own, and saving one must not relabel
    another. Cleared for a slide once its refreshed row is at least as new.
  */
  const [savedAt, setSavedAt] = useState<Record<string, string>>({});
  const locations = useBulletinLocations("custom-slides-editor");
  const names = useSidebarNames("custom-slides-editor");

  const expand = (id: string) => setOpen((p) => new Set(p).add(id));
  const toggle = (id: string) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const load = useCallback(async () => {
    const next = await fetchSlides();
    // Only auto-expand/scroll to a slide that appears AFTER the first load.
    // On the initial load every existing slide is "new", so skip it, otherwise
    // the page would jump down to the slides section when you open Manage.
    const isFirstLoad = !firstLoadDone.current;
    firstLoadDone.current = true;
    const added = isFirstLoad
      ? undefined
      : next.find((s) => !known.current.has(s.id));
    known.current = new Set(next.map((s) => s.id));
    setSlides(next);
    setLoaded(true);
    // Hand a slide back to its own updated_at as soon as the database's value
    // has caught up, so the header stops showing a client-clock time.
    setSavedAt((prev) => {
      const remaining = Object.fromEntries(
        Object.entries(prev).filter(([id, at]) => {
          const row = next.find((s) => s.id === id);
          if (!row?.updatedAt) return true;
          // Parsed, not string-compared: Postgres returns "+00:00" offsets and
          // toISOString() returns "Z", so the two formats do not sort together.
          return Date.parse(row.updatedAt) < Date.parse(at);
        }),
      );
      return Object.keys(remaining).length === Object.keys(prev).length
        ? prev
        : remaining;
    });
    if (added) {
      expand(added.id);
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
      // Targeting lives in its own table, so header badges need its changes too.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "slide_locations" },
        load,
      )
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
      expand(m[1]);
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

  // Persist the current on-screen order (position = index).
  const persistOrder = () =>
    persistSlideOrder(slidesRef.current.map((s) => s.id));

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setSlides(next);
    persistSlideOrder(next.map((s) => s.id));
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
    <Reorder.Group
      as="div"
      axis="y"
      values={slides}
      onReorder={setSlides}
      className="space-y-4"
    >
      {slides.map((s, i) => (
        <SlidePanel
          key={s.id}
          slide={s}
          name={names[customSlideNameKey(s.id)]}
          locations={locations}
          index={i}
          count={slides.length}
          open={open.has(s.id)}
          savedAt={savedAt[s.id] ?? null}
          onToggle={() => toggle(s.id)}
          onMove={(dir) => move(i, dir)}
          onDragEnd={persistOrder}
          onSaved={() =>
            setSavedAt((p) => ({ ...p, [s.id]: new Date().toISOString() }))
          }
        />
      ))}
    </Reorder.Group>
  );
}

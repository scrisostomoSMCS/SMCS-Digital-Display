"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchSlides,
  fetchDeletedSlides,
  setSlideHidden,
  deleteSlide,
  createSlide,
  type Slide,
} from "@/lib/slides";
import {
  fetchHiddenBuiltins,
  setHiddenBuiltins,
  type BuiltinKey,
} from "@/lib/displaySettings";
import SlideMenu from "./SlideMenu";

/*
  Sticky manage-page navigation, grouped to mirror the page's three sections:
  Calendar, Digital Schedule Pages, and Custom Slides. Every slide in the
  rotation gets a three-dots Edit/Delete menu. Built-in Edit jumps to that
  page's existing editor; custom Edit opens the structured template editor.

  Default pages that are always needed, Services, New arrivals, Events today,
  cannot be deleted (no Delete option). Only the featured-group (pregnant women)
  page and custom slides can be removed, and removals are RECOVERABLE: hidden
  built-ins and soft-deleted custom slides appear under "Recently deleted" with
  a Restore action, so nothing is lost by accident.
*/
const BUILTINS: { key: BuiltinKey; label: string; anchor: string | null }[] = [
  { key: "services", label: "Services page", anchor: "services" },
  { key: "new-arrivals", label: "New arrivals page", anchor: "new-arrivals" },
  { key: "demographic", label: "Pregnant women page", anchor: "demographic" },
  { key: "events-today", label: "Events today", anchor: null },
];

// Default pages that can never be deleted from the rotation.
const PROTECTED: BuiltinKey[] = ["services", "new-arrivals", "events-today"];

const linkClass = (active: boolean) =>
  `flex-1 truncate border-l-4 px-4 py-2 text-left text-lg font-semibold ${
    active
      ? "border-blue bg-blue/5 text-blue"
      : "border-transparent text-ink hover:bg-ink/5 hover:text-blue"
  }`;

// Section header that marks a break between the sidebar's groups. Clickable:
// jumps to that section of the page.
function GroupTitle({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-4 pb-2 text-left"
    >
      <h2
        className={`text-lg font-bold uppercase tracking-wide hover:text-blue ${
          active ? "text-blue" : "text-ink"
        }`}
      >
        {children}
      </h2>
      <span aria-hidden="true" className="mt-1 block h-0.5 w-8 bg-teal" />
    </button>
  );
}

export default function ManageSidebar() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [deleted, setDeleted] = useState<Slide[]>([]);
  const [hidden, setHidden] = useState<BuiltinKey[]>([]);
  const [active, setActive] = useState("calendar");

  useEffect(() => {
    const loadSlides = async () => {
      setSlides(await fetchSlides());
      setDeleted(await fetchDeletedSlides());
    };
    const loadHidden = async () => setHidden(await fetchHiddenBuiltins());
    loadSlides();
    loadHidden();
    const channel = supabase
      .channel("sidebar-slides")
      .on("postgres_changes", { event: "*", schema: "public", table: "slides" }, loadSlides)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "display_settings" },
        loadHidden,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visibleBuiltins = BUILTINS.filter((b) => !hidden.includes(b.key));
  const hiddenBuiltins = BUILTINS.filter((b) => hidden.includes(b.key));
  const totalVisible = visibleBuiltins.length + slides.length;

  const spyIds = ["calendar", ...visibleBuiltins.map((b) => b.anchor).filter(Boolean)];
  const spyKey = spyIds.join("|");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 },
    );
    spyIds.forEach((id) => {
      const el = id && document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spyKey]);

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }

  // Custom slides live in the inline editor; the hash tells it to expand + scroll.
  function jumpToSlide(id: string) {
    window.location.hash = `slide-${id}`;
    document
      .getElementById(`slide-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(`slide-${id}`);
  }

  // Create a slide with sensible defaults; its inline editor appears (and
  // auto-expands) via realtime, so it's immediately editable.
  async function addSlide() {
    await createSlide({
      template: "title-body",
      background: "blue",
      title: "New slide",
      body: "",
      items: [],
      caption: "",
      imagePath: null,
    });
  }

  function guardLastSlide(): boolean {
    if (totalVisible <= 1) {
      window.alert("Keep at least one slide in the rotation.");
      return false;
    }
    return true;
  }

  async function hideBuiltin(key: BuiltinKey, label: string) {
    if (!guardLastSlide()) return;
    if (!window.confirm(`Remove “${label}” from the rotation? You can restore it below.`))
      return;
    await setHiddenBuiltins([...hidden, key]);
  }

  // Soft delete, moves the slide to "Recently deleted" (recoverable).
  async function removeCustom(slide: Slide) {
    if (!guardLastSlide()) return;
    if (
      !window.confirm(
        `Remove the slide “${slide.title || "Untitled"}”? You can restore it from “Recently deleted”.`,
      )
    )
      return;
    await setSlideHidden(slide.id, true);
  }

  async function deleteForever(slide: Slide) {
    if (
      !window.confirm(
        `Permanently delete “${slide.title || "Untitled"}”? This cannot be undone.`,
      )
    )
      return;
    await deleteSlide(slide.id);
  }

  const hasRecoverable = hiddenBuiltins.length > 0 || deleted.length > 0;

  // Highlight a section title when the reader is inside that section.
  const calendarActive = active === "calendar";
  const dspActive = ["services", "new-arrivals", "demographic"].includes(active);
  const customActive = active.startsWith("slide-");

  return (
    <nav aria-label="Manage sections" className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-6">
        {/* Calendar */}
        <GroupTitle onClick={() => jump("calendar")} active={calendarActive}>
          Calendar
        </GroupTitle>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => jump("calendar")}
              className={linkClass(active === "calendar")}
            >
              Weekly calendar
            </button>
          </li>
        </ul>

        {/* Digital Schedule Pages */}
        <div className="mt-6">
          <GroupTitle
            onClick={() => jump("digital-schedule")}
            active={dspActive}
          >
            Digital Schedule Pages
          </GroupTitle>
          <ul className="space-y-1">
            {visibleBuiltins.map((b) => {
              const deletable = !PROTECTED.includes(b.key);
              return (
                <li key={b.key} className="flex items-center pr-1">
                  <button
                    type="button"
                    onClick={() => b.anchor && jump(b.anchor)}
                    className={linkClass(!!b.anchor && active === b.anchor)}
                  >
                    {b.label}
                  </button>
                  <SlideMenu
                    onEdit={b.anchor ? () => jump(b.anchor as string) : undefined}
                    editNote="Auto-updates from calendar"
                    onDelete={
                      deletable ? () => hideBuiltin(b.key, b.label) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </div>

        {/* Custom Slides */}
        <div className="mt-6">
          <GroupTitle onClick={() => jump("custom-slides")} active={customActive}>
            Custom Slides
          </GroupTitle>
          {slides.length > 0 && (
            <ul className="space-y-1">
              {slides.map((s) => (
                <li key={s.id} className="flex items-center pr-1">
                  <button
                    type="button"
                    onClick={() => jumpToSlide(s.id)}
                    className={linkClass(active === `slide-${s.id}`)}
                  >
                    {s.title.trim() || "Untitled slide"}
                  </button>
                  <SlideMenu
                    onEdit={() => jumpToSlide(s.id)}
                    onDelete={() => removeCustom(s)}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 px-1">
            <button
              type="button"
              onClick={addSlide}
              className="flex w-full items-center gap-2 border-2 border-blue bg-blue px-4 py-2 text-lg font-semibold text-paper hover:bg-paper hover:text-blue"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                +
              </span>
              Add new slide
            </button>
          </div>
        </div>

        {/* Recovery: restore hidden built-ins or soft-deleted custom slides. */}
        {hasRecoverable && (
          <div className="mt-6 border-t-2 border-placeholder pt-3">
            <p className="px-4 pb-1 text-sm font-semibold uppercase tracking-wider text-ink/40">
              Recently deleted
            </p>
            <ul className="space-y-1">
              {hiddenBuiltins.map((b) => (
                <li key={b.key} className="flex items-center justify-between gap-2 px-4 py-1">
                  <span className="truncate text-base text-ink/50">{b.label}</span>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-semibold text-blue hover:underline"
                    onClick={() => setHiddenBuiltins(hidden.filter((k) => k !== b.key))}
                  >
                    Restore
                  </button>
                </li>
              ))}
              {deleted.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-1">
                  <span className="truncate text-base text-ink/50">
                    {s.title.trim() || "Untitled slide"}
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="text-sm font-semibold text-blue hover:underline"
                      onClick={() => setSlideHidden(s.id, false)}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-ink/40 hover:text-ink/70 hover:underline"
                      onClick={() => deleteForever(s)}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}

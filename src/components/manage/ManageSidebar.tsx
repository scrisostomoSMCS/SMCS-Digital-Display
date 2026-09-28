"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchSlides,
  fetchDeletedSlides,
  setSlideHidden,
  deleteSlide,
  createSlide,
  type Slide,
} from "@/lib/slides";
import { DEFAULT_SLIDE_BACKGROUND } from "@/lib/slideBackgrounds";
import {
  fetchHiddenBuiltins,
  setHiddenBuiltins,
  type BuiltinKey,
} from "@/lib/displaySettings";
import { fetchInfoContent } from "@/lib/infoContent";
import { openAnnouncementModal } from "@/lib/announcements";
import SlideMenu from "./SlideMenu";

/*
  Sticky manage-page navigation, grouped to mirror the page's three sections:
  Calendar, Digital Bulletin Pages, and Custom Slides. Every slide in the
  rotation gets a three-dots Edit/Delete menu. Built-in Edit jumps to that
  page's existing editor; custom Edit opens the structured template editor.

  Default pages that are always needed, Services, New arrivals, Events today,
  cannot be deleted (no Delete option). Only the featured-group (pregnant women)
  page and custom slides can be removed, and removals are RECOVERABLE: hidden
  built-ins and soft-deleted custom slides appear under "Recently deleted" with
  a Restore action, so nothing is lost by accident.
*/
const BUILTINS: { key: BuiltinKey; label: string; anchor: string | null }[] = [
  { key: "services", label: "Services pages", anchor: "services" },
  { key: "new-arrivals", label: "New arrivals page", anchor: "new-arrivals" },
  { key: "demographic", label: "Pregnant women page", anchor: "demographic" },
  { key: "events-today", label: "Events today", anchor: "events-today" },
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
  const [servicesPageCount, setServicesPageCount] = useState(1);
  const [active, setActive] = useState("calendar");
  // Set when a sidebar link is clicked, and held until the reader scrolls for
  // themselves. Sections near the end of the page cannot reach the spy's
  // trigger line (the page runs out of scroll first), so without this the spy
  // would immediately take the highlight back off whatever was just clicked
  // and hand it to the last section that did cross the line.
  const clickedRef = useRef<string | null>(null);

  useEffect(() => {
    const loadSlides = async () => {
      setSlides(await fetchSlides());
      setDeleted(await fetchDeletedSlides());
    };
    const loadHidden = async () => setHidden(await fetchHiddenBuiltins());
    const loadServices = async () => {
      const c = await fetchInfoContent();
      const n = c.services.pages.filter((p) => p.services.length > 0).length;
      setServicesPageCount(Math.max(1, n));
    };
    loadSlides();
    loadHidden();
    loadServices();
    const channel = supabase
      .channel("sidebar-slides")
      .on("postgres_changes", { event: "*", schema: "public", table: "slides" }, loadSlides)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "display_settings" },
        loadHidden,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "info_content" },
        loadServices,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visibleBuiltins = BUILTINS.filter((b) => !hidden.includes(b.key));
  const hiddenBuiltins = BUILTINS.filter((b) => hidden.includes(b.key));
  const totalVisible = visibleBuiltins.length + slides.length;

  // The single "services" builtin expands into one link per numbered page.
  const serviceLinks = Array.from({ length: servicesPageCount }, (_, i) => ({
    anchor: `services-page-${i + 1}`,
    label: `This Week's Services — Page ${i + 1}`,
  }));

  // Anchors the spy watches, in page order. Only LEAF anchors belong here: a
  // section wrapper (#digital-schedule, #custom-slides) starts above the panels
  // it contains, so it would always be the last one past the line while you are
  // anywhere inside it and would hide the panel-level highlight. The group
  // titles derive from the active leaf instead (see dspActive / customActive).
  const spyIds = [
    "calendar",
    "display-locations",
    ...visibleBuiltins.flatMap((b) =>
      b.key === "services"
        ? serviceLinks.map((l) => l.anchor)
        : b.anchor
          ? [b.anchor]
          : [],
    ),
    ...slides.map((s) => `slide-${s.id}`),
  ];
  const spyKey = spyIds.join("|");
  useEffect(() => {
    // Read on scroll rather than with IntersectionObserver. The editors below
    // fetch their content before rendering ("Loading editor…"), so the bulletin
    // panels and slide anchors do not exist yet when this effect first runs.
    // observe() would silently skip them and never pick them up, which left the
    // highlight stuck on the last anchor that happened to exist at mount.
    // Looking the ids up on each pass means late-rendered panels just work.
    let frame = 0;
    // Set once the smooth scroll a click started has come to rest, so the next
    // movement can be attributed to the reader rather than to that animation.
    let settled = false;
    const update = () => {
      frame = 0;
      if (clickedRef.current) {
        if (!settled) return;
        clickedRef.current = null;
        settled = false;
      }
      // A section counts as current once its top passes a line a quarter of
      // the way down the viewport; the last one past it wins.
      const line = window.innerHeight * 0.25;
      // Sorted by where they actually sit, so "last one past the line" does not
      // depend on spyIds happening to match the render order.
      const rendered = spyIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => !!el)
        .sort(
          (a, b) =>
            a.getBoundingClientRect().top - b.getBoundingClientRect().top,
        );
      if (rendered.length === 0) return;

      let current = rendered[0];
      for (const el of rendered) {
        if (el.getBoundingClientRect().top <= line) current = el;
      }

      // At the end of the page nothing further down can ever reach the line,
      // so the tail sections would never light up. Hand it to the last anchor.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) current = rendered[rendered.length - 1];

      setActive(current.id);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // scrollend marks the end of the click's animation; the scroll after it is
    // the reader's, and that is what hands the highlight back to the spy.
    const onScrollEnd = () => {
      if (clickedRef.current) settled = true;
    };
    // Fallback for browsers without scrollend: direct input is unambiguously
    // the reader moving, so it releases immediately. The smooth scroll a click
    // starts produces none of these, and so cannot cancel its own highlight.
    const release = () => {
      clickedRef.current = null;
      settled = false;
      onScroll();
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", release);
    // The panels render after their fetches resolve and change height as they
    // expand, both of which move every anchor below them.
    const resize = new ResizeObserver(onScroll);
    resize.observe(document.body);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", release);
      resize.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spyKey]);

  // Plain navigation to a bulletin page, the same deal as the custom slides:
  // scroll to the panel and leave it as it was. No hash, because the hash is
  // what tells InfoContentEditor to expand, and browsing the list should not
  // force open every page it passes. Use the menu's Edit to open one.
  function jumpToBulletinPage(anchor: string) {
    document
      .getElementById(anchor)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    clickedRef.current = anchor;
    setActive(anchor);
  }

  // Edit does mean "open this one": the hash is InfoContentEditor's signal.
  function editBulletinPage(anchor: string) {
    // Assigning an unchanged hash fires no hashchange, so Edit on the panel
    // already in the hash would do nothing. Clear it first, via replaceState so
    // the extra step stays out of the back button.
    if (window.location.hash === `#${anchor}`) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.location.hash = anchor;
    clickedRef.current = anchor;
    setActive(anchor);
  }

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    clickedRef.current = id;
    setActive(id);
  }

  // Plain navigation: scroll to the slide and leave it however it was. No hash
  // is set, because the hash is what tells CustomSlidesEditor to expand, and
  // browsing the list should not force every slide it passes open.
  function jumpToSlide(id: string) {
    document
      .getElementById(`slide-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    clickedRef.current = `slide-${id}`;
    setActive(`slide-${id}`);
  }

  // The menu's Edit action, which does mean "open this one": the hash is the
  // signal CustomSlidesEditor listens for.
  function editSlide(id: string) {
    // Assigning an unchanged hash fires no hashchange, so Edit on the slide
    // already in the hash would do nothing. Clear it first, via replaceState so
    // the extra step stays out of the back button.
    if (window.location.hash === `#slide-${id}`) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.location.hash = `slide-${id}`;
    clickedRef.current = `slide-${id}`;
    setActive(`slide-${id}`);
  }

  // Create a slide with sensible defaults; its inline editor appears (and
  // auto-expands) via realtime, so it's immediately editable.
  async function addSlide() {
    await createSlide({
      template: "title-body",
      background: DEFAULT_SLIDE_BACKGROUND,
      title: "New slide",
      titleEs: "",
      body: "",
      bodyEs: "",
      items: [],
      itemsEs: [],
      caption: "",
      captionEs: "",
      imagePath: null,
      locationIds: [],
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
  const dspActive =
    active.startsWith("services-page-") ||
    [
      "display-locations",
      "services",
      "new-arrivals",
      "demographic",
      "events-today",
    ].includes(active);
  const customActive = active.startsWith("slide-");

  return (
    <nav aria-label="Manage sections" className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-6">
        {/* Announcement. Sits above Calendar because it is the most urgent
            action on this page. Unlike every other item here it does not jump
            to a section — there is nothing on the page to scroll to — it opens
            the same modal as the button at the top, so it has no scroll-spy
            anchor and never takes the active highlight. */}
        <div className="mb-6">
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={openAnnouncementModal}
                className={linkClass(false)}
              >
                Announcement
              </button>
            </li>
          </ul>
        </div>

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

        {/* Digital Bulletin Pages */}
        <div className="mt-6">
          <GroupTitle
            onClick={() => jump("digital-schedule")}
            active={dspActive}
          >
            Digital Bulletin Pages
          </GroupTitle>
          <ul className="space-y-1">
            <li className="flex items-center pr-1">
              <button
                type="button"
                onClick={() => jump("display-locations")}
                className={linkClass(active === "display-locations")}
              >
                Display locations
              </button>
            </li>
            {visibleBuiltins.flatMap((b) => {
              // The repeatable services type shows one numbered link per page.
              if (b.key === "services") {
                return serviceLinks.map((link) => (
                  <li key={link.anchor} className="flex items-center pr-1">
                    <button
                      type="button"
                      onClick={() => jumpToBulletinPage(link.anchor)}
                      // Not truncated (unlike other links) so the page number
                      // is always visible; wraps to a second line if needed.
                      className={`flex-1 border-l-4 px-4 py-2 text-left text-base font-semibold leading-snug ${
                        active === link.anchor
                          ? "border-blue bg-blue/5 text-blue"
                          : "border-transparent text-ink hover:bg-ink/5 hover:text-blue"
                      }`}
                    >
                      {link.label}
                    </button>
                  </li>
                ));
              }
              const deletable = !PROTECTED.includes(b.key);
              return (
                <li key={b.key} className="flex items-center pr-1">
                  <button
                    type="button"
                    onClick={() => b.anchor && jumpToBulletinPage(b.anchor)}
                    className={linkClass(!!b.anchor && active === b.anchor)}
                  >
                    {b.label}
                  </button>
                  <SlideMenu
                    onEdit={
                      b.anchor
                        ? () => editBulletinPage(b.anchor as string)
                        : undefined
                    }
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
                    onEdit={() => editSlide(s.id)}
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

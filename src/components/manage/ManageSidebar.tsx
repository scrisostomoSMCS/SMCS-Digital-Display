"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  BedIcon,
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  MegaphoneIcon,
  MonitorIcon,
  PlusIcon,
  SlideshowIcon,
  TrashIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import {
  fetchSlides,
  fetchDeletedSlides,
  setSlideHidden,
  deleteSlide,
  createSlide,
  SLIDES_CHANGED_EVENT,
  type Slide,
} from "@/lib/slides";
import { DEFAULT_SLIDE_BACKGROUND } from "@/lib/slideBackgrounds";
import {
  fetchHiddenBuiltins,
  setHiddenBuiltins,
  fetchSidebarNames,
  setSidebarName,
  customSlideNameKey,
  type BuiltinKey,
  type SidebarNames,
} from "@/lib/displaySettings";
import {
  fetchInfoContent,
  saveInfoContent,
  type InfoContent,
} from "@/lib/infoContent";
import {
  deleteBulletinPageLocations,
  servicePageKey,
  FIXED_BULLETIN_PAGE_KEYS,
} from "@/lib/bulletinLocations";
import { openAnnouncementModal } from "@/lib/announcements";
import {
  applySidebarCollapsed,
  readSidebarCollapsed,
  saveSidebarCollapsed,
} from "@/lib/manageSidebar";
import SlideMenu from "./SlideMenu";
import { usePausedPages } from "./usePausedPages";

/*
  Sticky manage-page navigation, a dark sidebar of top-level rows that mirror
  the page: Announcements (its green + opens the modal), Live bed availability, Weekly
  calendar, then two collapsible groups, Digital bulletin pages and Custom
  slides, whose children hang off a soft tree, and Recently deleted when
  anything is in it.
  Every slide in the rotation gets a three-dots Edit/Delete menu. Built-in Edit jumps to that
  page's existing editor; custom Edit opens the structured template editor.

  New arrivals, the featured-group (pregnant women) page, and events today can
  all be deleted from the rotation like a custom slide, RECOVERABLE via
  "Recently deleted" with a Restore action. Services pages are the repeatable
  type: each numbered page gets its own three-dot Delete (permanent, no
  restore, matching "Remove this page" inside the editor), but at least one
  page must always remain, so the last one has no Delete option.

  Double-clicking any slide name renames it. The name is stored in
  display_settings.sidebar_names and labels the sidebar and the matching panel
  headings on this page (see useSidebarNames); it never changes what the wall
  display shows. Clearing the name restores the default.
*/
const BUILTINS: {
  key: BuiltinKey;
  label: string;
  anchor: string | null;
  // sidebar_names key; services pages are named per page instead.
  nameKey: string | null;
}[] = [
  { key: "services", label: "Services pages", anchor: "services", nameKey: null },
  {
    key: "new-arrivals",
    label: "New arrivals page",
    anchor: "new-arrivals",
    nameKey: FIXED_BULLETIN_PAGE_KEYS.newArrivals,
  },
  {
    key: "demographic",
    label: "Pregnant women page",
    anchor: "demographic",
    nameKey: FIXED_BULLETIN_PAGE_KEYS.demographic,
  },
  {
    key: "events-today",
    label: "Events today",
    anchor: "events-today",
    nameKey: FIXED_BULLETIN_PAGE_KEYS.eventsToday,
  },
];

// The " — Page N" ending of a services page name, with any dash or none.
const PAGE_NUMBER_END = /\s*[-–—]?\s*Page\s*\d+$/i;

type GroupKey = "dsp" | "custom" | "deleted";
const GROUPS_OPEN_KEY = "manage-sidebar-groups-open";
const DEFAULT_GROUPS_OPEN: Record<GroupKey, boolean> = {
  dsp: true,
  custom: true,
  deleted: false,
};

// Default pages that can never be deleted from the rotation.
const PROTECTED: BuiltinKey[] = ["services"];

/*
  Every row, top-level or child, is the same rounded block: a pill in the
  sidebar's lighter gray (with a 1px border instead of a shadow) when it is the
  scroll-spy's active item, a slight lift on hover otherwise. `group/row` lets
  the ⋯ button appear on hover and keyboard focus.
*/
const rowClass = (active: boolean) =>
  `group/row flex min-w-0 items-center rounded-xl border transition-colors duration-150 ${
    active
      ? "border-sidebar-border bg-sidebar-pill text-sidebar-text-active"
      : "border-transparent hover:bg-sidebar-hover"
  }`;

// The clickable part of a child row. `dimmed` is a slide hidden with "Hide
// slide". Names stay on one line; the full name is in the title.
const childLinkClass = (active: boolean, dimmed = false) =>
  `min-w-0 flex-1 truncate rounded-xl px-3 py-1.5 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal ${
    active
      ? "text-sidebar-text-active"
      : dimmed
        ? "text-sidebar-text-dim"
        : "text-sidebar-text hover:text-sidebar-text-active"
  }`;

// The ⋯ button: only on the active row, or while the row is hovered or has
// keyboard focus. Always shown on touch screens, which have no hover. Sized
// down (h-7! w-7!) to the rows.
const menuTriggerClass = (active: boolean) =>
  `h-7! w-7! mr-1 rounded-lg ${
    active
      ? "text-sidebar-text-active hover:bg-sidebar-hover"
      : "text-sidebar-text opacity-0 transition-opacity duration-150 hover:bg-sidebar-pill hover:text-sidebar-text-active group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100"
  }`;

// Marks a slide hidden with "Hide slide".
function HiddenTag() {
  return (
    <span className="mr-1 shrink-0 rounded border border-current px-1.5 text-xs leading-tight font-medium uppercase tracking-wide text-sidebar-text-dim">
      Hidden
    </span>
  );
}

// The small count on a group row (hidden or deleted slides). Teal is the
// sidebar's one accent, and this is one of the few places it appears.
function CountBadge({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;
  return (
    <span className="mr-1 shrink-0 rounded-full bg-sidebar-pill px-2 text-xs leading-5 font-semibold text-teal">
      {count}
      {label && ` ${label}`}
    </span>
  );
}

/*
  The green "+" that opens the push-announcement modal, on the Announcements
  row and (as a corner badge) on the collapsed strip's megaphone. It sits
  beside, never inside, the button it accompanies, so its click cannot reach
  that button's scroll; stopPropagation guards anything that listens above.
  `className` sizes and places it (28px on the row, 24px as the badge).
  `tip`: on the strip it gets the strip's tooltip instead of a native title.
*/
function PushAnnouncementButton({
  className,
  tip = false,
}: {
  className: string;
  tip?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openAnnouncementModal();
      }}
      aria-label="Push an announcement"
      title={tip ? undefined : "Push an announcement"}
      className={`group/tip flex shrink-0 items-center justify-center rounded-lg bg-sidebar-push text-paper transition-colors duration-150 hover:bg-sidebar-push-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${className}`}
    >
      <PlusIcon size={14} weight="bold" aria-hidden="true" />
      {tip && <StripTip label="Push an announcement" />}
    </button>
  );
}

/*
  The collapsed strip's tooltip: the item's name in a small dark pill to the
  right of the icon, shown on hover and on keyboard focus, which the native
  title (about a second's delay, mouse only) is not. Decorative: every strip
  button already has the same text as its aria-label. Its button needs
  `group/tip` and a positioned box.
*/
function StripTip({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-full z-10 ml-3 -translate-y-1/2 rounded-lg border border-sidebar-border bg-sidebar-pill px-2.5 py-1 text-sm leading-tight font-medium whitespace-nowrap text-sidebar-text-active opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100 motion-reduce:transition-none"
    >
      {label}
    </span>
  );
}

/*
  A top-level row: outline icon, label, then (for a group) a count badge and a
  caret that expands or collapses its children, or an `action` button in the
  caret's place. The label always jumps to its section; only the caret toggles.
  `current` marks a group that holds the active item: its text brightens, but
  only the item itself gets the pill.
*/
function TopRow({
  icon: Icon,
  label,
  onClick,
  active = false,
  current = false,
  badge,
  action,
  expanded,
  controls,
  onToggle,
}: {
  icon: PhosphorIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  current?: boolean;
  badge?: ReactNode;
  action?: ReactNode;
  expanded?: boolean;
  controls?: string;
  onToggle?: () => void;
}) {
  const bright = active || current;
  return (
    <div className={rowClass(active)}>
      <button
        type="button"
        onClick={onClick}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal ${
          bright ? "text-sidebar-text-active" : "text-sidebar-text hover:text-sidebar-text-active"
        }`}
      >
        <Icon size={20} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      {badge}
      {action}
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={controls}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-text hover:bg-sidebar-pill hover:text-sidebar-text-active focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal"
        >
          <CaretRightIcon
            size={16}
            aria-hidden="true"
            className={`transition-transform duration-150 motion-reduce:transition-none ${
              expanded ? "rotate-90" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}

// The collapsed strip's buttons share one look; `active` is the pill.
// `group/tip` and `relative` are for each one's StripTip.
const stripButtonClass = (active: boolean) =>
  `group/tip relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal ${
    active
      ? "border-sidebar-border bg-sidebar-pill text-sidebar-text-active"
      : "border-transparent text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
  }`;

function StripButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: PhosphorIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={stripButtonClass(active)}
    >
      <Icon size={22} aria-hidden="true" />
      <StripTip label={label} />
    </button>
  );
}

// A sidebar link whose name can be edited in place: double-click to rename,
// Enter or clicking away saves, Escape cancels. `keepEnd`: when the name ends
// with a match for it, that ending stays visible and the start truncates
// instead, so the services pages' names never lose their page number.
function RenamableLink({
  name,
  onClick,
  onRename,
  className,
  keepEnd,
}: {
  name: string;
  onClick: () => void;
  onRename: (name: string) => void;
  className: string;
  keepEnd?: RegExp;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  // Enter and Escape unmount the input, which can also fire a blur; this stops
  // the blur saving twice or saving a cancelled edit.
  const doneRef = useRef(false);

  if (editing) {
    const finish = (save: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setEditing(false);
      if (save && draft.trim() !== name) onRename(draft);
    };
    return (
      <input
        autoFocus
        aria-label="Slide name"
        value={draft}
        maxLength={80}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") finish(true);
          if (e.key === "Escape") finish(false);
        }}
        onBlur={() => finish(true)}
        className="min-w-0 flex-1 rounded-lg border border-teal bg-sidebar px-3 py-1 text-sm font-medium text-sidebar-text-active"
      />
    );
  }

  const match = keepEnd ? name.match(keepEnd) : null;
  const end = match && match.index ? match[0] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={() => {
        doneRef.current = false;
        setDraft(name);
        setEditing(true);
      }}
      title={`${name} (double-click to rename)`}
      className={`${className} ${end ? "flex" : ""}`}
    >
      {end ? (
        <>
          <span className="min-w-0 truncate">{name.slice(0, -end.length)}</span>
          <span className="shrink-0 whitespace-pre">{end}</span>
        </>
      ) : (
        name
      )}
    </button>
  );
}

export default function ManageSidebar() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [deleted, setDeleted] = useState<Slide[]>([]);
  const [hidden, setHidden] = useState<BuiltinKey[]>([]);
  // Built-in pages hidden with "Hide slide": still listed, faded.
  const paused = usePausedPages("sidebar");
  const [infoContent, setInfoContent] = useState<InfoContent | null>(null);
  const [names, setNames] = useState<SidebarNames>({});
  // The first anchor on the page; the spy corrects it on mount.
  const [active, setActive] = useState("announcements");
  // Set when a sidebar link is clicked, and held until the reader scrolls for
  // themselves. Sections near the end of the page cannot reach the spy's
  // trigger line (the page runs out of scroll first), so without this the spy
  // would immediately take the highlight back off whatever was just clicked
  // and hand it to the last section that did cross the line.
  const clickedRef = useRef<string | null>(null);
  // Which collapsible groups are open: Digital bulletin pages and Custom
  // slides start open, Recently deleted closed. Toggled with each group's
  // caret, opened automatically when the active item moves into a closed
  // group (below), and remembered for the session.
  const [groupsOpen, setGroupsOpen] = useState(DEFAULT_GROUPS_OPEN);
  function setGroupOpen(group: GroupKey, open: boolean) {
    const next = { ...groupsOpen, [group]: open };
    setGroupsOpen(next);
    try {
      sessionStorage.setItem(GROUPS_OPEN_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked; the state just won't survive a reload.
    }
  }
  // Read after mount so the server render and first client render match.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(GROUPS_OPEN_KEY);
      if (saved) setGroupsOpen({ ...DEFAULT_GROUPS_OPEN, ...JSON.parse(saved) });
    } catch {
      // Storage blocked or unreadable; keep the defaults.
    }
  }, []);

  useEffect(() => {
    const loadSlides = async () => {
      // Paused slides stay listed so staff can find them (grayed out below).
      setSlides(await fetchSlides(undefined, { includePaused: true }));
      setDeleted(await fetchDeletedSlides());
    };
    // display_settings holds both the hidden list and the sidebar names.
    const loadHidden = async () => {
      setHidden(await fetchHiddenBuiltins());
      setNames(await fetchSidebarNames());
    };
    const loadInfoContent = async () => setInfoContent(await fetchInfoContent());
    loadSlides();
    loadHidden();
    loadInfoContent();
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
        loadInfoContent,
      )
      .subscribe();
    // This tab's own slide writes reload directly rather than relying on realtime.
    window.addEventListener(SLIDES_CHANGED_EVENT, loadSlides);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(SLIDES_CHANGED_EVENT, loadSlides);
    };
  }, []);

  const visibleBuiltins = BUILTINS.filter((b) => !hidden.includes(b.key));
  const hiddenBuiltins = BUILTINS.filter((b) => hidden.includes(b.key));

  // The single "services" builtin expands into one link per numbered page,
  // unfiltered and in order so anchors line up 1:1 with InfoContentEditor's
  // own panel ids ("services-page-N" keyed off the same array index).
  const servicesPages = infoContent?.services.pages ?? [];
  const serviceLinks = servicesPages.map((page, i) => ({
    id: page.id,
    anchor: `services-page-${i + 1}`,
    nameKey: servicePageKey(page.id),
    label: `This Week's Services — Page ${i + 1}`,
  }));

  // What is actually on the screens: paused pages and slides do not count, and
  // services counts while any of its pages is still showing.
  const totalVisible =
    visibleBuiltins.filter((b) =>
      b.key === "services"
        ? serviceLinks.some((link) => !paused.includes(link.nameKey))
        : !(b.nameKey && paused.includes(b.nameKey)),
    ).length + slides.filter((s) => !s.paused).length;

  const nameFor = (key: string | null, fallback: string) =>
    (key && names[key]) || fallback;
  const slideName = (s: Slide) =>
    nameFor(customSlideNameKey(s.id), s.title.trim() || "Untitled slide");

  async function rename(key: string, name: string) {
    // Show it right away; realtime confirms (or corrects) it.
    setNames((prev) => {
      const next = { ...prev };
      if (name.trim()) next[key] = name.trim();
      else delete next[key];
      return next;
    });
    const error = await setSidebarName(key, name);
    if (error) {
      window.alert(`Couldn't rename: ${error}`);
      setNames(await fetchSidebarNames());
    }
  }

  // Anchors the spy watches, in page order. Only LEAF anchors belong here: a
  // section wrapper (#digital-schedule, #custom-slides) starts above the panels
  // it contains, so it would always be the last one past the line while you are
  // anywhere inside it and would hide the panel-level highlight. The group
  // titles derive from the active leaf instead (see dspActive / customActive).
  const spyIds = [
    "announcements",
    "bed-availability",
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
    const { error } = await createSlide({
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
      menu: null,
      content: null,
      locationIds: [],
    });
    if (error) window.alert(`Couldn't add the slide: ${error}`);
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

  // Permanent (no restore), matching the "Remove this page" button inside
  // InfoContentEditor's own panel — this is the same action, just reachable
  // from the sidebar too. Always at least one page must remain, so this is
  // only offered while there's more than one (see the SlideMenu call below).
  async function removeServicesPage(idx: number) {
    if (!infoContent) return;
    const pages = infoContent.services.pages;
    if (pages.length <= 1) return;
    const page = pages[idx];
    if (
      !window.confirm(
        `Remove "This Week's Services — Page ${idx + 1}"? Its services will be deleted.`,
      )
    )
      return;
    const next: InfoContent = {
      ...infoContent,
      services: {
        ...infoContent.services,
        pages: pages.filter((_, i) => i !== idx),
      },
    };
    const result = await saveInfoContent(next, infoContent);
    if (result.error) {
      window.alert(`Couldn't remove the page: ${result.error}`);
      return;
    }
    await deleteBulletinPageLocations(servicePageKey(page.id));
    setInfoContent(result.content ?? next);
  }

  // Soft delete, moves the slide to "Recently deleted" (recoverable).
  async function removeCustom(slide: Slide) {
    if (!guardLastSlide()) return;
    if (
      !window.confirm(
        `Remove the slide “${slideName(slide)}”? You can restore it from “Recently deleted”.`,
      )
    )
      return;
    const error = await setSlideHidden(slide.id, true);
    if (error) window.alert(`Couldn't delete the slide: ${error}`);
  }

  async function restoreCustom(slide: Slide) {
    const error = await setSlideHidden(slide.id, false);
    if (error) window.alert(`Couldn't restore the slide: ${error}`);
  }

  async function deleteForever(slide: Slide) {
    if (
      !window.confirm(
        `Permanently delete “${slideName(slide)}”? This cannot be undone.`,
      )
    )
      return;
    const error = await deleteSlide(slide.id);
    if (error) window.alert(`Couldn't delete the slide: ${error}`);
  }

  const hasRecoverable = hiddenBuiltins.length > 0 || deleted.length > 0;

  // Highlight a group row when the reader is inside that group.
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
  const activeGroup: GroupKey | null = dspActive
    ? "dsp"
    : customActive
      ? "custom"
      : null;

  // Open the group the active item just moved into. Keyed on the group, not
  // the item, so a group the reader collapses while inside it stays collapsed
  // until the active item leaves and comes back.
  useEffect(() => {
    if (activeGroup && !groupsOpen[activeGroup]) setGroupOpen(activeGroup, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  // Counts for the group badges: what staff have hidden with "Hide slide",
  // and what is waiting in Recently deleted.
  const dspHiddenCount =
    serviceLinks.filter((l) => paused.includes(l.nameKey)).length +
    visibleBuiltins.filter(
      (b) => b.key !== "services" && b.nameKey && paused.includes(b.nameKey),
    ).length;
  const customHiddenCount = slides.filter((s) => s.paused).length;
  const deletedCount = hiddenBuiltins.length + deleted.length;

  // Between lg and xl the sidebar would crowd the calendar, so it is always a
  // strip of the top-level icons there, and Expand opens the full sidebar as a
  // drawer over the page. The drawer stays open while staff work in it
  // (renaming needs a double-click, which an auto-close on the first click
  // would swallow); Collapse, the backdrop, and Escape put it away.
  // At xl and up the sidebar docks, and Collapse shrinks it to the same strip
  // (remembered per browser; see lib/manageSidebar). The saved choice only
  // applies there, the strip CSS ignores it below xl.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  // Before paint, so a client-side navigation here does not flash the wrong
  // state either (a full load already has it from the page's inline script).
  useLayoutEffect(() => {
    applySidebarCollapsed(readSidebarCollapsed());
    return () => applySidebarCollapsed(false);
  }, []);
  // Tailwind's xl, in the same units, so this always agrees with the CSS.
  const isDocked = () => window.matchMedia("(min-width: 80rem)").matches;
  function closeDrawer() {
    setDrawerOpen(false);
    expandButtonRef.current?.focus();
  }
  // Focus follows the toggle to its counterpart, so keyboard users keep their
  // place. `group` opens that group first (the strip's Recently deleted).
  function expandSidebar(group?: GroupKey) {
    if (group) setGroupOpen(group, true);
    if (isDocked()) {
      saveSidebarCollapsed(false);
      collapseButtonRef.current?.focus();
    } else {
      setDrawerOpen(true);
    }
  }
  function collapseSidebar() {
    if (isDocked()) {
      saveSidebarCollapsed(true);
      expandButtonRef.current?.focus();
    } else {
      closeDrawer();
    }
  }
  useEffect(() => {
    if (!drawerOpen) return;
    collapseButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDrawerOpen(false);
      expandButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Keep the active row in view as the spy moves it down a list taller than
  // the sidebar. Scrolls only the sidebar's own container, never the page,
  // which would fight the spy. Reruns when a group opens, which is when an
  // auto-expanded row first gets a position.
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const content = contentRef.current;
    const row = content?.querySelector<HTMLElement>(
      `[data-spy="${CSS.escape(active)}"]`,
    );
    if (!content || !row || !row.offsetParent) return;
    const box = content.getBoundingClientRect();
    const rect = row.getBoundingClientRect();
    const margin = 24;
    if (rect.top < box.top + margin) {
      content.scrollBy({ top: rect.top - box.top - margin, behavior: "smooth" });
    } else if (rect.bottom > box.bottom - margin) {
      content.scrollBy({ top: rect.bottom - box.bottom + margin, behavior: "smooth" });
    }
  }, [active, groupsOpen, drawerOpen]);

  return (
    <>
      {/* The sidebar's column. Its width is the one thing that animates:
          always the strip's 56px between lg and xl; at xl the full sidebar's
          width, or the strip's while collapsed. The page content beside it is
          flex-1, so it takes up whatever this frees. */}
      <div className="sticky top-0 z-30 hidden h-dvh w-14 shrink-0 bg-sidebar transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block xl:w-manage-sidebar xl:sidebar-collapsed:w-14">
        {/* Inside the column, which is its own stacking context, so it can sit
            between the strip and the drawer. */}
        {drawerOpen && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Collapse sidebar"
            onClick={closeDrawer}
            className="fixed inset-0 z-40 bg-ink/40 xl:hidden"
          />
        )}
        {/* The icon strip: lg–xl, and xl while collapsed. Outside the clipping
            box below so its tooltips can reach out over the page. */}
        <div className="absolute inset-y-0 left-0 z-10 flex w-14 flex-col items-center gap-1 bg-sidebar pb-3 xl:hidden xl:sidebar-collapsed:flex">
          {/* The logo's house-and-people mark, in a row the height of the blue
              nav bar, like the full sidebar's logo row. Recolored to white
              like the full logo; same link. */}
          <a
            href="https://smcares.org"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="St. Mary's Community Services main website (opens in a new tab)"
            className="flex h-manage-bar shrink-0 items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            <Image
              src="/smcslogo-mark.png"
              alt=""
              width={457}
              height={340}
              className="h-auto w-9 brightness-0 invert"
            />
          </a>
          <button
            ref={expandButtonRef}
            type="button"
            onClick={() => expandSidebar()}
            aria-label="Expand sidebar"
            aria-expanded={drawerOpen}
            aria-controls="manage-sections"
            className={`${stripButtonClass(false)} mb-1`}
          >
            <CaretRightIcon size={20} aria-hidden="true" />
            <StripTip label="Expand sidebar" />
          </button>
          {/* The megaphone scrolls like the full row; the push button rides on
              its top-right corner as a badge, a sibling rather than a child.
              The sidebar-colored ring separates the two. */}
          <div className="relative">
            <StripButton
              icon={MegaphoneIcon}
              label="Announcements"
              onClick={() => jump("announcements")}
              active={active === "announcements"}
            />
            <PushAnnouncementButton
              tip
              className="absolute -top-2 -right-2 h-6 w-6 ring-2 ring-sidebar"
            />
          </div>
          <StripButton
            icon={BedIcon}
            label="Live bed availability"
            onClick={() => jump("bed-availability")}
            active={active === "bed-availability"}
          />
          <StripButton
            icon={CalendarDotsIcon}
            label="Weekly calendar"
            onClick={() => jump("calendar")}
            active={active === "calendar"}
          />
          {/* Groups scroll to their section, like the full sidebar's labels;
              their children are one Expand away. */}
          <StripButton
            icon={MonitorIcon}
            label="Digital bulletin pages"
            onClick={() => jump("digital-schedule")}
            active={dspActive}
          />
          <StripButton
            icon={SlideshowIcon}
            label="Custom slides"
            onClick={() => jump("custom-slides")}
            active={customActive}
          />
          {/* No section to scroll to, so it expands the sidebar with the
              group open. */}
          {hasRecoverable && (
            <StripButton
              icon={TrashIcon}
              label="Recently deleted"
              onClick={() => expandSidebar("deleted")}
            />
          )}
        </div>

        {/* Clips the full sidebar to the column while the width animates, so
            it is revealed and hidden at its own width instead of reflowing.
            The drawer is fixed, which this does not clip. */}
        <div className="absolute inset-0 overflow-hidden">
          <nav
            id="manage-sections"
            aria-label="Manage sections"
            // Collapsing keeps it visible until the width has closed over it
            // (visibility waits out a 200ms transition), and hides it from
            // the tab order after. The transition is on the collapsed state
            // only, so expanding shows it at once and Collapse can take focus.
            className={`h-dvh w-manage-sidebar flex-col bg-sidebar text-sidebar-text xl:static xl:z-auto xl:flex xl:sidebar-collapsed:invisible xl:sidebar-collapsed:transition-[visibility] xl:sidebar-collapsed:duration-200 motion-reduce:transition-none ${
              drawerOpen ? "hidden lg:fixed lg:top-0 lg:left-0 lg:z-50 lg:flex" : "hidden"
            }`}
          >
            {/* Logo, fixed above the scrolling list, in a row the height of
                the blue nav bar beside it. The header hides its own logo on
                this page at xl and up, so this is the one on screen, and it
                keeps the header logo's link out to smcares.org.
                The artwork is blue and teal, which is unreadable on the dark
                gray, and there is no light version, so it is recolored to
                solid white here. Swap in a real reversed file if one is made. */}
            <div className="flex h-manage-bar shrink-0 items-center justify-between gap-2 pr-3 pl-6">
              <a
                href="https://smcares.org"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="St. Mary's Community Services main website (opens in a new tab)"
                className="rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
              >
                <Image
                  src="/smcslogo.png"
                  alt=""
                  width={1468}
                  height={354}
                  className="h-9 w-auto brightness-0 invert"
                />
              </a>
              {/* Docks to the strip at xl; closes the drawer below it. */}
              <button
                ref={collapseButtonRef}
                type="button"
                onClick={collapseSidebar}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                aria-expanded="true"
                aria-controls="manage-sections"
                className={`${stripButtonClass(false)} shrink-0`}
              >
                <CaretLeftIcon size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Scrolls on its own when the lists outgrow the viewport. */}
            <div
              ref={contentRef}
              className="manage-sidebar-scroll min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pt-1 pb-6"
            >
              {/* Announcements. Sits first because it is the most urgent action on
                  this page. The row scrolls to the Create an Announcement button
                  at the top of the page, like every other row; the green button in
                  the caret's place opens the push modal itself. */}
              <div data-spy="announcements">
                <TopRow
                  icon={MegaphoneIcon}
                  label="Announcements"
                  onClick={() => jump("announcements")}
                  active={active === "announcements"}
                  action={<PushAnnouncementButton className="mr-1 h-7 w-7" />}
                />
              </div>

              {/* Beds. Matches the bed counts' place as the page's first section. */}
              <div data-spy="bed-availability">
                <TopRow
                  icon={BedIcon}
                  label="Live bed availability"
                  onClick={() => jump("bed-availability")}
                  active={active === "bed-availability"}
                />
              </div>

              <div data-spy="calendar">
                <TopRow
                  icon={CalendarDotsIcon}
                  label="Weekly calendar"
                  onClick={() => jump("calendar")}
                  active={active === "calendar"}
                />
              </div>

              {/* Digital bulletin pages */}
              <div>
                <TopRow
                  icon={MonitorIcon}
                  label="Digital bulletin pages"
                  onClick={() => jump("digital-schedule")}
                  current={dspActive}
                  badge={<CountBadge count={dspHiddenCount} label="hidden" />}
                  expanded={groupsOpen.dsp}
                  controls="sidebar-dsp-list"
                  onToggle={() => setGroupOpen("dsp", !groupsOpen.dsp)}
                />
                <ul
                  id="sidebar-dsp-list"
                  hidden={!groupsOpen.dsp}
                  className="sidebar-tree mt-0.5 space-y-0.5"
                >
                  <li data-spy="display-locations">
                    <div className={rowClass(active === "display-locations")}>
                      <button
                        type="button"
                        onClick={() => jump("display-locations")}
                        className={childLinkClass(active === "display-locations")}
                      >
                        Display locations
                      </button>
                    </div>
                  </li>
                  {visibleBuiltins.flatMap((b) => {
                    // The repeatable services type shows one numbered link per page.
                    if (b.key === "services") {
                      return serviceLinks.map((link, idx) => {
                        const isActive = active === link.anchor;
                        const dimmed = paused.includes(link.nameKey);
                        return (
                          <li key={link.anchor} data-spy={link.anchor}>
                            <div className={rowClass(isActive)}>
                              <RenamableLink
                                name={nameFor(link.nameKey, link.label)}
                                onClick={() => jumpToBulletinPage(link.anchor)}
                                onRename={(name) => rename(link.nameKey, name)}
                                // Keeps "- Page N" (any dash) visible.
                                keepEnd={PAGE_NUMBER_END}
                                className={childLinkClass(isActive, dimmed)}
                              />
                              {dimmed && <HiddenTag />}
                              <SlideMenu
                                triggerClassName={menuTriggerClass(isActive)}
                                onEdit={() => editBulletinPage(link.anchor)}
                                onDelete={
                                  serviceLinks.length > 1
                                    ? () => removeServicesPage(idx)
                                    : undefined
                                }
                              />
                            </div>
                          </li>
                        );
                      });
                    }
                    const deletable = !PROTECTED.includes(b.key);
                    const isActive = !!b.anchor && active === b.anchor;
                    const dimmed = !!b.nameKey && paused.includes(b.nameKey);
                    return (
                      <li key={b.key} data-spy={b.anchor ?? undefined}>
                        <div className={rowClass(isActive)}>
                          <RenamableLink
                            name={nameFor(b.nameKey, b.label)}
                            onClick={() => b.anchor && jumpToBulletinPage(b.anchor)}
                            onRename={(name) => b.nameKey && rename(b.nameKey, name)}
                            className={childLinkClass(isActive, dimmed)}
                          />
                          {dimmed && <HiddenTag />}
                          <SlideMenu
                            triggerClassName={menuTriggerClass(isActive)}
                            onEdit={
                              b.anchor
                                ? () => editBulletinPage(b.anchor as string)
                                : undefined
                            }
                            editNote="Auto-updates from calendar"
                            onDelete={
                              deletable
                                ? () => hideBuiltin(b.key, nameFor(b.nameKey, b.label))
                                : undefined
                            }
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Custom slides */}
              <div>
                <TopRow
                  icon={SlideshowIcon}
                  label="Custom slides"
                  onClick={() => jump("custom-slides")}
                  current={customActive}
                  badge={<CountBadge count={customHiddenCount} label="hidden" />}
                  expanded={groupsOpen.custom}
                  controls="sidebar-custom-list"
                  onToggle={() => setGroupOpen("custom", !groupsOpen.custom)}
                />
                <ul
                  id="sidebar-custom-list"
                  hidden={!groupsOpen.custom}
                  className="sidebar-tree mt-0.5 space-y-0.5"
                >
                  {slides.map((s) => {
                    const isActive = active === `slide-${s.id}`;
                    return (
                      <li key={s.id} data-spy={`slide-${s.id}`}>
                        <div className={rowClass(isActive)}>
                          <RenamableLink
                            name={slideName(s)}
                            onClick={() => jumpToSlide(s.id)}
                            onRename={(name) => rename(customSlideNameKey(s.id), name)}
                            className={childLinkClass(isActive, s.paused)}
                          />
                          {s.paused && <HiddenTag />}
                          <SlideMenu
                            triggerClassName={menuTriggerClass(isActive)}
                            onEdit={() => editSlide(s.id)}
                            onDelete={() => removeCustom(s)}
                          />
                        </div>
                      </li>
                    );
                  })}
                  {/* A plain muted row at the end of the list, not a button
                      block, so it reads as an action on the list. */}
                  <li>
                    <button
                      type="button"
                      onClick={addSlide}
                      className="flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-1.5 text-left text-sm font-medium text-sidebar-text transition-colors duration-150 hover:bg-sidebar-hover hover:text-sidebar-text-active focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal"
                    >
                      <PlusIcon size={16} aria-hidden="true" className="shrink-0" />
                      Add new slide
                    </button>
                  </li>
                </ul>
              </div>

              {/* Recovery: restore hidden built-ins or soft-deleted custom slides.
                  Collapsed by default; only there when something is in it. The
                  label opens and closes it too, since it has no section to jump to. */}
              {hasRecoverable && (
                <div>
                  <TopRow
                    icon={TrashIcon}
                    label="Recently deleted"
                    onClick={() => setGroupOpen("deleted", !groupsOpen.deleted)}
                    badge={<CountBadge count={deletedCount} label="" />}
                    expanded={groupsOpen.deleted}
                    controls="sidebar-deleted-list"
                    onToggle={() => setGroupOpen("deleted", !groupsOpen.deleted)}
                  />
                  <ul
                    id="sidebar-deleted-list"
                    hidden={!groupsOpen.deleted}
                    className="sidebar-tree mt-0.5 space-y-0.5"
                  >
                    {hiddenBuiltins.map((b) => (
                      <li key={b.key}>
                        <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-1.5">
                          <span
                            title={nameFor(b.nameKey, b.label)}
                            className="truncate text-sm text-sidebar-text-dim"
                          >
                            {nameFor(b.nameKey, b.label)}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 text-sm font-medium text-sidebar-text-active hover:underline"
                            onClick={() =>
                              setHiddenBuiltins(hidden.filter((k) => k !== b.key))
                            }
                          >
                            Restore
                          </button>
                        </div>
                      </li>
                    ))}
                    {deleted.map((s) => (
                      <li key={s.id}>
                        <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-1.5">
                          <span
                            title={slideName(s)}
                            className="truncate text-sm text-sidebar-text-dim"
                          >
                            {slideName(s)}
                          </span>
                          <span className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              className="text-sm font-medium text-sidebar-text-active hover:underline"
                              onClick={() => restoreCustom(s)}
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              className="text-sm font-medium text-sidebar-text hover:text-sidebar-text-active hover:underline"
                              onClick={() => deleteForever(s)}
                            >
                              Delete
                            </button>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}

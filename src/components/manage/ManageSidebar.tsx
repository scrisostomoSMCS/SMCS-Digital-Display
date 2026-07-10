"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchSlides, type Slide } from "@/lib/slides";
import AddSlideModal from "./AddSlideModal";

/*
  Sticky section navigation for the manage page. Fixed jump links plus one link
  per employee-created slide (kept in sync via realtime), and an "Add new slide"
  action pinned at the bottom. Active link is highlighted via a scroll-spy.
  Hidden on small screens, where the page just scrolls.
*/
const FIXED_LINKS = [
  { id: "calendar", label: "Calendar" },
  { id: "services", label: "Services page" },
  { id: "new-arrivals", label: "New arrivals page" },
  { id: "demographic", label: "Pregnant women page" },
];

export default function ManageSidebar() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(FIXED_LINKS[0].id);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const load = async () => setSlides(await fetchSlides());
    load();
    const channel = supabase
      .channel("slides-sidebar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "slides" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const links = [
    ...FIXED_LINKS,
    ...slides.map((s) => ({
      id: `slide-${s.id}`,
      label: s.title.trim() || "Untitled slide",
    })),
  ];
  const linkKey = links.map((l) => l.id).join("|");

  // Scroll-spy: re-observe whenever the set of sections changes.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const topMost = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (topMost) setActive(topMost.target.id);
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 },
    );
    links.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey]);

  function jump(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }

  // After creating a slide, wait for its editor section (added via realtime) to
  // render, then jump to it so the employee can keep editing.
  function handleCreated(id: string) {
    setAdding(false);
    const target = `slide-${id}`;
    let tries = 0;
    const tick = () => {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActive(target);
      } else if (tries++ < 15) {
        setTimeout(tick, 200);
      }
    };
    setTimeout(tick, 300);
  }

  return (
    <nav aria-label="Manage sections" className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-6">
        <p className="px-4 pb-2 text-sm font-semibold uppercase tracking-wider text-ink/50">
          Jump to
        </p>
        <ul className="space-y-1">
          {links.map((l) => {
            const isActive = active === l.id;
            return (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  onClick={(e) => jump(e, l.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`block truncate border-l-4 px-4 py-2 text-lg font-semibold ${
                    isActive
                      ? "border-blue bg-blue/5 text-blue"
                      : "border-transparent text-ink hover:bg-ink/5 hover:text-blue"
                  }`}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Pinned action, visually distinct from the jump links above. */}
        <div className="mt-3 border-t-2 border-placeholder pt-3">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 border-2 border-blue bg-blue px-4 py-2 text-lg font-semibold text-paper hover:bg-paper hover:text-blue"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              +
            </span>
            Add new slide
          </button>
        </div>
      </div>

      {adding && (
        <AddSlideModal
          onClose={() => setAdding(false)}
          onCreated={handleCreated}
        />
      )}
    </nav>
  );
}

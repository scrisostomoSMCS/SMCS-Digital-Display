"use client";

import { useEffect, useState } from "react";

/*
  Sticky section navigation for the manage page. Links jump (smooth-scroll) to
  section anchors that live on the calendar section and the info-editor page
  groups. Active link is highlighted via a scroll-spy IntersectionObserver.
  Hidden on small screens (the page still scrolls normally).
*/
const LINKS = [
  { id: "calendar", label: "Calendar" },
  { id: "services", label: "Services page" },
  { id: "new-arrivals", label: "New arrivals page" },
  { id: "demographic", label: "Pregnant women page" },
];

export default function ManageSidebar() {
  const [active, setActive] = useState(LINKS[0].id);

  useEffect(() => {
    // A thin band near the top of the viewport decides the "current" section.
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
    LINKS.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function jump(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }

  return (
    <nav aria-label="Manage sections" className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-6">
        <p className="px-4 pb-2 text-sm font-semibold uppercase tracking-wider text-ink/50">
          Jump to
        </p>
        <ul className="space-y-1">
          {LINKS.map((l) => {
            const isActive = active === l.id;
            return (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  onClick={(e) => jump(e, l.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`block border-l-4 px-4 py-2 text-lg font-semibold ${
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
      </div>
    </nav>
  );
}

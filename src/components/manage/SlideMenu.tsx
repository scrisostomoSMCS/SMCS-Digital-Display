"use client";

import { useEffect, useRef, useState } from "react";

/*
  Three-dots (⋯) menu used on every sidebar slide. Edit is optional (omitted for
  auto-updating slides, which show a note instead). Styled for the dark
  sidebar, its only user: sidebar grays, a 1px border, no shadows.
*/
export default function SlideMenu({
  onEdit,
  editNote,
  onDelete,
  triggerClassName = "text-sidebar-text hover:bg-sidebar-pill hover:text-sidebar-text-active",
}: {
  onEdit?: () => void;
  editNote?: string;
  onDelete?: () => void; // omitted for permanent/default slides
  // Color (and any hover-to-reveal opacity) for the ⋯ button. While the menu
  // is open the button is always shown, whatever this says.
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium text-sidebar-text-active hover:bg-sidebar-line focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Slide options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-xl leading-none ${triggerClassName} ${
          open ? "opacity-100!" : ""
        }`}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-sidebar-border bg-sidebar-pill p-1"
        >
          {onEdit ? (
            <button
              role="menuitem"
              type="button"
              className={item}
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Edit
            </button>
          ) : (
            <p className="px-3 py-1.5 text-sm text-sidebar-text">
              {editNote ?? "Not editable"}
            </p>
          )}
          {onDelete && (
            <button
              role="menuitem"
              type="button"
              className={item}
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

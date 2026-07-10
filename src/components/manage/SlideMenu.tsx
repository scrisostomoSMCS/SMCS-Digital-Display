"use client";

import { useEffect, useRef, useState } from "react";

/*
  Three-dots (⋯) menu used on every sidebar slide. Edit is optional (omitted for
  auto-updating slides, which show a note instead). Palette-only, no shadows.
*/
export default function SlideMenu({
  onEdit,
  editNote,
  onDelete,
}: {
  onEdit?: () => void;
  editNote?: string;
  onDelete?: () => void; // omitted for permanent/default slides
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
    "block w-full px-4 py-2 text-left text-base font-semibold hover:bg-blue hover:text-paper";

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
        className="flex h-8 w-8 items-center justify-center rounded text-xl leading-none text-ink/60 hover:bg-ink/10 hover:text-ink"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 w-44 border-2 border-placeholder bg-paper py-1"
        >
          {onEdit ? (
            <button
              role="menuitem"
              type="button"
              className={`${item} text-ink`}
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Edit
            </button>
          ) : (
            <p className="px-4 py-2 text-sm text-ink/50">
              {editNote ?? "Not editable"}
            </p>
          )}
          {onDelete && (
            <button
              role="menuitem"
              type="button"
              className={`${item} text-blue`}
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

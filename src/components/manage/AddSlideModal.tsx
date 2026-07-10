"use client";

import { useState } from "react";
import { createSlide } from "@/lib/slides";
import { Field, StringListEditor } from "./editorFields";

/*
  Modal to create a brand-new slide for the /information rotation. Employees
  provide plain content (title + optional message + optional list); styling is
  applied automatically on the display. On success the new slide id is returned
  so the caller can jump to its editor.
*/
export default function AddSlideModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    const id = await createSlide({
      title: title.trim(),
      body: body.trim(),
      items: items.map((s) => s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (!id) {
      setError("Couldn’t create the slide. Please try again.");
      return;
    }
    onCreated(id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add new slide"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-auto border-4 border-blue bg-paper p-6"
      >
        <h2 className="text-2xl font-bold text-blue">Add new slide</h2>
        <span className="mt-2 block h-1 w-16 bg-teal" />
        <p className="mt-3 text-base text-ink/70">
          This adds a new slide to the rotating information display. You provide
          the words — the styling is applied automatically to match the others.
        </p>

        <div className="mt-4 space-y-4">
          <Field
            label="Title"
            hint="The big headline shown on the slide."
            value={title}
            onChange={setTitle}
          />
          <Field
            label="Message"
            hint="Optional supporting text under the title."
            value={body}
            onChange={setBody}
            textarea
            rows={3}
          />
          <div>
            <p className="text-base font-semibold">List items (optional)</p>
            <p className="text-sm text-ink/60">
              Each becomes a bullet point on the slide.
            </p>
            <div className="mt-2">
              <StringListEditor items={items} onChange={setItems} />
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-base font-semibold text-blue">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="border-2 border-blue bg-blue px-5 py-2 text-base font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create slide"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-ink/30 px-5 py-2 text-base font-semibold hover:border-ink"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

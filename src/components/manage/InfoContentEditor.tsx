"use client";

import { useEffect, useState } from "react";
import {
  fetchInfoContent,
  saveInfoContent,
  SERVICE_ICONS,
  type InfoContent,
  type InfoService,
  type InfoStep,
} from "@/lib/infoContent";
import {
  Field,
  CollapsiblePanel,
  inputClass,
  labelClass,
  smallBtn,
} from "./editorFields";

/*
  Employee/admin editor for the /information display's three messaging pages.
  Plain labels, grouped by page; saves the whole content blob to Supabase
  (public.info_content), which the display reads. The "Events happening today"
  page is not here, it updates itself from the calendar. Access is gated by the
  manage page (role check) and by RLS on info_content.
*/

// Editor for a list of services (used by the services and demographic pages).
function ServiceListEditor({
  services,
  onChange,
}: {
  services: InfoService[];
  onChange: (next: InfoService[]) => void;
}) {
  const patch = (i: number, p: Partial<InfoService>) =>
    onChange(services.map((s, idx) => (idx === i ? { ...s, ...p } : s)));
  return (
    <div className="space-y-4">
      {services.map((s, i) => (
        <div key={i} className="border-2 border-placeholder p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field
              label="Name"
              value={s.name}
              onChange={(v) => patch(i, { name: v })}
            />
            <Field
              label="Location"
              value={s.location ?? ""}
              onChange={(v) => patch(i, { location: v })}
            />
            <label className="block">
              <span className={labelClass}>Icon</span>
              <select
                className={inputClass}
                value={s.icon ?? ""}
                onChange={(e) => patch(i, { icon: e.target.value })}
              >
                <option value="">No icon</option>
                {SERVICE_ICONS.map((ic) => (
                  <option key={ic.key} value={ic.key}>
                    {ic.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3">
            <Field
              label="Name (Español)"
              value={s.nameEs ?? ""}
              onChange={(v) => patch(i, { nameEs: v })}
            />
          </div>
          <div className="mt-3">
            <Field
              label="Time"
              hint="Put each time on its own line for multiple (e.g. meal times). Shown once (language-neutral)."
              value={s.time ?? ""}
              onChange={(v) => patch(i, { time: v })}
              textarea
              rows={2}
            />
          </div>
          <div className="mt-3">
            <Field
              label="Short description"
              value={s.description ?? ""}
              onChange={(v) => patch(i, { description: v })}
            />
          </div>
          <div className="mt-3">
            <Field
              label="Short description (Español)"
              value={s.descriptionEs ?? ""}
              onChange={(v) => patch(i, { descriptionEs: v })}
            />
          </div>
          <button
            type="button"
            className={`mt-3 ${smallBtn}`}
            onClick={() => onChange(services.filter((_, idx) => idx !== i))}
          >
            Remove service
          </button>
        </div>
      ))}
      <button
        type="button"
        className={smallBtn}
        onClick={() =>
          onChange([...services, { name: "", time: "", description: "", location: "" }])
        }
      >
        + Add service
      </button>
    </div>
  );
}

export default function InfoContentEditor() {
  const [content, setContent] = useState<InfoContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  useEffect(() => {
    fetchInfoContent().then(setContent);
  }, []);

  // Open + scroll to a page when the sidebar links to it via the hash.
  useEffect(() => {
    const ids = ["services", "new-arrivals", "demographic"];
    const onHash = () => {
      const id = location.hash.slice(1);
      if (!ids.includes(id)) return;
      setOpen((p) => new Set(p).add(id));
      setTimeout(
        () =>
          document
            .getElementById(id)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50,
      );
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Immutable helpers for the nested content shape.
  const setServices = (p: Partial<InfoContent["services"]>) =>
    setContent((c) => (c ? { ...c, services: { ...c.services, ...p } } : c));
  const setArrivals = (p: Partial<InfoContent["newArrivals"]>) =>
    setContent((c) =>
      c ? { ...c, newArrivals: { ...c.newArrivals, ...p } } : c,
    );
  const setDemographic = (p: Partial<InfoContent["demographic"]>) =>
    setContent((c) =>
      c ? { ...c, demographic: { ...c.demographic, ...p } } : c,
    );

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const err = await saveInfoContent(content);
    setSaving(false);
    if (err) setError(err);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    }
  }

  if (!content) {
    return <p className="text-lg text-ink/70">Loading editor…</p>;
  }

  const na = content.newArrivals;

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-lg">
        Edit the text shown on the public Digital Bulletin screens. Changes save
        to the display right away.
      </p>
      <p className="max-w-3xl border-l-4 border-teal bg-teal/10 py-2 pl-4 text-base">
        The <strong>“Happening today”</strong> screen is not listed here, it
        updates itself automatically from the calendar.
      </p>

      {/* --- Services overview page --- */}
      <CollapsiblePanel
        id="services"
        title="Services page"
        open={open.has("services")}
        onToggle={() => toggle("services")}
      >
        <Field
          label="Services page: title"
          value={content.services.title}
          onChange={(v) => setServices({ title: v })}
        />
        <Field
          label="Services page: title (Español)"
          value={content.services.titleEs ?? ""}
          onChange={(v) => setServices({ titleEs: v })}
        />
        <div>
          <p className={labelClass}>Services page: service list</p>
          <div className="mt-2">
            <ServiceListEditor
              services={content.services.items}
              onChange={(items) => setServices({ items })}
            />
          </div>
        </div>
      </CollapsiblePanel>

      {/* --- New arrivals page --- */}
      <CollapsiblePanel
        id="new-arrivals"
        title="New arrivals page"
        open={open.has("new-arrivals")}
        onToggle={() => toggle("new-arrivals")}
      >
        <Field
          label="New arrivals page: headline"
          value={na.headline}
          onChange={(v) => setArrivals({ headline: v })}
        />
        <Field
          label="New arrivals page: headline (Español)"
          value={na.headlineEs ?? ""}
          onChange={(v) => setArrivals({ headlineEs: v })}
        />
        <Field
          label="New arrivals page: message"
          value={na.intro}
          onChange={(v) => setArrivals({ intro: v })}
          textarea
          rows={3}
        />
        <Field
          label="New arrivals page: message (Español)"
          value={na.introEs ?? ""}
          onChange={(v) => setArrivals({ introEs: v })}
          textarea
          rows={3}
        />
        <Field
          label="“Where to start” heading"
          value={na.stepsLabel}
          onChange={(v) => setArrivals({ stepsLabel: v })}
        />
        <Field
          label="“Where to start” heading (Español)"
          value={na.stepsLabelEs ?? ""}
          onChange={(v) => setArrivals({ stepsLabelEs: v })}
        />
        <div>
          <p className={labelClass}>Steps</p>
          <div className="mt-2 space-y-4">
            {na.steps.map((step: InfoStep, i) => {
              const patch = (p: Partial<InfoStep>) =>
                setArrivals({
                  steps: na.steps.map((s, idx) =>
                    idx === i ? { ...s, ...p } : s,
                  ),
                });
              return (
                <div key={i} className="border-2 border-placeholder p-4">
                  <Field
                    label={`Step ${i + 1}: title`}
                    value={step.title}
                    onChange={(v) => patch({ title: v })}
                  />
                  <div className="mt-3">
                    <Field
                      label={`Step ${i + 1}: title (Español)`}
                      value={step.titleEs ?? ""}
                      onChange={(v) => patch({ titleEs: v })}
                    />
                  </div>
                  <div className="mt-3">
                    <Field
                      label={`Step ${i + 1}: detail`}
                      value={step.detail}
                      onChange={(v) => patch({ detail: v })}
                    />
                  </div>
                  <div className="mt-3">
                    <Field
                      label={`Step ${i + 1}: detail (Español)`}
                      value={step.detailEs ?? ""}
                      onChange={(v) => patch({ detailEs: v })}
                    />
                  </div>
                  <button
                    type="button"
                    className={`mt-3 ${smallBtn}`}
                    onClick={() =>
                      setArrivals({
                        steps: na.steps.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    Remove step
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className={smallBtn}
              onClick={() =>
                setArrivals({ steps: [...na.steps, { title: "", detail: "" }] })
              }
            >
              + Add step
            </button>
          </div>
        </div>
        <Field
          label="“Available now” heading"
          value={na.availableLabel}
          onChange={(v) => setArrivals({ availableLabel: v })}
        />
        <Field
          label="“Available now” heading (Español)"
          value={na.availableLabelEs ?? ""}
          onChange={(v) => setArrivals({ availableLabelEs: v })}
        />
        <div>
          <p className={labelClass}>“Available now” items (English + Español)</p>
          <div className="mt-2 space-y-2">
            {na.availableNow.map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 border-2 border-placeholder p-2 md:flex-row md:items-center"
              >
                <input
                  className={inputClass}
                  placeholder="English"
                  value={item}
                  onChange={(e) =>
                    setArrivals({
                      availableNow: na.availableNow.map((x, idx) =>
                        idx === i ? e.target.value : x,
                      ),
                    })
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Español"
                  value={(na.availableNowEs ?? [])[i] ?? ""}
                  onChange={(e) => {
                    const next = [...(na.availableNowEs ?? [])];
                    while (next.length < na.availableNow.length) next.push("");
                    next[i] = e.target.value;
                    setArrivals({ availableNowEs: next });
                  }}
                />
                <button
                  type="button"
                  className={smallBtn}
                  onClick={() =>
                    setArrivals({
                      availableNow: na.availableNow.filter((_, idx) => idx !== i),
                      availableNowEs: (na.availableNowEs ?? []).filter(
                        (_, idx) => idx !== i,
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className={smallBtn}
              onClick={() =>
                setArrivals({
                  availableNow: [...na.availableNow, ""],
                  availableNowEs: [...(na.availableNowEs ?? []), ""],
                })
              }
            >
              + Add item
            </button>
          </div>
        </div>
      </CollapsiblePanel>

      {/* --- Demographic page --- */}
      <CollapsiblePanel
        id="demographic"
        title="Featured group page (currently expecting mothers)"
        open={open.has("demographic")}
        onToggle={() => toggle("demographic")}
      >
        <Field
          label="Featured group page: title"
          value={content.demographic.heading}
          onChange={(v) => setDemographic({ heading: v })}
        />
        <Field
          label="Featured group page: title (Español)"
          value={content.demographic.headingEs ?? ""}
          onChange={(v) => setDemographic({ headingEs: v })}
        />
        <Field
          label="Featured group page: message"
          value={content.demographic.intro}
          onChange={(v) => setDemographic({ intro: v })}
          textarea
          rows={3}
        />
        <Field
          label="Featured group page: message (Español)"
          value={content.demographic.introEs ?? ""}
          onChange={(v) => setDemographic({ introEs: v })}
          textarea
          rows={3}
        />
        <div>
          <p className={labelClass}>Featured group page: service list</p>
          <div className="mt-2">
            <ServiceListEditor
              services={content.demographic.services}
              onChange={(services) => setDemographic({ services })}
            />
          </div>
        </div>
      </CollapsiblePanel>

      {/* --- Save --- */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="border-2 border-blue bg-blue px-6 py-3 text-lg font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span
            role="status"
            className="text-lg font-semibold text-blue"
          >
            ✓ Saved. The display is updated.
          </span>
        )}
        {error && (
          <span role="alert" className="text-lg font-semibold text-blue">
            Couldn’t save: {error}
          </span>
        )}
      </div>
    </div>
  );
}

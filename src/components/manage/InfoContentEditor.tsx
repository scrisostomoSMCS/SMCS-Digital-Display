"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  fetchInfoContent,
  saveInfoContent,
  SERVICE_ICONS,
  MAX_SERVICES_PER_PAGE,
  newServicePage,
  type InfoContent,
  type InfoService,
  type InfoServicePage,
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
  maxItems,
  allowReorder = false,
  longDescriptions = false,
}: {
  services: InfoService[];
  onChange: (next: InfoService[]) => void;
  maxItems?: number;
  allowReorder?: boolean;
  longDescriptions?: boolean;
}) {
  const patch = (i: number, p: Partial<InfoService>) =>
    onChange(services.map((s, idx) => (idx === i ? { ...s, ...p } : s)));
  const atLimit = maxItems !== undefined && services.length >= maxItems;

  function move(i: number, direction: -1 | 1) {
    const target = i + direction;
    if (target < 0 || target >= services.length) return;
    const next = [...services];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {services.map((s, i) => (
        <div key={i} className="border-2 border-placeholder p-3 lg:p-4">
          {allowReorder && (
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-placeholder pb-3">
              <p className="font-semibold text-blue">Service {i + 1}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move service ${i + 1} up`}
                  title="Move up"
                  className="flex h-11 w-11 items-center justify-center border-2 border-blue text-blue hover:bg-blue hover:text-paper disabled:opacity-35 lg:h-9 lg:w-9"
                >
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === services.length - 1}
                  aria-label={`Move service ${i + 1} down`}
                  title="Move down"
                  className="flex h-11 w-11 items-center justify-center border-2 border-blue text-blue hover:bg-blue hover:text-paper disabled:opacity-35 lg:h-9 lg:w-9"
                >
                  <ArrowDown size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-3">
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
              textarea={longDescriptions}
              rows={4}
            />
          </div>
          <div className="mt-3">
            <Field
              label="Short description (Español)"
              value={s.descriptionEs ?? ""}
              onChange={(v) => patch(i, { descriptionEs: v })}
              textarea={longDescriptions}
              rows={4}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${smallBtn} flex items-center gap-2`}
              onClick={() => onChange(services.filter((_, idx) => idx !== i))}
            >
              {allowReorder && <Trash2 size={16} aria-hidden="true" />}
              Remove service
            </button>
          </div>
        </div>
      ))}
      <div>
        <button
          type="button"
          className={`${smallBtn} flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-45`}
          disabled={atLimit}
          onClick={() =>
            onChange([
              ...services,
              { name: "", time: "", description: "", location: "" },
            ])
          }
        >
          {maxItems !== undefined && <Plus size={16} aria-hidden="true" />}
          Add service
        </button>
        {atLimit && (
          <p className="mt-2 text-sm font-semibold text-ink/60">
            Maximum of {maxItems} services reached for this page.
          </p>
        )}
      </div>
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

  // Open + scroll to a panel when the sidebar links to it via the hash. Each
  // services page is its own panel ("services-page-N").
  useEffect(() => {
    const onHash = () => {
      const id = location.hash.slice(1);
      const isPanel =
        id === "new-arrivals" ||
        id === "demographic" ||
        id.startsWith("services-page-");
      if (!isPanel) return;
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

  // Repeatable "This Week's Services" pages (each up to MAX_SERVICES_PER_PAGE).
  // Every page carries its own title/titleEs plus its list of services.
  const servicesPages = content.services.pages;
  const patchServicesPage = (idx: number, partial: Partial<InfoServicePage>) =>
    setServices({
      pages: servicesPages.map((p, i) => (i === idx ? { ...p, ...partial } : p)),
    });
  const addServicesPage = () =>
    setServices({ pages: [...servicesPages, newServicePage()] });
  const removeServicesPage = (idx: number) => {
    if (servicesPages.length <= 1) return;
    if (
      !window.confirm(
        `Remove "This Week's Services — Page ${idx + 1}"? Its services will be deleted.`,
      )
    )
      return;
    setServices({ pages: servicesPages.filter((_, i) => i !== idx) });
  };

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

      {/* --- Services pages (one panel per numbered page) --- */}
      {/* Each services page is its own collapsible panel, matching the sidebar
          links ("This Week's Services — Page N"). The heading shown on that
          page is editable per page, right inside the panel. */}
      {servicesPages.map((page, idx) => (
        <CollapsiblePanel
          key={idx}
          id={`services-page-${idx + 1}`}
          title={`This Week's Services — Page ${idx + 1}`}
          open={open.has(`services-page-${idx + 1}`)}
          onToggle={() => toggle(`services-page-${idx + 1}`)}
        >
          <div className="mb-4 border-b-2 border-blue/20 pb-4">
            <p className="mb-3 text-sm text-ink/60">
              The heading shown at the top of this services page.
            </p>
            <Field
              label="Page title"
              value={page.title}
              onChange={(v) => patchServicesPage(idx, { title: v })}
            />
            <div className="mt-3">
              <Field
                label="Page title (Español)"
                value={page.titleEs ?? ""}
                onChange={(v) => patchServicesPage(idx, { titleEs: v })}
              />
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink/60">
              {page.services.length} of {MAX_SERVICES_PER_PAGE} services
            </span>
            {servicesPages.length > 1 && (
              <button
                type="button"
                className={`${smallBtn} flex items-center gap-2`}
                onClick={() => removeServicesPage(idx)}
              >
                <Trash2 size={16} aria-hidden="true" />
                Remove this page
              </button>
            )}
          </div>
          <ServiceListEditor
            services={page.services}
            onChange={(next) => patchServicesPage(idx, { services: next })}
            maxItems={MAX_SERVICES_PER_PAGE}
            allowReorder
            longDescriptions
          />
        </CollapsiblePanel>
      ))}

      {/* Green so it clearly stands out from the other (neutral) buttons. */}
      <div>
        <button
          type="button"
          onClick={addServicesPage}
          className="flex items-center gap-2 border-2 border-green-600 bg-green-600 px-5 py-2.5 text-base font-semibold text-paper hover:bg-paper hover:text-green-600"
        >
          <Plus size={18} aria-hidden="true" />
          Add service page
        </button>
      </div>

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
                className="flex flex-col gap-2 border-2 border-placeholder p-2 lg:flex-row lg:items-center"
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
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center">
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

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  BilingualField,
  CollapsiblePanel,
  inputClass,
  labelClass,
  smallBtn,
} from "./editorFields";
import BulletinCanvasPreview from "@/components/information/BulletinCanvasPreview";
import ServicesOverviewPage from "@/components/information/ServicesOverviewPage";
import NewArrivalsPage from "@/components/information/NewArrivalsPage";
import DemographicPage from "@/components/information/DemographicPage";
import EventsTodayPage from "@/components/information/EventsTodayPage";
import {
  SERVICES_LIMITS,
  DEMOGRAPHIC_LIMITS,
  NEW_ARRIVALS_LIMITS,
} from "@/lib/bulletinLimits";
import {
  deleteBulletinPageLocations,
  fetchBulletinPageLocations,
  FIXED_BULLETIN_PAGE_KEYS,
  servicePageKey,
  type BulletinPageLocationMap,
} from "@/lib/bulletinLocations";
import BulletinPageLocationSelector from "./BulletinPageLocationSelector";
import LocationBadges, { useBulletinLocations } from "./LocationBadges";

/*
  Employee/admin editor for the /information display's three messaging pages.
  Plain labels, grouped by page; saves the whole content blob to Supabase
  (public.info_content), which the display reads. The "Events happening today"
  page is not here, it updates itself from the calendar. Access is gated by the
  manage page (role check) and by RLS on info_content.
*/

// Editor for a list of services (used by the services and demographic pages).
/*
  Preview block shown at the top of each page's panel: the real display
  component on the real canvas, so what staff see here is what the wall screen
  draws. Kept above the fields so the effect of an edit is visible while typing.
*/
function PagePreview({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 border-b-2 border-blue/20 pb-5">
      <p className={labelClass}>Preview</p>
      <p className="mb-2 text-sm text-ink/60">
        Exactly how this page appears on the Digital Bulletin, including the
        live bed-availability panel drawn on top of it.
      </p>
      <BulletinCanvasPreview>{children}</BulletinCanvasPreview>
    </div>
  );
}

type ServiceLimits = {
  name: number;
  nameEs: number;
  description: number;
  location: number;
  time: number;
};

function ServiceListEditor({
  services,
  onChange,
  maxItems,
  allowReorder = false,
  longDescriptions = false,
  limits,
}: {
  services: InfoService[];
  onChange: (next: InfoService[]) => void;
  maxItems?: number;
  allowReorder?: boolean;
  longDescriptions?: boolean;
  limits: ServiceLimits;
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
            <div className="lg:col-span-1">
              <BilingualField
                label="Name"
                value={s.name}
                onChange={(v) => patch(i, { name: v })}
                valueEs={s.nameEs ?? ""}
                onChangeEs={(v) => patch(i, { nameEs: v })}
                maxLength={limits.name}
              />
            </div>
            <Field
              label="Location"
              value={s.location ?? ""}
              onChange={(v) => patch(i, { location: v })}
              maxLength={limits.location}
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
              label="Time"
              hint="Put each time on its own line for multiple (e.g. meal times). Shown once (language-neutral)."
              value={s.time ?? ""}
              onChange={(v) => patch(i, { time: v })}
              textarea
              rows={2}
              maxLength={limits.time}
            />
          </div>
          <div className="mt-3">
            <BilingualField
              label="Short description"
              value={s.description ?? ""}
              onChange={(v) => patch(i, { description: v })}
              valueEs={s.descriptionEs ?? ""}
              onChangeEs={(v) => patch(i, { descriptionEs: v })}
              textarea={longDescriptions}
              rows={4}
              maxLength={limits.description}
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
              { id: crypto.randomUUID(), name: "", time: "", description: "", location: "" },
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
  // Snapshot last fetched/saved: the server diffs English against this to
  // decide which fields to auto-translate, so a save that doesn't touch a
  // field's English never overwrites a hand-edited Spanish value.
  const [loaded, setLoaded] = useState<InfoContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [removedServicePageKeys, setRemovedServicePageKeys] = useState<string[]>([]);

  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Location targeting for the header badges. The per-panel selectors write to
  // builtin_page_locations, so realtime keeps the badges in step with them.
  const locations = useBulletinLocations("info-content-editor");
  const [pageLocations, setPageLocations] = useState<BulletinPageLocationMap>({});

  const loadPageLocations = useCallback(async () => {
    setPageLocations(await fetchBulletinPageLocations());
  }, []);

  useEffect(() => {
    fetchInfoContent().then((c) => {
      setContent(c);
      setLoaded(c);
    });
  }, []);

  useEffect(() => {
    loadPageLocations();
    const channel = supabase
      .channel("info-content-page-locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "builtin_page_locations" },
        loadPageLocations,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPageLocations]);

  // Open + scroll to a panel when the sidebar links to it via the hash. Each
  // services page is its own panel ("services-page-N").
  useEffect(() => {
    const onHash = () => {
      const id = location.hash.slice(1);
      const isPanel =
        id === "new-arrivals" ||
        id === "demographic" ||
        id === "events-today" ||
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
    if (!content || !loaded) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    setWarnings([]);
    const result = await saveInfoContent(content, loaded);
    setSaving(false);
    if (result.error) setError(result.error);
    else {
      const cleanupErrors = await Promise.all(
        removedServicePageKeys.map(deleteBulletinPageLocations),
      );
      const cleanupError = cleanupErrors.find(Boolean);
      if (cleanupError) {
        setError(`Page changes saved, but old location settings could not be removed: ${cleanupError}`);
        return;
      }
      setRemovedServicePageKeys([]);
      // The server returns the merged content, including any Spanish it just
      // auto-translated, so the (collapsed) Spanish fields reflect it right
      // away without a refetch. It also becomes the new diff baseline.
      if (result.content) {
        setContent(result.content);
        setLoaded(result.content);
      } else {
        setLoaded(content);
      }
      setWarnings(result.warnings);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    }
  }

  const locationBadge = (pageKey: string, panelId: string) => (
    <LocationBadges
      locationIds={pageLocations[pageKey] ?? []}
      locations={locations}
      expanded={open.has(panelId)}
    />
  );

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
    setRemovedServicePageKeys((keys) => [
      ...keys,
      servicePageKey(servicesPages[idx].id),
    ]);
    setServices({ pages: servicesPages.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-lg">
        Edit the text shown on the public Digital Bulletin screens. Changes save
        to the display right away.
      </p>
      <p className="max-w-3xl border-l-4 border-teal bg-teal/10 py-2 pl-4 text-base">
        The content on the <strong>“Happening today”</strong> screen updates
        automatically from the calendar. Its display locations can still be
        selected below.
      </p>

      {/* --- Services pages (one panel per numbered page) --- */}
      {/* Each services page is its own collapsible panel, matching the sidebar
          links ("This Week's Services — Page N"). The heading shown on that
          page is editable per page, right inside the panel. */}
      {servicesPages.map((page, idx) => (
        <CollapsiblePanel
          key={page.id}
          id={`services-page-${idx + 1}`}
          title={`This Week's Services — Page ${idx + 1}`}
          badge={locationBadge(
            servicePageKey(page.id),
            `services-page-${idx + 1}`,
          )}
          open={open.has(`services-page-${idx + 1}`)}
          onToggle={() => toggle(`services-page-${idx + 1}`)}
        >
          <BulletinPageLocationSelector pageKey={servicePageKey(page.id)} />

          <PagePreview>
            <ServicesOverviewPage
              title={page.title}
              titleEs={page.titleEs}
              services={page.services}
              pageNumber={idx + 1}
              totalPages={servicesPages.length}
              animate={false}
            />
          </PagePreview>

          <div className="mb-4 border-b-2 border-blue/20 pb-4">
            <p className="mb-3 text-sm text-ink/60">
              The heading shown at the top of this services page.
            </p>
            <BilingualField
              label="Page title"
              value={page.title}
              onChange={(v) => patchServicesPage(idx, { title: v })}
              valueEs={page.titleEs ?? ""}
              onChangeEs={(v) => patchServicesPage(idx, { titleEs: v })}
              maxLength={SERVICES_LIMITS.pageTitle}
            />
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
            limits={{
              name: SERVICES_LIMITS.serviceName,
              nameEs: SERVICES_LIMITS.serviceName,
              time: SERVICES_LIMITS.serviceTime,
              description: SERVICES_LIMITS.serviceDescription,
              location: SERVICES_LIMITS.serviceLocation,
            }}
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
        badge={locationBadge(
          FIXED_BULLETIN_PAGE_KEYS.newArrivals,
          "new-arrivals",
        )}
        open={open.has("new-arrivals")}
        onToggle={() => toggle("new-arrivals")}
      >
        <BulletinPageLocationSelector
          pageKey={FIXED_BULLETIN_PAGE_KEYS.newArrivals}
        />

        <PagePreview>
          <NewArrivalsPage content={na} animate={false} />
        </PagePreview>

        <BilingualField
          label="New arrivals page: headline"
          value={na.headline}
          onChange={(v) => setArrivals({ headline: v })}
          valueEs={na.headlineEs ?? ""}
          onChangeEs={(v) => setArrivals({ headlineEs: v })}
          maxLength={NEW_ARRIVALS_LIMITS.headline}
        />
        <BilingualField
          label="New arrivals page: message"
          value={na.intro}
          onChange={(v) => setArrivals({ intro: v })}
          valueEs={na.introEs ?? ""}
          onChangeEs={(v) => setArrivals({ introEs: v })}
          textarea
          rows={3}
          maxLength={NEW_ARRIVALS_LIMITS.intro}
        />
        <BilingualField
          label="“Where to start” heading"
          value={na.stepsLabel}
          onChange={(v) => setArrivals({ stepsLabel: v })}
          valueEs={na.stepsLabelEs ?? ""}
          onChangeEs={(v) => setArrivals({ stepsLabelEs: v })}
          maxLength={NEW_ARRIVALS_LIMITS.stepsLabel}
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
                  <BilingualField
                    label={`Step ${i + 1}: title`}
                    value={step.title}
                    onChange={(v) => patch({ title: v })}
                    valueEs={step.titleEs ?? ""}
                    onChangeEs={(v) => patch({ titleEs: v })}
                    maxLength={NEW_ARRIVALS_LIMITS.stepTitle}
                  />
                  <div className="mt-3">
                    <BilingualField
                      label={`Step ${i + 1}: detail`}
                      value={step.detail}
                      onChange={(v) => patch({ detail: v })}
                      valueEs={step.detailEs ?? ""}
                      onChangeEs={(v) => patch({ detailEs: v })}
                      maxLength={NEW_ARRIVALS_LIMITS.stepDetail}
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
            {/* A 4th step overflows the page by ~246px at any text length. */}
            <button
              type="button"
              className={`${smallBtn} disabled:cursor-not-allowed disabled:opacity-45`}
              disabled={na.steps.length >= NEW_ARRIVALS_LIMITS.maxSteps}
              onClick={() =>
                setArrivals({ steps: [...na.steps, { title: "", detail: "" }] })
              }
            >
              + Add step
            </button>
            {na.steps.length >= NEW_ARRIVALS_LIMITS.maxSteps && (
              <p className="text-sm font-semibold text-ink/60">
                Maximum of {NEW_ARRIVALS_LIMITS.maxSteps} steps fits on this
                page.
              </p>
            )}
          </div>
        </div>
        <BilingualField
          label="“Available now” heading"
          value={na.availableLabel}
          onChange={(v) => setArrivals({ availableLabel: v })}
          valueEs={na.availableLabelEs ?? ""}
          onChangeEs={(v) => setArrivals({ availableLabelEs: v })}
          maxLength={NEW_ARRIVALS_LIMITS.availableLabel}
        />
        <div>
          <p className={labelClass}>“Available now” items</p>
          <div className="mt-2 space-y-2">
            {na.availableNow.map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 border-2 border-placeholder p-2 lg:flex-row lg:items-start"
              >
                <div className="min-w-0 flex-1">
                  <BilingualField
                    label={`Item ${i + 1}`}
                    value={item}
                    onChange={(v) =>
                      setArrivals({
                        availableNow: na.availableNow.map((x, idx) =>
                          idx === i ? v : x,
                        ),
                      })
                    }
                    valueEs={(na.availableNowEs ?? [])[i] ?? ""}
                    onChangeEs={(v) => {
                      const next = [...(na.availableNowEs ?? [])];
                      while (next.length < na.availableNow.length) next.push("");
                      next[i] = v;
                      setArrivals({ availableNowEs: next });
                    }}
                    maxLength={NEW_ARRIVALS_LIMITS.availableItem}
                  />
                </div>
                <button
                  type="button"
                  className={`${smallBtn} shrink-0`}
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
            {/* A 5th item overflows the teal panel by ~208px at any length. */}
            <button
              type="button"
              className={`${smallBtn} disabled:cursor-not-allowed disabled:opacity-45`}
              disabled={
                na.availableNow.length >= NEW_ARRIVALS_LIMITS.maxAvailableNow
              }
              onClick={() =>
                setArrivals({
                  availableNow: [...na.availableNow, ""],
                  availableNowEs: [...(na.availableNowEs ?? []), ""],
                })
              }
            >
              + Add item
            </button>
            {na.availableNow.length >= NEW_ARRIVALS_LIMITS.maxAvailableNow && (
              <p className="text-sm font-semibold text-ink/60">
                Maximum of {NEW_ARRIVALS_LIMITS.maxAvailableNow} items fits on
                this page.
              </p>
            )}
          </div>
        </div>
      </CollapsiblePanel>

      {/* --- Demographic page --- */}
      <CollapsiblePanel
        id="demographic"
        title="Featured group page (currently expecting mothers)"
        badge={locationBadge(
          FIXED_BULLETIN_PAGE_KEYS.demographic,
          "demographic",
        )}
        open={open.has("demographic")}
        onToggle={() => toggle("demographic")}
      >
        <BulletinPageLocationSelector
          pageKey={FIXED_BULLETIN_PAGE_KEYS.demographic}
        />

        <PagePreview>
          <DemographicPage content={content.demographic} animate={false} />
        </PagePreview>

        <BilingualField
          label="Featured group page: title"
          value={content.demographic.heading}
          onChange={(v) => setDemographic({ heading: v })}
          valueEs={content.demographic.headingEs ?? ""}
          onChangeEs={(v) => setDemographic({ headingEs: v })}
          maxLength={DEMOGRAPHIC_LIMITS.heading}
        />
        <BilingualField
          label="Featured group page: message"
          value={content.demographic.intro}
          onChange={(v) => setDemographic({ intro: v })}
          valueEs={content.demographic.introEs ?? ""}
          onChangeEs={(v) => setDemographic({ introEs: v })}
          textarea
          rows={3}
          maxLength={DEMOGRAPHIC_LIMITS.intro}
        />
        <div>
          <p className={labelClass}>Featured group page: service list</p>
          {/* Six cards in a fixed 3x2 grid that clips, so the per-card budget
              is smaller here than on "This Week's Services". */}
          <p className="text-sm text-ink/60">
            Six cards fit on this page.
          </p>
          <div className="mt-2">
            <ServiceListEditor
              services={content.demographic.services}
              onChange={(services) => setDemographic({ services })}
              maxItems={DEMOGRAPHIC_LIMITS.maxServices}
              limits={{
                name: DEMOGRAPHIC_LIMITS.serviceName,
                nameEs: DEMOGRAPHIC_LIMITS.serviceName,
                time: DEMOGRAPHIC_LIMITS.serviceTime,
                description: DEMOGRAPHIC_LIMITS.serviceDescription,
                location: DEMOGRAPHIC_LIMITS.serviceLocation,
              }}
            />
          </div>
        </div>
      </CollapsiblePanel>

      {/* --- Events today page (content comes from the calendar) --- */}
      <CollapsiblePanel
        id="events-today"
        title="Events happening today"
        badge={locationBadge(
          FIXED_BULLETIN_PAGE_KEYS.eventsToday,
          "events-today",
        )}
        open={open.has("events-today")}
        onToggle={() => toggle("events-today")}
      >
        <BulletinPageLocationSelector
          pageKey={FIXED_BULLETIN_PAGE_KEYS.eventsToday}
        />

        {/* Read-only by nature: this page has no editable text, it draws
            today's calendar events. The preview shows today's real list. */}
        <PagePreview>
          <EventsTodayPage animate={false} />
        </PagePreview>

        <p className="text-base text-ink/70">
          This page’s events come from the calendar automatically. Use the
          location setting above to choose which bulletin screens include it.
          Event names and locations are limited on the calendar form itself.
        </p>
      </CollapsiblePanel>

      {/* --- Save --- */}
      <div className="flex flex-col items-start gap-4">
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
        {warnings.length > 0 && (
          <ul
            role="status"
            className="max-w-2xl space-y-1 border-l-4 border-teal bg-teal/10 py-2 pl-4 text-sm text-ink/80"
          >
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

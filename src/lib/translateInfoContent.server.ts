import type {
  InfoContent,
  InfoService,
  InfoServicePage,
  InfoStep,
} from "./infoContent";
import {
  SERVICES_LIMITS,
  DEMOGRAPHIC_LIMITS,
  NEW_ARRIVALS_LIMITS,
} from "./bulletinLimits";
import { translateTexts } from "./translate.server";

/*
  Server-side auto-translate for info_content, run once per save. Diffs the
  edited content against the snapshot the editor loaded (or last saved), so a
  field whose English didn't change never gets its Spanish overwritten — that
  is what protects a hand-corrected translation. A field is only skipped when
  its English is unchanged AND it already has a Spanish value; an unchanged
  field with an empty Spanish value (never translated, or left blank after a
  prior translate failure) is still queued, so a failed translation can heal
  itself on the next save instead of leaving a permanent stale/blank value.

  Repeatable arrays (services within a page, steps) are matched by an English
  key (service name, step title) rather than array position, so reordering
  them (the services list has up/down arrows) never looks like a text change.
  This mirrors the SERVICE_ES / STEP_ES_BY_TITLE lookups already in
  infoContent.ts, which key Spanish defaults by English text the same way.

  Reliability: this function never throws. Each field's translation is
  isolated (see translateTexts' use of Promise.allSettled) — one field
  failing (bad response, network, exhausted quota) never discards
  translations that succeeded alongside it. A failed field keeps whatever
  Spanish was submitted and is reported back in `warnings` so it's visible in
  the editor UI instead of silently saving stale/placeholder text.
*/

type Job = {
  label: string;
  english: string;
  limit?: number;
  apply: (es: string) => void;
};

function byKey<T>(items: T[], keyOf: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = keyOf(item);
    if (key) map.set(key, item);
  }
  return map;
}

export async function translateChangedFields(
  loaded: InfoContent,
  content: InfoContent,
): Promise<{ merged: InfoContent; warnings: string[] }> {
  // Work on a deep copy so job.apply() calls can freely mutate nested fields.
  const merged: InfoContent = JSON.parse(JSON.stringify(content));
  const jobs: Job[] = [];
  const warnings: string[] = [];

  const scalar = (
    label: string,
    loadedEn: string,
    currentEn: string,
    currentEs: string | undefined,
    limit: number | undefined,
    apply: (es: string) => void,
  ) => {
    if (!currentEn) return;
    const changed = currentEn !== loadedEn;
    const neverTranslated = !currentEs;
    if (changed || neverTranslated) jobs.push({ label, english: currentEn, limit, apply });
  };

  // A service with no loaded counterpart (new, or renamed since load) has
  // nothing to diff against — translate whatever it currently has.
  const queueNewService = (label: string, service: InfoService, limits: typeof SERVICES_LIMITS | typeof DEMOGRAPHIC_LIMITS, applyName: (es: string) => void, applyDesc: (es: string) => void) => {
    if (service.name) {
      jobs.push({ label: `${label} name`, english: service.name, limit: limits.serviceName, apply: applyName });
    }
    if (service.description) {
      jobs.push({ label: `${label} description`, english: service.description, limit: limits.serviceDescription, apply: applyDesc });
    }
  };

  // --- services pages (matched by stable page id) ---
  const loadedPagesById = byKey(loaded.services.pages, (p) => p.id);
  merged.services.pages.forEach((page: InfoServicePage, pi) => {
    const loadedPage = loadedPagesById.get(page.id);
    scalar(
      `Services page ${pi + 1} title`,
      loadedPage?.title ?? "",
      page.title,
      page.titleEs,
      SERVICES_LIMITS.pageTitle,
      (es) => (merged.services.pages[pi].titleEs = es),
    );

    const loadedServicesByName = byKey(loadedPage?.services ?? [], (s) => s.name);
    page.services.forEach((service: InfoService, si) => {
      const loadedService = loadedServicesByName.get(service.name);
      const label = `Services page ${pi + 1}, service ${si + 1}`;
      if (!loadedService) {
        queueNewService(
          label,
          service,
          SERVICES_LIMITS,
          (es) => (merged.services.pages[pi].services[si].nameEs = es),
          (es) => (merged.services.pages[pi].services[si].descriptionEs = es),
        );
      } else {
        // Name is the match key, so it can't itself have "changed" here —
        // this only fires as recovery when nameEs was never set (e.g. a
        // prior translate failure left it blank/stale).
        scalar(
          `${label} name`,
          loadedService.name,
          service.name,
          service.nameEs,
          SERVICES_LIMITS.serviceName,
          (es) => (merged.services.pages[pi].services[si].nameEs = es),
        );
        scalar(
          `${label} description`,
          loadedService.description ?? "",
          service.description ?? "",
          service.descriptionEs,
          SERVICES_LIMITS.serviceDescription,
          (es) => (merged.services.pages[pi].services[si].descriptionEs = es),
        );
      }
    });
  });

  // --- new arrivals ---
  const na = merged.newArrivals;
  const lna = loaded.newArrivals;
  scalar("New arrivals headline", lna.headline, na.headline, na.headlineEs, NEW_ARRIVALS_LIMITS.headline, (es) => (na.headlineEs = es));
  scalar("New arrivals message", lna.intro, na.intro, na.introEs, NEW_ARRIVALS_LIMITS.intro, (es) => (na.introEs = es));
  scalar("New arrivals steps label", lna.stepsLabel, na.stepsLabel, na.stepsLabelEs, NEW_ARRIVALS_LIMITS.stepsLabel, (es) => (na.stepsLabelEs = es));
  scalar("New arrivals available-now label", lna.availableLabel, na.availableLabel, na.availableLabelEs, NEW_ARRIVALS_LIMITS.availableLabel, (es) => (na.availableLabelEs = es));

  const loadedStepsByTitle = byKey(lna.steps, (s) => s.title);
  na.steps.forEach((step: InfoStep, i) => {
    const loadedStep = loadedStepsByTitle.get(step.title);
    const label = `New arrivals step ${i + 1}`;
    if (!loadedStep) {
      if (step.title) {
        jobs.push({ label: `${label} title`, english: step.title, limit: NEW_ARRIVALS_LIMITS.stepTitle, apply: (es) => (na.steps[i].titleEs = es) });
      }
      if (step.detail) {
        jobs.push({ label: `${label} detail`, english: step.detail, limit: NEW_ARRIVALS_LIMITS.stepDetail, apply: (es) => (na.steps[i].detailEs = es) });
      }
    } else {
      scalar(`${label} title`, loadedStep.title, step.title, step.titleEs, NEW_ARRIVALS_LIMITS.stepTitle, (es) => (na.steps[i].titleEs = es));
      scalar(`${label} detail`, loadedStep.detail, step.detail, step.detailEs, NEW_ARRIVALS_LIMITS.stepDetail, (es) => (na.steps[i].detailEs = es));
    }
  });

  // Plain string arrays: matched by the literal text, since that's the
  // established key elsewhere in this file (see AVAILABLE_ES_BY_TEXT). Still
  // queued when unchanged if its Spanish slot is missing/blank, so a prior
  // translate failure on this item can heal on a later save.
  const loadedAvailableNow = new Set(lna.availableNow);
  na.availableNow.forEach((text: string, i: number) => {
    if (!text) return;
    if (loadedAvailableNow.has(text) && na.availableNowEs?.[i]) return;
    jobs.push({
      label: `New arrivals available-now item ${i + 1}`,
      english: text,
      limit: NEW_ARRIVALS_LIMITS.availableItem,
      apply: (es) => {
        if (!na.availableNowEs) na.availableNowEs = [];
        while (na.availableNowEs.length <= i) na.availableNowEs.push("");
        na.availableNowEs[i] = es;
      },
    });
  });

  // --- demographic page ---
  const dem = merged.demographic;
  const ldem = loaded.demographic;
  scalar("Featured group heading", ldem.heading, dem.heading, dem.headingEs, DEMOGRAPHIC_LIMITS.heading, (es) => (dem.headingEs = es));
  scalar("Featured group message", ldem.intro, dem.intro, dem.introEs, DEMOGRAPHIC_LIMITS.intro, (es) => (dem.introEs = es));

  const loadedDemByName = byKey(ldem.services, (s) => s.name);
  dem.services.forEach((service: InfoService, si) => {
    const loadedService = loadedDemByName.get(service.name);
    const label = `Featured group service ${si + 1}`;
    if (!loadedService) {
      queueNewService(
        label,
        service,
        DEMOGRAPHIC_LIMITS,
        (es) => (dem.services[si].nameEs = es),
        (es) => (dem.services[si].descriptionEs = es),
      );
    } else {
      scalar(
        `${label} name`,
        loadedService.name,
        service.name,
        service.nameEs,
        DEMOGRAPHIC_LIMITS.serviceName,
        (es) => (dem.services[si].nameEs = es),
      );
      scalar(
        `${label} description`,
        loadedService.description ?? "",
        service.description ?? "",
        service.descriptionEs,
        DEMOGRAPHIC_LIMITS.serviceDescription,
        (es) => (dem.services[si].descriptionEs = es),
      );
    }
  });

  if (jobs.length === 0) return { merged, warnings };

  try {
    const results = await translateTexts(jobs.map((j) => j.english));
    jobs.forEach((job, i) => {
      const result = results[i];
      if (result.ok) {
        job.apply(result.text);
        if (job.limit !== undefined && result.text.length > job.limit) {
          warnings.push(
            `${job.label}: Spanish translation is ${result.text.length} characters, over the ${job.limit}-character display limit — worth checking it doesn't clip on the bulletin.`,
          );
        }
      } else {
        console.error(`Auto-translate failed for ${job.label}:`, result.error);
        warnings.push(
          `${job.label}: auto-translate failed (${result.error}) — Spanish left as submitted; you may want to check/translate it by hand.`,
        );
      }
    });
  } catch (err) {
    // Defense in depth: translateTexts isolates per-item failures internally
    // and shouldn't throw, but if something unexpected does, don't lose the
    // save over it — English still saves, Spanish stays as submitted.
    console.error("Auto-translate failed unexpectedly, saving English only (Spanish left unchanged):", err);
    warnings.push("Auto-translate failed unexpectedly — Spanish fields were left as submitted.");
  }

  return { merged, warnings };
}

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
  is what protects a hand-corrected translation. Only English text that
  actually changed since `loaded` gets sent to Google Translate.

  Repeatable arrays (services within a page, steps) are matched by an English
  key (service name, step title) rather than array position, so reordering
  them (the services list has up/down arrows) never looks like a text change.
  This mirrors the SERVICE_ES / STEP_ES_BY_TITLE lookups already in
  infoContent.ts, which key Spanish defaults by English text the same way.

  Reliability: this function never throws. If the Google Translate call fails
  (bad/missing key, network, quota), the error is logged and `merged` is
  returned with Spanish fields untouched — i.e. English still saves, and
  Spanish stays at whatever was submitted (the prior saved value, unless
  staff hand-edited it in this same save).
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
    limit: number | undefined,
    apply: (es: string) => void,
  ) => {
    if (currentEn && currentEn !== loadedEn) jobs.push({ label, english: currentEn, limit, apply });
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
        scalar(
          `${label} description`,
          loadedService.description ?? "",
          service.description ?? "",
          SERVICES_LIMITS.serviceDescription,
          (es) => (merged.services.pages[pi].services[si].descriptionEs = es),
        );
      }
    });
  });

  // --- new arrivals ---
  const na = merged.newArrivals;
  const lna = loaded.newArrivals;
  scalar("New arrivals headline", lna.headline, na.headline, NEW_ARRIVALS_LIMITS.headline, (es) => (na.headlineEs = es));
  scalar("New arrivals message", lna.intro, na.intro, NEW_ARRIVALS_LIMITS.intro, (es) => (na.introEs = es));
  scalar("New arrivals steps label", lna.stepsLabel, na.stepsLabel, NEW_ARRIVALS_LIMITS.stepsLabel, (es) => (na.stepsLabelEs = es));
  scalar("New arrivals available-now label", lna.availableLabel, na.availableLabel, NEW_ARRIVALS_LIMITS.availableLabel, (es) => (na.availableLabelEs = es));

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
      scalar(`${label} detail`, loadedStep.detail, step.detail, NEW_ARRIVALS_LIMITS.stepDetail, (es) => (na.steps[i].detailEs = es));
    }
  });

  // Plain string arrays: matched by the literal text, since that's the
  // established key elsewhere in this file (see AVAILABLE_ES_BY_TEXT).
  const loadedAvailableNow = new Set(lna.availableNow);
  na.availableNow.forEach((text: string, i: number) => {
    if (!text || loadedAvailableNow.has(text)) return; // unchanged: leave submitted Es as-is
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
  scalar("Featured group heading", ldem.heading, dem.heading, DEMOGRAPHIC_LIMITS.heading, (es) => (dem.headingEs = es));
  scalar("Featured group message", ldem.intro, dem.intro, DEMOGRAPHIC_LIMITS.intro, (es) => (dem.introEs = es));

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
        `${label} description`,
        loadedService.description ?? "",
        service.description ?? "",
        DEMOGRAPHIC_LIMITS.serviceDescription,
        (es) => (dem.services[si].descriptionEs = es),
      );
    }
  });

  if (jobs.length === 0) return { merged, warnings };

  try {
    const translations = await translateTexts(jobs.map((j) => j.english));
    jobs.forEach((job, i) => {
      const es = translations[i];
      job.apply(es);
      if (job.limit !== undefined && es.length > job.limit) {
        warnings.push(
          `${job.label}: Spanish translation is ${es.length} characters, over the ${job.limit}-character display limit — worth checking it doesn't clip on the bulletin.`,
        );
      }
    });
  } catch (err) {
    console.error("Auto-translate failed, saving English only (Spanish left unchanged):", err);
  }

  return { merged, warnings };
}

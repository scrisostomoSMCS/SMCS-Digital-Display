import InfoPageShell from "./InfoPageShell";
import { featuredDemographic } from "@/lib/informationContent";

/*
  Page 3: services highlighted for one demographic (currently expecting
  mothers). Reads whichever demographic is featured in informationContent.ts,
  so the focus can be swapped/expanded without touching this component.
*/
export default function DemographicPage() {
  const d = featuredDemographic;
  return (
    <InfoPageShell title={d.heading}>
      <div className="flex h-full flex-col gap-8">
        <p className="max-w-5xl text-3xl md:text-4xl">{d.intro}</p>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 lg:grid-cols-3 lg:gap-8">
          {d.services.map((s) => (
            <div key={s.name} className="border-l-8 border-teal px-6 py-4">
              <h2 className="text-2xl font-bold md:text-3xl">{s.name}</h2>
              <p className="mt-2 text-xl font-semibold text-blue md:text-2xl">
                {s.schedule}
              </p>
              <p className="mt-2 text-lg md:text-xl">{s.description}</p>
              {s.location && (
                <p className="mt-1 text-lg text-ink/70 md:text-xl">
                  {s.location}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </InfoPageShell>
  );
}

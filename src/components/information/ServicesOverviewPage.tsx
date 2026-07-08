import InfoPageShell from "./InfoPageShell";
import { weeklyServices } from "@/lib/informationContent";

// Page 1: all services available on campus this week — scannable at a distance.
export default function ServicesOverviewPage() {
  return (
    <InfoPageShell title="This Week's Services">
      <div className="grid h-full grid-cols-2 gap-6 lg:grid-cols-3 lg:gap-8">
        {weeklyServices.map((s) => (
          <div key={s.name} className="border-l-8 border-blue px-6 py-4">
            <h2 className="text-3xl font-bold md:text-4xl">{s.name}</h2>
            <p className="mt-2 text-2xl font-semibold text-teal md:text-3xl">
              {s.schedule}
            </p>
            <p className="mt-2 text-xl md:text-2xl">{s.description}</p>
            {s.location && (
              <p className="mt-1 text-xl text-ink/70 md:text-2xl">
                {s.location}
              </p>
            )}
          </div>
        ))}
      </div>
    </InfoPageShell>
  );
}

import InfoPageShell from "./InfoPageShell";
import { newArrivals } from "@/lib/informationContent";

// Page 2: for people who just came onto campus — warm, oriented to "start here".
export default function NewArrivalsPage() {
  return (
    <InfoPageShell title={newArrivals.heading}>
      <div className="flex h-full flex-col gap-8">
        <p className="max-w-5xl text-3xl md:text-4xl">{newArrivals.intro}</p>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-10 lg:grid-cols-2">
          <section>
            <h2 className="text-3xl font-bold text-blue md:text-4xl">
              Where to start
            </h2>
            <ol className="mt-6 space-y-6">
              {newArrivals.steps.map((step, i) => (
                <li key={step.title} className="flex gap-5">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-blue text-2xl font-bold text-blue">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-2xl font-bold md:text-3xl">
                      {step.title}
                    </p>
                    <p className="mt-1 text-xl md:text-2xl">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-teal md:text-4xl">
              Available right now
            </h2>
            <ul className="mt-6 space-y-4">
              {newArrivals.availableNow.map((item) => (
                <li
                  key={item}
                  className="border-l-8 border-teal pl-5 text-2xl md:text-3xl"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </InfoPageShell>
  );
}

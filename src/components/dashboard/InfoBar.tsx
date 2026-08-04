import { INFO_BAR_ITEMS } from "@/lib/dashboardConfig";

/*
  Scrolling marquee at the very top of the dashboard. Content comes from the
  single INFO_BAR_ITEMS config value (contact details + standing
  announcements), so making it staff-editable later is a one-spot change.

  The items are rendered twice so the CSS animation can loop seamlessly by
  translating exactly half the track width (see .marquee in globals.css).
*/
export default function InfoBar() {
  const loop = [...INFO_BAR_ITEMS, ...INFO_BAR_ITEMS];

  return (
    <div className="overflow-hidden border-b-4 border-teal bg-blue text-paper">
      <div className="marquee whitespace-nowrap py-3">
        {loop.map((text, i) => (
          <span
            key={i}
            // aria-hidden on the duplicated half so screen readers don't repeat it
            aria-hidden={i >= INFO_BAR_ITEMS.length}
            className="mx-10 text-xl font-semibold md:text-2xl"
          >
            {text}
            <span aria-hidden="true" className="mx-10 text-teal/60">
              •
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

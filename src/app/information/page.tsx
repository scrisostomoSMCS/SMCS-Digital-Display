import InformationDisplay from "@/components/information/InformationDisplay";
import { bulletinFontClass } from "@/lib/bulletinFonts";

export const metadata = {
  title: "Digital Bulletin | SMCS",
};

/*
  Full-screen, auto-rotating informational display for wall-mounted campus
  screens. Lives outside the (site) route group so it renders without site
  chrome (like the Live Calendar). Runs unattended; has its own Back to home.

  This route is embedded as-is in an iframe (the WordPress site, Yodeck), so it
  carries no site header and never scrolls: it fills its box exactly and the
  display scales its canvas to fit. Deliberately one rendering for every
  context — a size-conditional layout here is what previously made an embedded
  bulletin fall apart into a stack of slides.
*/
export default async function InformationPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawLocation = Array.isArray(params.location) ? params.location[0] : params.location;
  const location = rawLocation?.trim().toLowerCase() || undefined;

  return (
    <div
      className={`${bulletinFontClass} h-dvh w-full overflow-hidden`}
    >
      <InformationDisplay locationSlug={location} />
    </div>
  );
}

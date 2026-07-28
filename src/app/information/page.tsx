import { Playfair_Display, Poppins } from "next/font/google";
import InformationDisplay from "@/components/information/InformationDisplay";

export const metadata = {
  title: "Digital Bulletin | SMCS",
};

// Titles: Playfair Display SemiBold (600). Body/labels/service text: Poppins
// Medium/SemiBold (500/600). Scoped to this display via CSS variables so the
// rest of the site keeps its own typography.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-body",
  display: "swap",
});

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
      className={`${playfair.variable} ${poppins.variable} h-dvh w-full overflow-hidden`}
    >
      <InformationDisplay locationSlug={location} />
    </div>
  );
}

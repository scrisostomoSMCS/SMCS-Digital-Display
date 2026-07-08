import InformationDisplay from "@/components/information/InformationDisplay";

export const metadata = {
  title: "Information | SMCS",
};

/*
  Full-screen, auto-rotating informational display for wall-mounted campus
  screens. Lives outside the (site) route group so it renders without site
  chrome (like the Live Dashboard). Runs unattended; has its own Back to home.
*/
export default function InformationPage() {
  return <InformationDisplay />;
}

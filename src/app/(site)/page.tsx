import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Section from "@/components/Section";
import ImageWithOverlay from "@/components/ImageWithOverlay";
import BulletinPreviewCard from "@/components/BulletinPreviewCard";
import BedAvailabilityPopup from "@/components/BedAvailabilityPopup";

// User-facing text comes from messages/<locale>.json ("home" section).
export default async function Home() {
  const t = await getTranslations("home");

  return (
    <>
      {/* Live bed counts, shown bottom-left on arrival until dismissed. */}
      <BedAvailabilityPopup />

      {/* Hero, background photo (public/hero.avif) behind the bulletin preview.
          A neutral dark scrim over the photo darkens it and keeps the white
          text readable; adjust bg-ink/NN to darken more or less. The nav bar
          overlays the top of this image on the home page (see NavBar). */}
      <section className="relative flex min-h-[calc(100vh-3rem)] items-center overflow-hidden bg-blue text-paper">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero.avif')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-ink/70" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-20">
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="inline-block border-2 border-paper bg-paper px-7 py-3 text-lg font-semibold text-blue hover:bg-blue hover:text-paper"
            >
              {t("liveCalendar")}
            </Link>
            <Link
              href="/#about"
              className="inline-block border-2 border-paper px-7 py-3 text-lg font-semibold text-paper hover:bg-paper hover:text-ink"
            >
              {t("learnMore")}
            </Link>
          </div>

          {/* Scaled-down live window into /information, linked to the full page. */}
          <BulletinPreviewCard />
        </div>
      </section>

      {/* About */}
      <Section
        id="about"
        title={t("about.title")}
        className="scroll-mt-28 md:scroll-mt-16"
      >
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <ImageWithOverlay
            frame="teal"
            src="/cafeteria.webp"
            alt={t("about.imageOverlay")}
            scrimClassName="bg-black/60"
          >
            <h3 className="text-2xl font-bold">{t("about.imageOverlay")}</h3>
          </ImageWithOverlay>
          <div>
            <p className="text-xl">{t("about.p1")}</p>
            <p className="mt-4 text-xl">{t("about.p2")}</p>
          </div>
        </div>
      </Section>

      {/* Services */}
      <Section
        id="services"
        title={t("services.title")}
        className="scroll-mt-28 md:scroll-mt-16"
      >
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="md:order-2">
            <ImageWithOverlay
              frame="blue"
              src="/dog.jpg"
              alt={t("services.imageOverlay")}
              scrimClassName="bg-black/60"
            >
              <h3 className="text-2xl font-bold">
                {t("services.imageOverlay")}
              </h3>
            </ImageWithOverlay>
          </div>
          <div className="md:order-1">
            <p className="text-xl">{t("services.intro")}</p>
            <ul className="mt-4 space-y-2 text-xl">
              <li className="border-l-4 border-teal pl-4">
                <a
                  href="https://smcares.org/programs/essential-services/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue hover:underline"
                >
                  {t("services.essential")}
                </a>
              </li>
              <li className="border-l-4 border-blue pl-4">
                <a
                  href="https://smcares.org/programs/social-services/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue hover:underline"
                >
                  {t("services.social")}
                </a>
              </li>
              <li className="border-l-4 border-teal pl-4">
                <a
                  href="https://smcares.org/programs/health-services/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue hover:underline"
                >
                  {t("services.health")}
                </a>
              </li>
            </ul>
            <p className="mt-6 text-xl">
              {t("services.fullListBefore")}{" "}
              <a
                href="https://smcares.org/programs/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue hover:underline"
              >
                {t("services.fullListLink")}
              </a>
              .
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

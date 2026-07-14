import Link from "next/link";
import Section from "@/components/Section";
import ImageWithOverlay from "@/components/ImageWithOverlay";

export default function Home() {
  return (
    <>
      {/* Hero, background photo (public/hero.avif) + big serif headline.
          A neutral dark scrim over the photo darkens it and keeps the white
          text readable; adjust bg-ink/NN to darken more or less. The nav bar
          overlays the top of this image on the home page (see NavBar). */}
      <section className="relative flex min-h-[70vh] items-center overflow-hidden bg-blue text-paper">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero.avif')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-ink/70" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-20">
          <h1 className="font-display text-6xl font-bold leading-[0.9] md:text-8xl lg:text-9xl">
            Make A
            <br />
            Difference.
          </h1>
          <p className="mt-6 max-w-2xl text-xl text-paper/90 md:text-2xl">
            Saint Mary&rsquo;s Community Services, connecting our community to
            the care and services they need.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="inline-block border-2 border-paper bg-paper px-7 py-3 text-lg font-semibold text-blue hover:bg-blue hover:text-paper"
            >
              Live Calendar
            </Link>
            <Link
              href="/#about"
              className="inline-block border-2 border-paper px-7 py-3 text-lg font-semibold text-paper hover:bg-paper hover:text-ink"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* About, image-with-overlay demo */}
      <Section id="about" title="About Us">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <ImageWithOverlay frame="teal">
            <h3 className="text-2xl font-bold">Serving Our Community</h3>
          </ImageWithOverlay>
          <div>
            <p className="text-xl">
              SMCS is committed to providing clear, reliable information and
              services to the people we serve. This section will hold a fuller
              description of our mission and history.
            </p>
            <p className="mt-4 text-xl">
              The image on the left is a placeholder showing where a real photo
              will sit, with white text overlaid for readability.
            </p>
          </div>
        </div>
      </Section>

      {/* Services, image-with-overlay demo */}
      <Section id="services" title="Our Services">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="md:order-2">
            <ImageWithOverlay frame="blue">
              <h3 className="text-2xl font-bold">What We Offer</h3>
            </ImageWithOverlay>
          </div>
          <div className="md:order-1">
            <p className="text-xl">
              A short summary of the services SMCS provides will go here. Each
              service can later link to its own detail page as the site grows.
            </p>
            <ul className="mt-4 space-y-2 text-xl">
              <li className="border-l-4 border-teal pl-4">Service area one</li>
              <li className="border-l-4 border-blue pl-4">Service area two</li>
              <li className="border-l-4 border-teal pl-4">Service area three</li>
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}

import Link from "next/link";
import Section from "@/components/Section";
import ImageWithOverlay from "@/components/ImageWithOverlay";

export default function Home() {
  return (
    <>
      {/* Intro / welcome */}
      <Section>
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl">Welcome to SMCS</h1>
          <span className="mt-4 block h-1 w-24 bg-blue" />
          <p className="mt-6 text-xl">
            This is the official SMCS website. Here you will find information
            about who we are and the services we provide. More features,
            including a live dashboard, are on the way.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="inline-block border-2 border-blue bg-blue px-6 py-3 text-lg font-semibold text-paper hover:bg-paper hover:text-blue"
            >
              Live Dashboard
            </Link>
            <Link
              href="/#about"
              className="inline-block border-2 border-teal px-6 py-3 text-lg font-semibold text-teal hover:bg-teal hover:text-paper"
            >
              Learn More
            </Link>
          </div>
        </div>
      </Section>

      {/* About — image-with-overlay demo */}
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

      {/* Services — image-with-overlay demo */}
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

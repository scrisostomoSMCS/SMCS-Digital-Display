import BedAvailabilitySlide from "@/components/BedAvailabilitySlide";

export const metadata = {
  title: "Bed availability (test) | SMCS",
};

// Scratch page for previewing the bed-availability slide on its own. The slide
// is a client component that polls /api/beds; this server page just mounts it.
export default function BedTestPage() {
  return (
    <main style={{ padding: 24 }}>
      <BedAvailabilitySlide />
    </main>
  );
}

import RotatingLeaf from "./RotatingLeaf";

// Consistent SMCS branding line for every signage page, led by the signature
// rotating leaf. Tone adapts colors to the page background for contrast.
type Tone = "blue" | "white" | "ink";

const TONE: Record<Tone, { text: string; leaf: string }> = {
  blue: { text: "text-blue", leaf: "text-teal" }, // on white
  white: { text: "text-paper", leaf: "text-teal" }, // on blue
  ink: { text: "text-ink", leaf: "text-blue" }, // on teal
};

export default function InfoEyebrow({ tone = "blue" }: { tone?: Tone }) {
  const t = TONE[tone];
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <RotatingLeaf size={30} className={`${t.leaf} shrink-0`} />
      <p
        className={`font-body min-w-0 break-words text-xs font-semibold uppercase tracking-[0.15em] sm:text-base sm:tracking-[0.3em] md:text-xl md:tracking-[0.35em] ${t.text}`}
      >
        St. Mary&rsquo;s Community Services
      </p>
    </div>
  );
}

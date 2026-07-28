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
    <div className="flex items-center gap-3 @min-[40rem]:gap-4">
      <RotatingLeaf size={40} className={`${t.leaf} shrink-0`} />
      <p
        className={`font-body min-w-0 break-words text-xl font-semibold uppercase tracking-[0.15em] @min-[40rem]:text-2xl @min-[40rem]:tracking-[0.3em] @min-[48rem]:text-3xl @min-[48rem]:tracking-[0.35em] ${t.text}`}
      >
        St. Mary&rsquo;s Community Services
      </p>
    </div>
  );
}

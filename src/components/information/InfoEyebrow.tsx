import RotatingLeaf from "./RotatingLeaf";
import { slideTheme } from "@/lib/slideBackgrounds";

/*
  Consistent SMCS branding line for every signage page, led by the signature
  rotating leaf. Colors are derived from the page's own background (a brand name
  or any hex a custom slide chose) so the line stays legible on all of them.
*/
export default function InfoEyebrow({ bg = "paper" }: { bg?: string }) {
  const theme = slideTheme(bg);
  return (
    <div className="flex items-center gap-3 @min-[40rem]:gap-4">
      <RotatingLeaf size={40} className="shrink-0" color={theme.accent} />
      <p
        className="font-body min-w-0 break-words text-xl font-semibold uppercase tracking-[0.15em] @min-[40rem]:text-2xl @min-[40rem]:tracking-[0.3em] @min-[48rem]:text-3xl @min-[48rem]:tracking-[0.35em]"
        style={{ color: theme.eyebrow }}
      >
        St. Mary&rsquo;s Community Services
      </p>
    </div>
  );
}

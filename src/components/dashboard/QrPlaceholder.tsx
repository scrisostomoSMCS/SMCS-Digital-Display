/*
  Reserved slot for a future QR code. QR generation is not implemented, so this
  is NOT currently rendered: the Live Calendar gates it behind
  SHOW_QR_PLACEHOLDER (see lib/dashboardConfig), which is false, because an
  empty box reading "QR" on a public wall display looks broken. Kept so the
  layout slot and styling are ready when a real code is generated.

  Compact horizontal form for the top-right corner: caption beside a small,
  accent-framed empty box sized for a QR code.
*/
export default function QrPlaceholder() {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm font-semibold text-blue sm:inline">
        Scan to view on your phone
      </span>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-blue text-center text-[10px] font-semibold text-ink/40 md:h-14 md:w-14 md:text-xs">
        QR
      </div>
    </div>
  );
}

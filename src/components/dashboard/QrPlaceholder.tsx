/*
  Reserved slot for a future QR code (generated in a later phase — not yet).
  Just a labeled, accent-framed empty box sized for a QR code plus a caption.
*/
export default function QrPlaceholder() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-28 w-28 items-center justify-center border-2 border-blue text-center text-sm font-semibold text-ink/40 md:h-36 md:w-36">
        QR code
      </div>
      <p className="mt-2 text-sm font-semibold text-blue md:text-base">
        Scan to view on your phone
      </p>
    </div>
  );
}

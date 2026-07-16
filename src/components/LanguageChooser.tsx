"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  type Locale,
} from "@/i18n/config";

/*
  English / Español chooser. Writes the chosen locale to the SMCS_LOCALE cookie
  and refreshes so server components re-render with the new language. The choice
  persists across navigation (the cookie is read on every request). Text color is
  inherited from the parent, so it works on the teal bar and the mobile menu.
*/
export default function LanguageChooser() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1 text-sm font-semibold">
      <Languages size={16} strokeWidth={2} aria-hidden="true" />
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="px-1 opacity-60">
              /
            </span>
          )}
          <button
            type="button"
            onClick={() => choose(l)}
            aria-pressed={l === locale}
            className={
              l === locale
                ? "underline underline-offset-4"
                : "opacity-80 hover:opacity-100 hover:underline"
            }
          >
            {LOCALE_LABELS[l]}
          </button>
        </span>
      ))}
    </div>
  );
}

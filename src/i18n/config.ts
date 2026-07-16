/*
  Shared i18n constants. The interactive site is translated between English and
  Spanish; the chosen locale is stored in a cookie (no URL changes) so every
  route stays the same and the choice persists across navigation.

  To add another language later: add its code to LOCALES, a label to
  LOCALE_LABELS, and a matching messages/<code>.json file.
*/
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Cookie the language chooser writes and the server reads to pick messages.
export const LOCALE_COOKIE = "SMCS_LOCALE";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

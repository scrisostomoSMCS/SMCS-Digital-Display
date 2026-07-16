import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

/*
  Resolves the active locale for each request from the SMCS_LOCALE cookie
  (falling back to English) and loads that locale's messages. Messages live in
  /messages/<locale>.json at the project root, one file per language, so a
  Spanish-speaking staff member can review and edit them without touching code.
*/
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

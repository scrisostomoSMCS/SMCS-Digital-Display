import { WEEKDAYS, localYmd, utcDate } from "./bilingualDates";

/*
  The "Weather" custom slide: an automatic forecast for Stockton plus a note
  staff write. Pure helpers only, no Supabase and no React — shared by the
  /api/weather route, the client weather store (lib/useWeather), the editor,
  the display renderer, and the server-side translator.

  ONE forecast for every screen. All five bulletin locations are on the SMCS
  campus in Stockton, and bulletin_locations stores no coordinates; per-site
  forecasts would need lat/lon added there first.

  The forecast itself is never stored in Supabase. Only the staff part of the
  slide is, in slides.content (migration 0027):
    { "note": "Cooling center open in the Dining Hall",
      "noteEs": "...",
      "autoNotice": true }
*/

export const WEATHER_PLACE = { en: "Stockton, CA", lat: 37.95, lon: -121.29 };

/* --- forecast ------------------------------------------------------------- */

export type ForecastDay = {
  date: string; // "YYYY-MM-DD", Stockton's calendar date
  code: number; // WMO weather code
  high: number; // °F, rounded
  low: number;
};

export type Forecast = {
  fetchedAt: string; // ISO instant the server got it from Open-Meteo
  days: ForecastDay[];
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/*
  Validates a Forecast from anywhere it can come from — the API route, the
  client's localStorage copy — and returns null for anything malformed, so a
  bad payload is treated exactly like a failed fetch (keep the last good one)
  and can never reach the renderer half-formed.
*/
export function parseForecast(raw: unknown): Forecast | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.fetchedAt !== "string" || Number.isNaN(Date.parse(obj.fetchedAt))) return null;
  if (!Array.isArray(obj.days)) return null;
  const days: ForecastDay[] = [];
  for (const d of obj.days) {
    const day = (d ?? {}) as Record<string, unknown>;
    if (typeof day.date !== "string" || !utcDate(day.date)) return null;
    if (!isNum(day.code) || !isNum(day.high) || !isNum(day.low)) return null;
    days.push({ date: day.date, code: day.code, high: Math.round(day.high), low: Math.round(day.low) });
  }
  return days.length > 0 ? { fetchedAt: obj.fetchedAt, days } : null;
}

/*
  Open-Meteo's daily response -> Forecast. Server-side only in practice (the
  route calls it), but pure so it can live here with the type. null if the
  arrays are missing or out of step.
*/
export function fromOpenMeteo(json: unknown, fetchedAt: string): Forecast | null {
  const daily = (json as { daily?: Record<string, unknown> } | null)?.daily;
  if (!daily) return null;
  const { time, weather_code, temperature_2m_max, temperature_2m_min } = daily;
  if (
    !Array.isArray(time) ||
    !Array.isArray(weather_code) ||
    !Array.isArray(temperature_2m_max) ||
    !Array.isArray(temperature_2m_min)
  ) {
    return null;
  }
  return parseForecast({
    fetchedAt,
    days: time.map((date, i) => ({
      date,
      code: weather_code[i],
      high: temperature_2m_max[i],
      low: temperature_2m_min[i],
    })),
  });
}

/*
  The days from today on, by the display's local date. A last-known-good
  forecast can be a day or two old when the API has been unreachable; its past
  days are dropped rather than shown as "today", and once every day is past
  the forecast counts as gone (the slide falls back to just the note).
*/
export function upcomingDays(forecast: Forecast | null, now = new Date()): ForecastDay[] {
  if (!forecast) return [];
  const today = localYmd(now);
  return forecast.days.filter((d) => d.date >= today);
}

export function weekdayLabel(ymd: string): { en: string; es: string } {
  const date = utcDate(ymd);
  if (!date) return { en: "", es: "" };
  const [en, es] = WEEKDAYS[date.getUTCDay()];
  return { en, es };
}

/* --- conditions (WMO weather codes, as Open-Meteo reports them) ----------- */

export type WeatherIconKey = "sun" | "cloud-sun" | "cloud" | "fog" | "rain" | "snow" | "storm";

type Condition = { icon: WeatherIconKey; en: string; es: string };

const CONDITIONS: [codes: number[], condition: Condition][] = [
  [[0], { icon: "sun", en: "Sunny", es: "Soleado" }],
  [[1], { icon: "sun", en: "Mostly sunny", es: "Mayormente soleado" }],
  [[2], { icon: "cloud-sun", en: "Partly cloudy", es: "Parcialmente nublado" }],
  [[3], { icon: "cloud", en: "Cloudy", es: "Nublado" }],
  [[45, 48], { icon: "fog", en: "Fog", es: "Niebla" }],
  [[51, 53, 55, 56, 57], { icon: "rain", en: "Drizzle", es: "Llovizna" }],
  [[61, 63, 66, 80, 81], { icon: "rain", en: "Rain", es: "Lluvia" }],
  [[65, 67, 82], { icon: "rain", en: "Heavy rain", es: "Lluvia fuerte" }],
  [[71, 73, 75, 77, 85, 86], { icon: "snow", en: "Snow", es: "Nieve" }],
  [[95, 96, 99], { icon: "storm", en: "Thunderstorms", es: "Tormentas" }],
];

// null for a code outside the table: the renderer then shows temperatures
// without an icon or words rather than guessing.
export function weatherCondition(code: number): Condition | null {
  return CONDITIONS.find(([codes]) => codes.includes(code))?.[1] ?? null;
}

/* --- automatic safety notice --------------------------------------------- */

export const HEAT_NOTICE_F = 100;
export const COLD_NOTICE_F = 40;

export type WeatherNotice = { kind: "heat" | "cold"; en: string; es: string };

/*
  The notice shown when staff have left autoNotice on and written no note of
  their own: today's high at or above HEAT_NOTICE_F, or tonight's low at or
  below COLD_NOTICE_F ("tonight" is tomorrow's daily minimum, which falls
  overnight; today's is used when tomorrow is missing). Fixed bilingual text,
  deliberately general — it never claims a specific service (a cooling center,
  extra blankets) is available, since only staff know that. A staff note
  replaces it.
*/
export function weatherNotice(days: ForecastDay[]): WeatherNotice | null {
  const [today, tomorrow] = days;
  if (!today) return null;
  if (today.high >= HEAT_NOTICE_F) {
    return {
      kind: "heat",
      en: `Extreme heat today (${today.high}°). Drink water, stay in the shade, and ask staff where to cool off.`,
      es: `Calor extremo hoy (${today.high}°). Tome agua, quédese en la sombra y pregunte al personal dónde refrescarse.`,
    };
  }
  const low = (tomorrow ?? today).low;
  if (low <= COLD_NOTICE_F) {
    return {
      kind: "cold",
      en: `Cold night ahead (${low}°). Dress warmly and ask staff about blankets and warm clothing.`,
      es: `Noche fría (${low}°). Abríguese y pregunte al personal por cobijas y ropa abrigadora.`,
    };
  }
  return null;
}

/* --- the staff part of the slide (slides.content) ------------------------- */

export type WeatherSlide = { note: string; noteEs: string; autoNotice: boolean };

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const str = (v: unknown) => (typeof v === "string" ? v : "");

// autoNotice defaults ON: a slide switched to this layout gets the safety
// notice unless staff turn it off.
export function parseWeatherSlide(raw: unknown): WeatherSlide {
  const obj = asRecord(raw);
  return {
    note: str(obj.note),
    noteEs: str(obj.noteEs),
    autoNotice: obj.autoNotice !== false,
  };
}

export function cleanWeatherSlide(raw: unknown): WeatherSlide {
  const w = parseWeatherSlide(raw);
  return { note: w.note.trim(), noteEs: w.noteEs.trim(), autoNotice: w.autoNotice };
}

// What the note band shows: the staff note, else the automatic notice.
export function weatherBand(
  slide: WeatherSlide,
  days: ForecastDay[],
): { en: string; es: string; notice: WeatherNotice | null } | null {
  if (slide.note.trim()) return { en: slide.note.trim(), es: slide.noteEs.trim(), notice: null };
  const notice = slide.autoNotice ? weatherNotice(days) : null;
  return notice ? { en: notice.en, es: notice.es, notice } : null;
}

/*
  Whether a Weather slide has anything to draw: some forecast from today on,
  or a note (staff or automatic). The bulletin leaves a slide with neither out
  of the rotation instead of showing a headline over an empty page.
*/
export function weatherSlideHasContent(content: unknown, forecast: Forecast | null): boolean {
  const days = upcomingDays(forecast);
  return days.length > 0 || weatherBand(parseWeatherSlide(content), days) !== null;
}

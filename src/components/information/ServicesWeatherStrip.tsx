"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { localYmd } from "@/lib/bilingualDates";
import { useWeather } from "@/lib/useWeather";
import {
  HEAT_NOTICE_F,
  shortWeekdayLabel,
  upcomingDays,
  weatherCondition,
  type ForecastDay,
  type WeatherIconKey,
} from "@/lib/weather";
import WeatherArt from "./WeatherArt";

/*
  The week's forecast under the "This Week's Services" title, as one
  horizontal weather pill: today large on the left (icon, high / low, the
  condition in English over Spanish), then the next six days in a row (day,
  icon, high / low). Drawn on the live bulletin and in the manage preview.

  Styled as a weather widget rather than in the slide's brand palette: an
  airy sky for today's weather (PILL_THEMES), hot orange-to-red on hot days
  and icy on cold ones (pillTheme), with soft streaks of light, a
  glassy edge, illustrated full-color icons (WeatherArt), and white text with
  a light shadow. The sky's lighter end still holds white text at large-text
  contrast.

  It must never move the slide. The pill is absolutely positioned inside the
  header band (which holds a fixed minimum height for the bed panel), so it
  takes up no layout space: the header and cards land exactly where they would
  without weather. It sits just below whatever the header already shows (title,
  and the page line when there is one), measured rather than hard-coded, and
  if a long or wrapped title leaves too little room it stays hidden rather
  than overlapping.

  Data is the shared forecast store (lib/useWeather): the last good forecast
  survives API failures, and past days are dropped. Days the forecast does not
  reach are simply left off; with no days at all this draws nothing. A last
  good forecast older than MAX_FORECAST_AGE_MS is treated as none, so a long
  weather outage hides the pill instead of showing numbers that may be wrong.
*/
const DAYS_SHOWN = 7;
const MAX_FORECAST_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours
const GAP_BELOW_TITLE = 16; // canvas px between the title block and the pill

// The sky behind today's weather: a left-to-right gradient, with optional
// extra layers (a sun glow, rain streaks) drawn over it.
type PillTheme = { from: string; to: string; layers?: string[] };

const SUN_GLOW = "radial-gradient(circle at 4% 30%, rgba(255, 214, 102, 0.55), transparent 24%)";

const PILL_THEMES: Record<WeatherIconKey, PillTheme> = {
  sun: { from: "#2b7fcf", to: "#4a9edd", layers: [SUN_GLOW] },
  "cloud-sun": {
    from: "#3a78bb",
    to: "#6596c6",
    layers: ["radial-gradient(circle at 4% 30%, rgba(255, 214, 102, 0.35), transparent 22%)"],
  },
  cloud: {
    from: "#4b6a8f",
    to: "#7895b6",
    layers: ["radial-gradient(ellipse at 70% 0%, rgba(255, 255, 255, 0.22), transparent 45%)"],
  },
  fog: {
    from: "#66737f",
    to: "#8a96a2",
    layers: ["linear-gradient(to bottom, rgba(255, 255, 255, 0.16), transparent 60%)"],
  },
  rain: {
    from: "#2f4a68",
    to: "#557497",
    layers: [
      "repeating-linear-gradient(105deg, rgba(255, 255, 255, 0.07) 0 2px, transparent 2px 16px)",
    ],
  },
  snow: {
    from: "#4a7fb2",
    to: "#6c9cc8",
    layers: ["radial-gradient(ellipse at 60% 0%, rgba(255, 255, 255, 0.25), transparent 50%)"],
  },
  storm: {
    from: "#2b2450",
    to: "#574a8a",
    layers: ["radial-gradient(circle at 4% 60%, rgba(255, 214, 102, 0.3), transparent 20%)"],
  },
};

// A forecast code outside the table (see weatherCondition) gets a plain sky.
const FALLBACK_THEME: PillTheme = { from: "#2b7fcf", to: "#4a9edd" };

/*
  Temperature outranks the sky color: a 110° sunny day should look
  scorching and a 30° one wintry, not like a mild blue day. From
  HEAT_NOTICE_F (the Weather slide's extreme-heat cutoff, 100°F) the pill
  runs bright orange into hot red; from HOT_F it is warm orange; at or below
  COLD_F it turns icy, indigo into frosty cyan. Rain, storms, and snow keep
  their own skies whatever the temperature, since what is falling matters
  more than the number.
*/
const HOT_F = 90;
const COLD_F = 45;

// Clean, saturated heat colors with a pale white-hot glare behind the sun.
// (A yellow glow over red mixes to brown, so the glare is near-white.)
const SCORCHING_THEME: PillTheme = {
  from: "#f0621c",
  to: "#d1172e",
  layers: ["radial-gradient(circle at 4% 40%, rgba(255, 236, 179, 0.45), transparent 20%)"],
};

const HOT_THEME: PillTheme = {
  from: "#e2620f",
  to: "#f07f1e",
  layers: ["radial-gradient(circle at 4% 40%, rgba(255, 236, 179, 0.4), transparent 20%)"],
};

const COLD_THEME: PillTheme = {
  from: "#3b3f9e",
  to: "#2e9bc6",
  layers: ["radial-gradient(ellipse at 15% 0%, rgba(235, 250, 255, 0.5), transparent 45%)"],
};

function pillTheme(day: ForecastDay): PillTheme {
  const key = weatherCondition(day.code)?.icon;
  const wet = key === "rain" || key === "storm" || key === "snow";
  if (!wet && day.high >= HEAT_NOTICE_F) return SCORCHING_THEME;
  if (!wet && day.high >= HOT_F) return HOT_THEME;
  if (!wet && day.high <= COLD_F) return COLD_THEME;
  return key ? PILL_THEMES[key] : FALLBACK_THEME;
}

// The reference widget's soft diagonal bands of light, on every sky.
const LIGHT_STREAKS =
  "linear-gradient(115deg, transparent 28%, rgba(255, 255, 255, 0.12) 36%, transparent 44%, transparent 62%, rgba(255, 255, 255, 0.08) 68%, transparent 76%)";

function pillBackground(day: ForecastDay): string {
  const theme = pillTheme(day);
  return [
    ...(theme.layers ?? []),
    LIGHT_STREAKS,
    `linear-gradient(to right, ${theme.from}, ${theme.to})`,
  ].join(", ");
}

function ConditionIcon({ code, size }: { code: number; size: number }) {
  const condition = weatherCondition(code);
  return condition ? <WeatherArt icon={condition.icon} size={size} /> : null;
}

// `compact` drops the condition words (the icon stays), for a week too wide
// to fit with them: three-digit highs plus a long Spanish condition.
function TodayBlock({ day, compact }: { day: ForecastDay; compact: boolean }) {
  const condition = compact ? null : weatherCondition(day.code);
  return (
    <div className="flex shrink-0 items-center gap-3">
      <ConditionIcon code={day.code} size={64} />
      <p className="tabular-nums leading-none">
        <span className="text-[3.5rem] font-light">{day.high}°</span>{" "}
        <span className="text-2xl font-normal opacity-80">{day.low}°</span>
      </p>
      {condition && (
        <div className="leading-tight">
          <p className="text-xl font-medium">{condition.en}</p>
          <p className="text-lg font-normal opacity-80">{condition.es}</p>
        </div>
      )}
    </div>
  );
}

function DayCell({ day }: { day: ForecastDay }) {
  const name = shortWeekdayLabel(day.date);
  return (
    <li className="flex flex-col items-center">
      <p className="text-lg leading-tight">
        <span className="font-medium">{name.en}</span>{" "}
        <span className="font-normal opacity-75">{name.es}</span>
      </p>
      <div className="flex items-center gap-1">
        <ConditionIcon code={day.code} size={32} />
        <p className="tabular-nums leading-none">
          <span className="text-2xl font-medium">{day.high}°</span>{" "}
          <span className="text-base font-normal opacity-80">{day.low}°</span>
        </p>
      </div>
    </li>
  );
}

export default function ServicesWeatherStrip() {
  const forecast = useWeather();
  const fresh =
    forecast && Date.now() - Date.parse(forecast.fetchedAt) <= MAX_FORECAST_AGE_MS
      ? forecast
      : null;
  const days = upcomingDays(fresh).slice(0, DAYS_SHOWN);
  if (days.length === 0) return null;
  // Keyed by what is drawn, so a new forecast starts measuring afresh (and
  // gets its condition words back if a cooler week fits them again).
  const key = days.map((d) => `${d.date}:${d.code}:${d.high}:${d.low}`).join("|");
  return <WeatherPill key={key} days={days} />;
}

function WeatherPill({ days }: { days: ForecastDay[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Canvas px from the top of the header, or null while it does not fit (or
  // has not been measured yet).
  const [top, setTop] = useState<number | null>(null);
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const pill = ref.current;
    const header = pill?.parentElement;
    if (!pill || !header) return;
    // offset* are layout values, untouched by the canvas's scale transform and
    // the header's entrance animation. The header is the offsetParent of all
    // its children (it is `relative`).
    const place = () => {
      let contentBottom = 0;
      for (const child of Array.from(header.children)) {
        if (child === pill || !(child instanceof HTMLElement)) continue;
        contentBottom = Math.max(contentBottom, child.offsetTop + child.offsetHeight);
      }
      // Too wide for its max width (nowrap, so it overflows instead of
      // wrapping): try again without the condition words, and if even that
      // is too wide, stay hidden.
      const tooWide = pill.scrollWidth > pill.clientWidth;
      if (tooWide && !compact) {
        setCompact(true);
        return;
      }
      const next = contentBottom + GAP_BELOW_TITLE;
      setTop(!tooWide && next + pill.offsetHeight <= header.clientHeight ? next : null);
    };
    place();
    // The title can reflow after web fonts load or when staff edit it.
    const observer = new ResizeObserver(place);
    observer.observe(header);
    for (const child of Array.from(header.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [compact]);

  // Today leads, large. If a stale forecast no longer has today, every day it
  // does have goes in the row instead.
  const [first, ...rest] = days;
  const today = first.date === localYmd() ? first : null;
  const row = today ? rest : days;

  return (
    <div
      ref={ref}
      role="group"
      aria-label="This week's weather · El clima de esta semana"
      aria-hidden={top === null}
      className={`font-body absolute left-0 hidden max-w-[calc(100%-29rem)] items-center gap-6 whitespace-nowrap rounded-full border border-white/35 py-2 pl-5 pr-8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_24px_rgba(0,0,0,0.18)] [text-shadow:0_1px_3px_rgba(0,0,0,0.3)] @min-[64rem]:flex ${
        top === null ? "invisible" : ""
      }`}
      style={{ top: top ?? 0, backgroundImage: pillBackground(today ?? first) }}
    >
      {today && <TodayBlock day={today} compact={compact} />}
      {today && row.length > 0 && (
        <div aria-hidden="true" className="my-2 w-px self-stretch bg-white/40" />
      )}
      {row.length > 0 && (
        <ul className="flex items-center gap-4">
          {row.map((day) => (
            <DayCell key={day.date} day={day} />
          ))}
        </ul>
      )}
    </div>
  );
}

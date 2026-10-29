"use client";

import { useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { ThermometerColdIcon, ThermometerHotIcon } from "@phosphor-icons/react/ssr";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
import { BED_PANEL_CLEARANCE } from "@/components/BedAvailabilitySlide";
import { slideImageUrl, type Slide } from "@/lib/slides";
import { slideTheme, type SlideTheme } from "@/lib/slideBackgrounds";
import {
  MENU_DAYS,
  MENU_MEALS,
  emptyMenu,
  todayMenuDay,
  type MenuMeal,
  type WeeklyMenu,
} from "@/lib/weeklyMenu";
import {
  formatEventDate,
  formatEventTime,
  parseEventFlyer,
  type EventDateLabel,
} from "@/lib/eventFlyer";
import {
  hasResourceContent,
  parseResourceCard,
  type ResourceService,
} from "@/lib/resourceCard";
import { resourceIcon } from "./resourceIcons";
import { parseCardGrid, visibleCards, type CardGridLayout, type GridCard } from "@/lib/cardGrid";
import {
  WEATHER_PLACE,
  parseWeatherSlide,
  upcomingDays,
  weatherBand,
  weatherCondition,
  weekdayLabel,
  type ForecastDay,
} from "@/lib/weather";
import { useWeather } from "@/lib/useWeather";
import { WEATHER_ICON_COMPONENTS } from "./weatherIcons";
import { SHOW_LOST_FOUND } from "@/lib/siteConfig";
import { MAX_LOST_ITEMS, itemsFor, shortDate } from "@/lib/lostFound";
import { useLostFound } from "@/lib/useLostFound";
import { lostFoundScope, useBulletinScope } from "./BulletinScope";
import { useBesideBedPanel, useTopBandClearance } from "./TopBand";

/*
  Renders a custom slide in one of the on-brand layout templates. This SAME
  component draws the live /information (Digital Bulletin) display AND the
  editor's preview, driven by the same slide data, so the preview always matches
  the wall screen.

  BILINGUAL: the bulletin is unattended (no language chooser), so each text field
  shows English with its Spanish translation directly beneath, styled a step
  smaller and lighter so the two are easy to tell apart but both readable from a
  distance. Spanish lines only appear when a Spanish value exists.
*/

// "Image with caption" never enlarges an image past this many times its own
// pixel size while it is placed beside the bed panel, so small uploads stay sharp.
const MAX_UPSCALE = 2;

function ImageSlot({
  src,
  tone,
  fill = false,
  onLoad,
  imgStyle,
}: {
  src: string | null;
  tone: string;
  fill?: boolean;
  onLoad?: (e: SyntheticEvent<HTMLImageElement>) => void;
  imgStyle?: CSSProperties;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      {src ? (
        // Auto-fitted to the slot (object-contain) so it can never overflow.
        // fill: also scales SMALL images UP to the slot instead of leaving them
        // at natural size — object-contain still preserves the aspect ratio and
        // centers, so nothing is cropped or stretched. Only "Image with caption"
        // wants this; elsewhere the image sits beside text and staying natural
        // size reads better.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onLoad={onLoad}
          style={imgStyle}
          className={
            fill
              ? "h-full w-full object-contain"
              : "max-h-full max-w-full object-contain"
          }
        />
      ) : (
        <div
          className={`flex h-4/5 w-4/5 items-center justify-center border-2 text-2xl ${tone}`}
        >
          No image
        </div>
      )}
    </div>
  );
}

/*
  "Weekly menu": 7 day rows x 3 meal columns. Rows rather than 7 day columns
  because a menu item is a phrase that reads across — at 1920px, seven columns
  leave ~18 characters a line and repeat the meal labels 21 times; here each
  meal label appears once, in the header row. Rows share the space left under
  the headline equally and every cell clips, so a long cell can only lose its
  own last line, never push the table off the canvas (the editor's limits in
  lib/bulletinLimits keep it from getting that far).

  Today's row is tinted and marked with the accent bar when the display's date
  falls inside the menu's week (see todayMenuDay for the date rule). The
  rotation remounts each slide as it comes round, so the highlight moves on at
  midnight without a timer.
*/
function MealCell({ meal }: { meal: MenuMeal }) {
  const en = meal.items.map((s) => s.trim()).filter(Boolean);
  const es = meal.itemsEs.map((s) => s.trim()).filter(Boolean);
  if (en.length === 0 && es.length === 0) {
    return (
      <div className="min-w-0 self-center text-2xl opacity-40" aria-label="Nothing listed">
        —
      </div>
    );
  }
  return (
    <div className="min-h-0 min-w-0 self-center overflow-hidden break-words">
      {en.length > 0 && (
        <p className="text-2xl font-semibold leading-tight">{en.join(" · ")}</p>
      )}
      {es.length > 0 && (
        <p className="text-xl font-medium leading-tight opacity-80">{es.join(" · ")}</p>
      )}
    </div>
  );
}

function WeeklyMenuTable({ menu, theme }: { menu: WeeklyMenu; theme: SlideTheme }) {
  const today = todayMenuDay(menu.weekOf);
  return (
    <div className="font-body relative z-10 mt-4 grid min-h-0 flex-1 grid-cols-[auto_repeat(3,minmax(0,1fr))] grid-rows-[auto_repeat(7,minmax(0,1fr))] gap-x-6 @min-[64rem]:gap-x-8">
      <div />
      {MENU_MEALS.map((m) => (
        <div
          key={m.key}
          className="min-w-0 border-b-4 pb-1 text-2xl"
          style={{ borderColor: theme.accent }}
        >
          <span className="font-bold">{m.label}</span>
          <span className="font-medium opacity-80"> · {m.labelEs}</span>
        </div>
      ))}
      {MENU_DAYS.map((d) => {
        const isToday = d.key === today;
        return (
          <div
            key={d.key}
            className={`relative col-span-4 grid min-h-0 grid-cols-subgrid overflow-hidden border-b-2 border-current/20 py-1 pr-2 pl-4 ${
              isToday ? "bg-current/10" : ""
            }`}
          >
            {isToday && (
              <span
                className="absolute inset-y-0 left-0 w-2"
                style={{ backgroundColor: theme.accent }}
                aria-hidden="true"
              />
            )}
            <div className="self-center whitespace-nowrap">
              <p className={`text-2xl leading-tight ${isToday ? "font-extrabold" : "font-bold"}`}>
                {d.label}
              </p>
              <p className="text-xl font-medium leading-tight opacity-80">{d.labelEs}</p>
            </div>
            {MENU_MEALS.map((m) => (
              <MealCell key={m.key} meal={menu.days[d.key][m.key]} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/*
  "Event / flyer": the headline, then a solid when-and-where block — the part
  someone across the room needs — painted in the eyebrow color with the
  slide's background as its text. slideTheme only picks brand blue for the
  eyebrow when it clears 4.5:1 against the background (otherwise it is the
  black/white body color, which also does), so the block reads at AA whatever
  background staff picked: blue with white text on light slides, white with
  blue text on blue ones. A thick accent rule on its left edge is the only
  decoration.

  Two arrangements, both deliberate rather than one with a hole in it:
    with an image    the block and description share the left 60%, and the
                     image fills the right 40% (scaled up to its slot, never
                     cropped);
    without an image the block becomes a tall left column and the description
                     moves beside it in larger type.
  Anything empty is left out, never drawn as a placeholder: no date/time/place
  drops the block, and an image that fails to load (deleted from storage, say)
  falls back to the no-image arrangement instead of a broken-image icon.

  Static on purpose: nothing in this layout animates (the shared header and
  eyebrow are drawn as on every slide).
*/
function WhenWhereBlock({
  date,
  time,
  location,
  locationEs,
  theme,
  large,
}: {
  date: EventDateLabel | null;
  time: string | null;
  location: string;
  locationEs: string;
  theme: SlideTheme;
  // Without an image the block has the left half of the page to itself, so
  // everything steps up and the weekday gets its own line. With an image it
  // shares its column with the description and stays compact, date on one line.
  large: boolean;
}) {
  const icon = large ? "mt-3 h-16 w-16 shrink-0" : "mt-2 h-14 w-14 shrink-0";
  return (
    <div
      className={`font-body flex min-w-0 flex-col justify-center border-l-[12px] px-10 ${
        large ? "gap-6 py-8" : "gap-4 py-6"
      }`}
      style={{
        backgroundColor: theme.eyebrow,
        color: theme.background,
        borderColor: theme.accent,
      }}
    >
      {date && (
        <div className="flex items-start gap-6">
          <CalendarDays className={icon} strokeWidth={2.25} aria-hidden="true" />
          <div className="min-w-0">
            {large ? (
              <>
                <p className="font-display text-7xl leading-tight">{date.weekday}</p>
                <p className="font-display text-7xl leading-tight">{date.monthDay}</p>
              </>
            ) : (
              <p className="font-display break-words text-6xl leading-tight">{date.en}</p>
            )}
            <p className="text-3xl font-medium leading-tight opacity-80">{date.es}</p>
          </div>
        </div>
      )}
      {time && (
        <div className="flex items-start gap-6">
          <Clock className={icon} strokeWidth={2.25} aria-hidden="true" />
          <p className={`font-semibold leading-tight ${large ? "text-6xl" : "text-5xl"}`}>
            {time}
          </p>
        </div>
      )}
      {location && (
        <div className="flex items-start gap-6">
          <MapPin className={icon} strokeWidth={2.25} aria-hidden="true" />
          <div className="min-w-0 break-words">
            <p className={`font-semibold leading-tight ${large ? "text-5xl" : "text-4xl"}`}>
              {location}
            </p>
            {locationEs && locationEs !== location && (
              <p className="text-3xl font-medium leading-tight opacity-80">{locationEs}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EventFlyerBody({
  slide,
  theme,
  img,
}: {
  slide: Slide;
  theme: SlideTheme;
  img: string | null;
}) {
  // Reset by the caller's key when the image changes, so a replaced image gets
  // a fresh chance to load.
  const [imgFailed, setImgFailed] = useState(false);
  const flyer = parseEventFlyer(slide.content);
  const date = formatEventDate(flyer.date);
  const time = formatEventTime(flyer.startTime, flyer.endTime);
  const location = flyer.location.trim();
  const hasBlock = Boolean(date || time || location);
  const hasBody = Boolean(slide.body.trim());
  const showImage = Boolean(img) && !imgFailed;

  if (!hasBlock && !hasBody && !showImage) return null;

  const description = (large: boolean) =>
    hasBody && (
      <div className="font-body min-h-0 min-w-0 overflow-hidden break-words">
        <p className={`font-medium ${large ? "text-4xl leading-snug" : "text-3xl leading-tight"}`}>
          {slide.body}
        </p>
        {slide.bodyEs && (
          <p
            className={`font-medium opacity-80 ${large ? "mt-3" : "mt-2"} ${
              large ? "text-3xl leading-snug" : "text-2xl leading-tight"
            }`}
          >
            {slide.bodyEs}
          </p>
        )}
      </div>
    );

  const block = hasBlock && (
    <WhenWhereBlock
      date={date}
      time={time}
      location={location}
      locationEs={flyer.locationEs.trim()}
      theme={theme}
      large={!showImage}
    />
  );

  if (showImage) {
    return (
      <div className="relative z-10 mt-6 grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-12">
        <div className="flex min-h-0 min-w-0 flex-col gap-6 overflow-hidden">
          {block}
          {description(!hasBlock)}
        </div>
        <div className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img!}
            alt=""
            className="h-full w-full object-contain"
            onError={() => setImgFailed(true)}
          />
        </div>
      </div>
    );
  }

  if (!hasBlock) {
    return (
      <div className="relative z-10 mt-6 min-h-0 max-w-6xl flex-1 overflow-hidden">
        {description(true)}
      </div>
    );
  }

  return (
    <div
      className={`relative z-10 mt-6 grid min-h-0 flex-1 items-center gap-14 ${
        hasBody ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      }`}
    >
      {block}
      {description(true)}
    </div>
  );
}

/*
  "Contact / resource card": a directory of 3-6 services under the headline.
  The phone number is the biggest thing in each entry — it is what someone
  across the room is trying to copy down — and never wraps. Entries are set
  off by a rule across their top, the way a printed directory is, rather than
  drawn as boxes, and the icon sits plainly beside the name. The grid is
  centered in the space under the headline with content-center-safe: if text
  ever ran long it would overflow downward (and clip at the bottom) instead of
  being cut off at both ends.

  The grid follows the count: 1-3 in a single row, 4 as 2 x 2, 5-6 as 3 x 2.
  Five is laid out on six half-columns so the short second row is centered
  under the first instead of hanging off to the left. Entries with neither a
  name nor a phone are dropped before counting, so a half-finished entry never
  leaves a gap. With nothing to show, only the headline is drawn.

  Static on purpose, like the flyer.
*/
function ResourceEntry({
  service,
  wide,
  className = "",
}: {
  service: ResourceService;
  // Two or fewer columns: room for larger type. Three across steps the name,
  // phone, and spacing down so a full 3 x 2 grid fits under a two-line title.
  wide: boolean;
  className?: string;
}) {
  const Icon = resourceIcon(service.icon);
  const name = service.name.trim();
  const phone = service.phone.trim();
  const hours = service.hours.trim();
  return (
    <div
      className={`font-body flex min-w-0 flex-col border-t-4 border-current/25 ${
        wide ? "pt-5" : "pt-4"
      } ${className}`}
    >
      {name && (
        <div className="flex items-start gap-4">
          <Icon size={wide ? 60 : 52} weight="bold" className="shrink-0" aria-hidden="true" />
          <div className="min-w-0 break-words">
            <p className={`font-semibold leading-tight ${wide ? "text-4xl" : "text-3xl"}`}>
              {name}
            </p>
            {service.nameEs.trim() && service.nameEs.trim() !== name && (
              <p className="text-2xl font-medium leading-tight opacity-80">{service.nameEs}</p>
            )}
          </div>
        </div>
      )}
      {/* 56px rather than text-6xl three across: the longest number the
          editor allows just fits a third of the canvas at that size. */}
      {phone && (
        <p
          className={`whitespace-nowrap font-semibold leading-none tracking-tight tabular-nums ${
            wide ? "mt-4 text-7xl" : "mt-3 text-[3.5rem]"
          }`}
        >
          {phone}
        </p>
      )}
      {hours && (
        <div className={`break-words ${wide ? "mt-4" : "mt-3"}`}>
          <p className="text-3xl font-medium leading-tight">{hours}</p>
          {service.hoursEs.trim() && service.hoursEs.trim() !== hours && (
            <p className="text-2xl font-medium leading-tight opacity-80">{service.hoursEs}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ResourceGrid({ content }: { content: unknown }) {
  const services = parseResourceCard(content).services.filter(hasResourceContent);
  const n = services.length;
  if (n === 0) return null;

  // Six half-columns for 5-6 so a row of two can be centered; plain columns
  // otherwise.
  const sixths = n >= 5;
  const cols = sixths ? "grid-cols-6" : n === 4 ? "grid-cols-2" : n === 3 ? "grid-cols-3" : n === 2 ? "grid-cols-2" : "grid-cols-1";
  const wide = n === 4 || n <= 2;
  return (
    <div
      className={`relative z-10 mt-6 grid min-h-0 flex-1 content-center-safe gap-x-14 overflow-hidden ${
        wide ? "gap-y-10" : "gap-y-8"
      } ${cols}`}
    >
      {services.map((service, i) => (
        <ResourceEntry
          key={service.id}
          service={service}
          wide={wide}
          className={sixths ? `col-span-2 ${n === 5 && i === 3 ? "col-start-2" : ""}` : ""}
        />
      ))}
    </div>
  );
}

/*
  "Grid of cards": short announcements under the headline, each set off by a
  thick accent rule across its top rather than a box, with a serif title like
  the slide headlines so the page reads as a notice board, not a dashboard.

  Empty cards are dropped and the rest reflow within the layout staff picked:
    3 x 2  1-3 in one row, 4 as 2 x 2, 5 as 3 + 2 centered, 6 as 3 x 2
    2 x 2  1-2 in one row, 3 as 2 + 1 centered, 4 as 2 x 2
  Centered short rows sit on half-columns (col-span-2 on a 4- or 6-track
  grid). Two columns or fewer get the larger type. Nothing to show draws only
  the headline. Static, like the other newer templates.
*/
function cardGridPlan(layout: CardGridLayout, n: number) {
  // [grid columns class, span class per card index, wide type]
  const span = (start: number) => (i: number) =>
    `col-span-2 ${i === start ? "col-start-2" : ""}`;
  if (layout === "3x2" && n === 5) return { cols: "grid-cols-6", cell: span(3), wide: false };
  if (layout === "3x2" && n === 6) return { cols: "grid-cols-3", cell: () => "", wide: false };
  if (layout === "3x2" && n === 3) return { cols: "grid-cols-3", cell: () => "", wide: false };
  if (layout === "2x2" && n === 3) return { cols: "grid-cols-4", cell: span(2), wide: true };
  if (n === 1) return { cols: "grid-cols-1", cell: () => "", wide: true };
  return { cols: "grid-cols-2", cell: () => "", wide: true }; // 2, or 4 as 2 x 2
}

function GridCardView({
  card,
  wide,
  accent,
  className,
}: {
  card: GridCard;
  wide: boolean;
  accent: string;
  className: string;
}) {
  const title = card.title.trim();
  const text = card.text.trim();
  return (
    <div
      className={`min-w-0 break-words border-t-[6px] pt-5 ${className}`}
      style={{ borderColor: accent }}
    >
      {title && (
        <>
          <p className={`font-display leading-[1.1] ${wide ? "text-5xl" : "text-4xl"}`}>{title}</p>
          {card.titleEs.trim() && card.titleEs.trim() !== title && (
            <p
              className={`font-display leading-tight opacity-80 ${wide ? "text-[1.75rem]" : "text-2xl"}`}
            >
              {card.titleEs}
            </p>
          )}
        </>
      )}
      {text && (
        <div className={`font-body ${title ? "mt-2" : ""}`}>
          <p className={`font-medium leading-tight ${wide ? "text-3xl" : "text-[1.75rem]"}`}>
            {text}
          </p>
          {card.textEs.trim() && card.textEs.trim() !== text && (
            <p
              className={`mt-1 font-medium leading-tight opacity-80 ${
                wide ? "text-[1.75rem]" : "text-2xl"
              }`}
            >
              {card.textEs}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CardGridView({ content, accent }: { content: unknown; accent: string }) {
  const grid = parseCardGrid(content);
  const cards = visibleCards(grid);
  if (cards.length === 0) return null;
  const plan = cardGridPlan(grid.layout, cards.length);
  return (
    <div
      className={`relative z-10 mt-6 grid min-h-0 flex-1 content-center-safe gap-x-14 gap-y-8 overflow-hidden ${plan.cols}`}
    >
      {cards.map((card, i) => (
        <GridCardView
          key={card.id}
          card={card}
          wide={plan.wide}
          accent={accent}
          className={plan.cell(i)}
        />
      ))}
    </div>
  );
}

/*
  "Weather": today large on the left, the next four days in columns on the
  right, and a note band across the bottom — the staff note, or the automatic
  heat/cold notice (see weatherBand in lib/weather). The band uses the same
  inverted eyebrow colors as the flyer's when-and-where block, so the one
  thing staff want read stands out from the forecast.

  The forecast comes from the shared client store (lib/useWeather), which
  keeps the last good forecast through API failures and drops days that have
  passed. With no forecast at all the band is drawn alone, larger; with no
  forecast and no note there is nothing to draw, and the bulletin leaves the
  slide out of the rotation (InformationDisplay). Never an error message.
  Static, like the other newer templates.
*/
function ConditionIcon({ code, size }: { code: number; size: number }) {
  const condition = weatherCondition(code);
  if (!condition) return null;
  const Icon = WEATHER_ICON_COMPONENTS[condition.icon];
  return <Icon size={size} weight="bold" className="shrink-0" aria-hidden="true" />;
}

function TodayPanel({ day }: { day: ForecastDay }) {
  const condition = weatherCondition(day.code);
  return (
    <div className="font-body flex min-w-0 flex-col justify-center">
      <p className="text-3xl font-semibold uppercase tracking-[0.2em] opacity-80">
        Today · Hoy
      </p>
      <div className="mt-3 flex items-center gap-8">
        <ConditionIcon code={day.code} size={152} />
        <div className="min-w-0">
          <p className="text-[8rem] font-semibold leading-none tabular-nums">{day.high}°</p>
          <p className="mt-3 text-4xl font-medium tabular-nums">
            Low · Mín <span className="font-semibold">{day.low}°</span>
          </p>
        </div>
      </div>
      {condition && (
        <div className="mt-4">
          <p className="font-display text-5xl leading-tight">{condition.en}</p>
          <p className="font-display text-3xl leading-tight opacity-80">{condition.es}</p>
        </div>
      )}
    </div>
  );
}

function DayColumn({ day }: { day: ForecastDay }) {
  const condition = weatherCondition(day.code);
  const name = weekdayLabel(day.date);
  return (
    <div className="font-body flex min-w-0 flex-col items-start border-l-2 border-current/25 pl-6">
      <p className="text-3xl font-semibold leading-tight">{name.en}</p>
      <p className="text-2xl font-medium leading-tight opacity-80">{name.es}</p>
      <div className="mt-4">
        <ConditionIcon code={day.code} size={84} />
      </div>
      <p className="mt-4 text-6xl font-semibold leading-none tabular-nums">{day.high}°</p>
      <p className="mt-2 text-4xl font-medium leading-none tabular-nums opacity-80">{day.low}°</p>
      {condition && (
        <div className="mt-4 break-words">
          <p className="text-2xl font-medium leading-tight">{condition.en}</p>
          <p className="text-2xl font-medium leading-tight opacity-80">{condition.es}</p>
        </div>
      )}
    </div>
  );
}

function WeatherView({ content, theme }: { content: unknown; theme: SlideTheme }) {
  const forecast = useWeather();
  const days = upcomingDays(forecast).slice(0, 5);
  const band = weatherBand(parseWeatherSlide(content), days);
  if (days.length === 0 && !band) return null;

  const [today, ...rest] = days;
  const alone = days.length === 0; // no forecast: the note is the whole slide
  const NoticeIcon =
    band?.notice?.kind === "heat"
      ? ThermometerHotIcon
      : band?.notice?.kind === "cold"
        ? ThermometerColdIcon
        : null;
  const asOf =
    forecast && days.length > 0
      ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
          new Date(forecast.fetchedAt),
        )
      : null;

  return (
    <div
      className={`relative z-10 mt-6 flex min-h-0 flex-1 flex-col gap-8 overflow-hidden ${
        alone ? "justify-center" : ""
      }`}
    >
      {today && (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-14">
          <TodayPanel day={today} />
          {rest.length > 0 && (
            <div className="grid min-w-0 grid-cols-4 content-center gap-6">
              {rest.map((day) => (
                <DayColumn key={day.date} day={day} />
              ))}
            </div>
          )}
        </div>
      )}
      {band && (
        <div
          className={`font-body flex shrink-0 items-start gap-6 border-l-[12px] px-8 ${
            alone ? "py-10" : "py-5"
          }`}
          style={{
            backgroundColor: theme.eyebrow,
            color: theme.background,
            borderColor: theme.accent,
          }}
        >
          {NoticeIcon && (
            <NoticeIcon size={alone ? 88 : 64} weight="bold" className="shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0 break-words">
            <p className={`font-semibold leading-tight ${alone ? "text-6xl" : "text-4xl"}`}>
              {band.en}
            </p>
            {band.es && band.es !== band.en && (
              <p
                className={`mt-1 font-medium leading-tight opacity-90 ${
                  alone ? "text-4xl" : "text-3xl"
                }`}
              >
                {band.es}
              </p>
            )}
          </div>
        </div>
      )}
      {asOf && (
        <p className="font-body -mt-4 shrink-0 text-2xl font-medium opacity-70">
          Forecast for {WEATHER_PLACE.en} · as of {asOf}
        </p>
      )}
    </div>
  );
}

/*
  "Lost & found" (behind SHOW_LOST_FOUND): found items with the date found,
  newest first, under a fixed bilingual line telling people what to do.
  Nothing about a person is drawn, because nothing about a person is stored.

  Items come from the live store (lib/useLostFound) and are filtered here for
  this screen's location and re-checked against the clock, so an expired item
  leaves on time. The manage preview shows every location's items; a wall
  screen with no ?location= shows none. With the flag off, or nothing to
  list, this draws nothing (and the rotation leaves the slide out). Past the
  grid's capacity the rest are summed up rather than shrunk to fit.
*/
function LostFoundView() {
  const scope = lostFoundScope(useBulletinScope());
  const items = useLostFound(SHOW_LOST_FOUND && scope !== null);
  if (!SHOW_LOST_FOUND || scope === null || !items) return null;
  const list = itemsFor(items, scope);
  if (list.length === 0) return null;

  const shown = list.slice(0, MAX_LOST_ITEMS);
  const more = list.length - shown.length;

  return (
    <div className="font-body relative z-10 mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="shrink-0 text-3xl font-semibold leading-tight">
        Is something here yours? Ask at the front desk.
      </p>
      <p className="shrink-0 text-2xl font-medium leading-tight opacity-80">
        ¿Algo aquí es suyo? Pregunte en recepción.
      </p>
      <ul className="mt-6 grid min-h-0 flex-1 grid-cols-2 content-start gap-x-12 gap-y-6">
        {shown.map((e) => (
          <li key={e.id} className="min-w-0 border-t-2 border-current/25 pt-3">
            <p className="truncate text-4xl font-semibold leading-tight">{e.item}</p>
            {e.itemEs && e.itemEs.toLowerCase() !== e.item.toLowerCase() && (
              <p className="truncate text-2xl font-medium leading-tight opacity-80">{e.itemEs}</p>
            )}
            <p className="mt-1 text-2xl font-medium leading-tight opacity-80">
              Found · Encontrado {shortDate(e.foundOn)}
            </p>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className="mt-4 shrink-0 text-3xl font-semibold leading-tight">
          And {more} more. Ask at the front desk. · Y {more} más. Pregunte en recepción.
        </p>
      )}
    </div>
  );
}

export default function SlideTemplateView({
  slide,
  animate = true,
}: {
  slide: Slide;
  animate?: boolean;
}) {
  // The employee picks any background color, so every other color on the slide
  // is derived from it for contrast rather than fixed per brand background.
  const bg = slide.background;
  const theme = slideTheme(bg);
  const placeholderTone = "border-current/20 text-current/40";
  const img = slideImageUrl(slide.imagePath);
  // Templates built to be fully static skip the header's entrance motion too.
  const isFlyer = slide.template === "event-flyer";
  const isResourceCard = slide.template === "resource-card";
  const isCardGrid = slide.template === "card-grid";
  const isWeather = slide.template === "weather";
  const isLostFound = slide.template === "lost-found";
  const init =
    animate && !isFlyer && !isResourceCard && !isCardGrid && !isWeather && !isLostFound
      ? "hidden"
      : false;
  // The menu table needs every row it can get, so its headline runs a step
  // smaller (a full week title fits on one line instead of wrapping to two).
  const isMenu = slide.template === "weekly-menu";
  const topBand = useTopBandClearance();

  /*
    "Image with caption" beside the bed panel: the image takes whichever box
    shows it bigger. Box A runs from under the eyebrow down to the caption,
    stopping short of the panel's left edge; box B is the full width below the
    panel's clearance band. Judged once per image from its natural size, in the
    box A layout (which it loads into, so a portrait image never moves); only a
    wide image then switches, before it has drawn anything.
  */
  const besideBed = useBesideBedPanel();
  const bandRef = useRef<HTMLDivElement>(null);
  const clearanceRef = useRef<HTMLDivElement>(null);
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ src: string; wide: boolean; style: CSSProperties } | null>(null);
  const placed = besideBed && fit && fit.src === img ? fit : null;
  const wide = placed?.wide ?? false;

  const placeImage = (e: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: nw, naturalHeight: nh } = e.currentTarget;
    const area = imageAreaRef.current;
    const band = bandRef.current;
    const clearance = clearanceRef.current;
    if (!img || fit?.src === img || !nw || !nh || !area || !band || !clearance) return;
    // Layout sizes (offset*), so the canvas's display scale never enters in.
    const margins = getComputedStyle(area);
    const wA = area.offsetWidth;
    const hA = area.offsetHeight;
    const wB = wA + parseFloat(margins.marginRight) - parseFloat(margins.marginLeft);
    const hB = hA - Math.max(0, clearance.offsetHeight - band.offsetHeight);
    const scaleIn = (w: number, h: number) => Math.min(w / nw, h / nh, MAX_UPSCALE);
    const sA = scaleIn(wA, hA);
    if (scaleIn(wB, hB) > sA) {
      setFit({ src: img, wide: true, style: { maxWidth: nw * MAX_UPSCALE, maxHeight: nh * MAX_UPSCALE } });
      return;
    }
    // Centered on the canvas, in line with the caption, unless that would run
    // into the panel's gap; then it moves left just far enough.
    const w = nw * sA;
    setFit({
      src: img,
      wide: false,
      style: { width: w, height: nh * sA, marginLeft: Math.min((wB - w) / 2, wA - w), marginRight: "auto" },
    });
  };

  const Header = (
    <motion.header
      variants={headerIn}
      initial={init}
      animate="show"
      className={`shrink-0 ${BED_PANEL_CLEARANCE}`}
    >
      <InfoEyebrow bg={bg} />
      <h1
        className={`font-display mt-2 max-w-[68%] text-4xl leading-none @min-[40rem]:text-5xl ${
          isMenu ? "@min-[64rem]:text-6xl" : "@min-[64rem]:text-7xl"
        }`}
      >
        {slide.title}
      </h1>
      {/* Skipped when it only repeats the English (a name, or a translation
          that came back unchanged), rather than drawing the title twice. */}
      {slide.titleEs.trim() &&
        slide.titleEs.trim().toLowerCase() !== slide.title.trim().toLowerCase() && (
        <p
          className={`font-display mt-1 max-w-[68%] text-3xl leading-tight opacity-80 @min-[40rem]:text-3xl ${
            isMenu ? "@min-[64rem]:text-4xl" : "@min-[64rem]:text-5xl"
          }`}
        >
          {slide.titleEs}
        </p>
      )}
    </motion.header>
  );

  const Leaf = (
    <div className="pointer-events-none absolute bottom-8 right-14 hidden @min-[64rem]:block">
      <RotatingLeaf size={190} color={theme.watermark} duration={25} />
    </div>
  );

  if (slide.template === "image-focus") {
    return (
      <InfoPageShell bg={bg}>
        {/* Vertical split: image region on top takes every row the caption does
            not need (flex-1), caption sits centered underneath at its natural
            height. All proportional — no fixed pixel offsets — so it holds at
            any canvas scale, and the ratio is unaffected by how tall or wide the
            uploaded image happens to be.

            No headline on this template, so the eyebrow band itself carries
            BED_PANEL_CLEARANCE — but only while the bed panel or a live
            announcement is floating over the top of the canvas (see TopBand).
            Then the band keeps the TOP of the image below them; otherwise the
            image starts right under the eyebrow and takes the rest of the
            canvas. */}
        <div className="relative z-10 flex h-full min-h-0 flex-col">
          {/* Beside the bed panel the eyebrow band drops its clearance unless the
              image chose box B; this invisible copy of the band's clearance is
              what box B's height is measured from. */}
          {besideBed && (
            <div
              ref={clearanceRef}
              aria-hidden="true"
              className={`invisible absolute top-0 ${BED_PANEL_CLEARANCE}`}
            />
          )}
          <div ref={bandRef} className={`shrink-0 ${besideBed && !wide ? "" : topBand}`}>
            <InfoEyebrow bg={bg} />
          </div>
          {/* Negative margins cancel InfoPageShell's own side padding at each
              breakpoint, so the image runs edge to edge on the canvas instead of
              stopping at the text margin. Keep these in step with the shell's
              px-* values or the image will not reach the edge (or will overhang
              it). The caption below stays inside the normal margins.
              Box A stops 27.5rem short of the right edge instead: the panel's
              right-5 + w-[29rem], plus a 1.25rem gap, less the shell's 4rem. */}
          <div
            ref={imageAreaRef}
            className={`-mx-4 mt-2 min-h-0 flex-1 @min-[40rem]:-mx-6 @min-[64rem]:mt-3 ${
              besideBed && !wide ? "@min-[64rem]:-ml-16 @min-[64rem]:mr-[27.5rem]" : "@min-[64rem]:-mx-16"
            }`}
          >
            <ImageSlot
              src={img}
              tone={placeholderTone}
              fill
              onLoad={besideBed ? placeImage : undefined}
              imgStyle={placed?.style}
            />
          </div>
          {/* Every row this block gives up is a row the image gets, and a taller
              image is also a WIDER one (object-contain scales both together), so
              the padding here is deliberately tight and the -mb-* reclaims most
              of the shell's bottom padding. English stays at text-6xl — this has
              to read from across a lobby — so the Spanish line carries the trim. */}
          {slide.caption && (
            <div className="shrink-0 px-4 py-1 text-center @min-[64rem]:-mb-5 @min-[64rem]:py-2">
              <p className="font-display mx-auto max-w-[90%] break-words text-3xl leading-tight @min-[40rem]:text-4xl @min-[64rem]:text-6xl">
                {slide.caption}
              </p>
              {slide.captionEs && (
                <p className="font-display mx-auto mt-1 max-w-[90%] break-words text-2xl leading-tight opacity-80 @min-[40rem]:text-3xl">
                  {slide.captionEs}
                </p>
              )}
            </div>
          )}
        </div>
      </InfoPageShell>
    );
  }

  if (slide.template === "title-image-text") {
    return (
      <InfoPageShell bg={bg}>
        {Header}
        <div className="relative z-10 mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pb-2 @min-[64rem]:mt-6 @min-[64rem]:items-center @min-[64rem]:gap-8 @min-[64rem]:overflow-visible @min-[64rem]:pb-0 @min-[64rem]:grid-cols-2">
          <div className="min-h-48 @min-[64rem]:h-full @min-[64rem]:min-h-0">
            <ImageSlot src={img} tone={placeholderTone} />
          </div>
          <div>
            <p className="font-body text-2xl font-medium @min-[40rem]:text-3xl @min-[64rem]:text-4xl">
              {slide.body}
            </p>
            {slide.bodyEs && (
              <p className="font-body mt-2 text-2xl font-medium opacity-80 @min-[40rem]:text-2xl @min-[64rem]:mt-3 @min-[64rem]:text-3xl">
                {slide.bodyEs}
              </p>
            )}
          </div>
        </div>
      </InfoPageShell>
    );
  }

  if (isFlyer) {
    return (
      <InfoPageShell bg={bg}>
        {Header}
        <EventFlyerBody key={img ?? "no-image"} slide={slide} theme={theme} img={img} />
      </InfoPageShell>
    );
  }

  if (isResourceCard) {
    return (
      <InfoPageShell bg={bg}>
        {Header}
        <ResourceGrid content={slide.content} />
      </InfoPageShell>
    );
  }

  if (isCardGrid) {
    return (
      <InfoPageShell bg={bg}>
        {Header}
        <CardGridView content={slide.content} accent={theme.accent} />
      </InfoPageShell>
    );
  }

  if (isWeather) {
    return (
      <InfoPageShell bg={bg}>
        {Header}
        <WeatherView content={slide.content} theme={theme} />
      </InfoPageShell>
    );
  }

  if (isLostFound) {
    return (
      <InfoPageShell bg={bg}>
        {Header}
        <LostFoundView />
      </InfoPageShell>
    );
  }

  if (isMenu) {
    return (
      <InfoPageShell bg={bg}>
        {Header}
        <WeeklyMenuTable menu={slide.menu ?? emptyMenu()} theme={theme} />
      </InfoPageShell>
    );
  }

  if (slide.template === "title-list") {
    return (
      <InfoPageShell bg={bg}>
        {Leaf}
        {Header}
        <motion.div
          variants={staggerContainer}
          initial={init}
          animate="show"
          className="relative z-10 mt-4 grid min-h-0 grid-cols-1 gap-3 overflow-y-auto pb-2 @min-[40rem]:grid-cols-2 @min-[64rem]:mt-7 @min-[64rem]:gap-4 @min-[64rem]:overflow-visible @min-[64rem]:pb-0"
        >
          {slide.items.map((item, i) => (
            <motion.div
              key={i}
              variants={riseItem}
              className="font-body flex items-start gap-4"
            >
              <span
                className="mt-2 h-4 w-4 shrink-0"
                style={{ backgroundColor: theme.accent }}
                aria-hidden="true"
              />
              <div>
                <div className="text-2xl font-semibold @min-[40rem]:text-3xl @min-[64rem]:text-4xl">{item}</div>
                {slide.itemsEs[i] && (
                  <div className="text-xl font-medium opacity-80 @min-[40rem]:text-2xl @min-[64rem]:text-3xl">
                    {slide.itemsEs[i]}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </InfoPageShell>
    );
  }

  // default: title-body
  return (
    <InfoPageShell bg={bg}>
      {Leaf}
      {Header}
      <motion.div
        variants={riseItem}
        initial={init}
        animate="show"
        className="relative z-10 mt-4 max-w-5xl min-h-0 overflow-y-auto pb-2 @min-[64rem]:mt-6 @min-[64rem]:overflow-visible @min-[64rem]:pb-0"
      >
        <p className="font-body text-2xl font-medium @min-[40rem]:text-3xl @min-[64rem]:text-4xl">
          {slide.body}
        </p>
        {slide.bodyEs && (
          <p className="font-body mt-2 text-2xl font-medium opacity-80 @min-[40rem]:text-2xl @min-[64rem]:mt-3 @min-[64rem]:text-3xl">
            {slide.bodyEs}
          </p>
        )}
      </motion.div>
    </InfoPageShell>
  );
}

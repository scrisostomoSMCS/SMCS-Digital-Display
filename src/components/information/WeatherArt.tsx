import { useId } from "react";
import type { WeatherIconKey } from "@/lib/weather";

/*
  Illustrated, full-color weather icons for the forecast pill on the
  services slide: a golden sun, soft shaded clouds, blue rain, a gold bolt.
  Plain inline SVG (no icon dependency), drawn on a 64x64 grid. The flat
  Phosphor set in weatherIcons stays for the Weather slide.

  Gradient ids come from useId, so any number of icons can share a page
  without one icon's <defs> painting another.
*/

type Ids = { sun: string; cloud: string; grey: string; dark: string; bolt: string };

// One puffy cloud, its bottom-left corner at (x, y), base width ~40 * s.
function Cloud({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <circle cx={11} cy={-10} r={9} />
      <circle cx={22} cy={-15} r={12} />
      <circle cx={32} cy={-9} r={8} />
      <rect x={2} y={-12} width={38} height={12} rx={6} />
    </g>
  );
}

function Sun({ cx, cy, r, ids }: { cx: number; cy: number; r: number; ids: Ids }) {
  const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <g>
      {rays.map((a) => (
        <line
          key={a}
          x1={cx + Math.cos(a) * (r + 4)}
          y1={cy + Math.sin(a) * (r + 4)}
          x2={cx + Math.cos(a) * (r + 9)}
          y2={cy + Math.sin(a) * (r + 9)}
          stroke="#ffc93c"
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${ids.sun})`} />
    </g>
  );
}

function Art({ icon, ids }: { icon: WeatherIconKey; ids: Ids }) {
  const white = `url(#${ids.cloud})`;
  switch (icon) {
    case "sun":
      return <Sun cx={32} cy={32} r={13} ids={ids} />;
    case "cloud-sun":
      return (
        <>
          <Sun cx={24} cy={24} r={10} ids={ids} />
          <Cloud x={14} y={54} s={1.05} fill={white} />
        </>
      );
    case "cloud":
      return (
        <>
          <Cloud x={20} y={40} s={0.85} fill={`url(#${ids.grey})`} />
          <Cloud x={8} y={54} s={1.05} fill={white} />
        </>
      );
    case "fog":
      return (
        <>
          <Cloud x={11} y={42} s={1.05} fill={white} />
          {[48, 55].map((y, i) => (
            <line
              key={y}
              x1={12 + i * 6}
              y1={y}
              x2={52 - i * 4}
              y2={y}
              stroke="#e8eef4"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          ))}
        </>
      );
    case "rain":
      return (
        <>
          <Cloud x={11} y={40} s={1.05} fill={`url(#${ids.grey})`} />
          {[20, 31, 42].map((x) => (
            <line
              key={x}
              x1={x}
              y1={46}
              x2={x - 4}
              y2={56}
              stroke="#5cb8ff"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          ))}
        </>
      );
    case "snow":
      return (
        <>
          <Cloud x={11} y={40} s={1.05} fill={white} />
          {[
            [20, 50],
            [32, 56],
            [44, 50],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r={3.2} fill="#ffffff" stroke="#bfe0ff" strokeWidth={1.2} />
          ))}
        </>
      );
    case "storm":
      return (
        <>
          <Cloud x={11} y={40} s={1.05} fill={`url(#${ids.dark})`} />
          <path
            d="M34 38 L24 52 H31 L27 62 L41 46 H34 L38 38 Z"
            fill={`url(#${ids.bolt})`}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeLinejoin="round"
          />
        </>
      );
  }
}

export default function WeatherArt({ icon, size }: { icon: WeatherIconKey; size: number }) {
  const base = useId().replace(/:/g, "");
  const ids: Ids = {
    sun: `${base}-sun`,
    cloud: `${base}-cloud`,
    grey: `${base}-grey`,
    dark: `${base}-dark`,
    bolt: `${base}-bolt`,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={ids.sun} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff3a6" />
          <stop offset="55%" stopColor="#ffcf3a" />
          <stop offset="100%" stopColor="#ffa41b" />
        </radialGradient>
        <linearGradient id={ids.cloud} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dce6f0" />
        </linearGradient>
        <linearGradient id={ids.grey} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2f6" />
          <stop offset="100%" stopColor="#a9b7c6" />
        </linearGradient>
        <linearGradient id={ids.dark} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b4bdc9" />
          <stop offset="100%" stopColor="#6c7686" />
        </linearGradient>
        <linearGradient id={ids.bolt} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff07a" />
          <stop offset="100%" stopColor="#ffbe1a" />
        </linearGradient>
      </defs>
      <Art icon={icon} ids={ids} />
    </svg>
  );
}

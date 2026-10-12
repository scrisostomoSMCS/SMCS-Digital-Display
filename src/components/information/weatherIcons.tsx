import {
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  SunIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { WeatherIconKey } from "@/lib/weather";

// The Phosphor icon for each forecast condition (see weatherCondition in
// lib/weather). /ssr entry for the same reason as resourceIcons.
export const WEATHER_ICON_COMPONENTS: Record<WeatherIconKey, Icon> = {
  sun: SunIcon,
  "cloud-sun": CloudSunIcon,
  cloud: CloudIcon,
  fog: CloudFogIcon,
  rain: CloudRainIcon,
  snow: CloudSnowIcon,
  storm: CloudLightningIcon,
};

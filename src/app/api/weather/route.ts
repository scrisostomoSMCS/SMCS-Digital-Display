import { WEATHER_PLACE, fromOpenMeteo } from "@/lib/weather";

/*
  Stockton's forecast for the Weather slide and the strip on the "This Week's
  Services" slide, from Open-Meteo (free, no API key,
  no account). Fetched here on the server rather than from each TV so that the
  wall displays share one upstream request: `next.revalidate` keeps Open-Meteo's
  response in Next's data cache for 30 minutes, however many screens poll.

  Failure is a 503 with no forecast, never a thrown error. The client store
  (lib/useWeather) treats that exactly like an unreachable network: it keeps
  the last good forecast it has (in memory and localStorage) and tries again
  on its next poll. Nothing here is user-specific, so no auth.
*/
const REVALIDATE_SECONDS = 1800;

const ENDPOINT =
  "https://api.open-meteo.com/v1/forecast?" +
  new URLSearchParams({
    latitude: String(WEATHER_PLACE.lat),
    longitude: String(WEATHER_PLACE.lon),
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit",
    timezone: "America/Los_Angeles",
    forecast_days: "7",
  });

export async function GET() {
  try {
    const res = await fetch(ENDPOINT, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    // The cached response carries the time it was really fetched; reading the
    // Date header keeps "as of" honest when this is a cache hit.
    const served = Date.parse(res.headers.get("date") ?? "");
    const fetchedAt = new Date(Number.isNaN(served) ? Date.now() : served).toISOString();
    const forecast = fromOpenMeteo(await res.json(), fetchedAt);
    if (!forecast) throw new Error("Open-Meteo response missing daily data");
    return Response.json(forecast);
  } catch (err) {
    console.warn("Weather unavailable:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Weather unavailable." }, { status: 503 });
  }
}

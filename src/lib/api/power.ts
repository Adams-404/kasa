/**
 * NASA POWER monthly point API.
 *
 * Verified 2026-11-15: no key, CORS `*`, monthly keys are YYYYMM with MM=13
 * holding the annual value (we ignore it and build our own annual series),
 * missing values are -999, T2M is °C and PRECTOTCORR is mm/day.
 */

import { cached, DAY } from "../cache";
import type { MonthlyPoint } from "../stats/anomalies";

const BASE = "https://power.larc.nasa.gov/api/temporal/monthly/point";

export type PowerVariable = "T2M" | "PRECTOTCORR" | "GWETROOT";

export type PowerSeries = {
  lat: number;
  lon: number;
  elevationMetres: number | null;
  /** Monthly points per variable, ascending by date. */
  series: Record<string, Array<MonthlyPoint>>;
  units: Record<string, string>;
  longNames: Record<string, string>;
};

type PowerJson = {
  geometry?: { coordinates?: Array<number> };
  properties?: { parameter?: Record<string, Record<string, number>> };
  parameters?: Record<string, { units?: string; longname?: string }>;
  messages?: Array<{ code?: number; text?: string }>;
};

export class PowerError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PowerError";
    this.status = status;
  }
}

export async function fetchPowerSeries(
  lat: number,
  lon: number,
  startYear: number,
  endYear: number,
  variables: ReadonlyArray<PowerVariable> = ["T2M", "PRECTOTCORR"],
): Promise<PowerSeries> {
  // POWER is a ~0.5 degree grid: two decimals is more precision than it has,
  // and it keeps the cache key stable while the user pans.
  const key = `power:${lat.toFixed(2)}:${lon.toFixed(2)}:${startYear}:${endYear}:${variables.join(",")}`;

  return cached(key, 7 * DAY, async () => {
    const url = new URL(BASE);
    url.searchParams.set("parameters", variables.join(","));
    url.searchParams.set("community", "AG");
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("start", String(startYear));
    url.searchParams.set("end", String(endYear));
    url.searchParams.set("format", "JSON");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);

    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: controller.signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new PowerError("NASA POWER did not answer in time. Check the connection and try again.");
      }
      throw new PowerError("Could not reach NASA POWER. Check the connection and try again.");
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // POWER answers 422 with a list of parameter problems in the body.
      let detail = "";
      try {
        const body = (await response.json()) as PowerJson;
        detail = body.messages?.map((m) => m.text).filter(Boolean).join(" ") ?? "";
      } catch {
        // Body was not JSON.
      }
      throw new PowerError(
        detail
          ? `NASA POWER rejected the request: ${detail}`
          : `NASA POWER returned ${response.status}. Try again in a moment.`,
        response.status,
      );
    }

    const body = (await response.json()) as PowerJson;
    const parameters = body.properties?.parameter;
    if (!parameters) {
      throw new PowerError("NASA POWER sent an empty response for this point.");
    }

    const series: Record<string, Array<MonthlyPoint>> = {};
    for (const variable of variables) {
      series[variable] = parseMonthly(parameters[variable]);
    }

    return {
      lat,
      lon,
      elevationMetres: body.geometry?.coordinates?.[2] ?? null,
      series,
      units: Object.fromEntries(
        variables.map((v) => [v, body.parameters?.[v]?.units ?? ""]),
      ),
      longNames: Object.fromEntries(
        variables.map((v) => [v, body.parameters?.[v]?.longname ?? v]),
      ),
    };
  });
}

/** YYYYMM keys, month 13 dropped, missing values dropped. */
export function parseMonthly(raw: Record<string, number> | undefined): Array<MonthlyPoint> {
  if (!raw) return [];
  const points: Array<MonthlyPoint> = [];

  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d{6}$/.test(key)) continue;
    const year = Number(key.slice(0, 4));
    const month = Number(key.slice(4, 6));
    if (month < 1 || month > 12) continue; // 13 is POWER's annual value
    if (!Number.isFinite(value) || value <= -999) continue;
    points.push({ year, month, value });
  }

  points.sort((a, b) => a.year - b.year || a.month - b.month);
  return points;
}

import { cached, DAY } from "../cache";
import { clampLat, type Place } from "../format";

/**
 * OpenStreetMap Nominatim.
 *
 * Policy (checked 2026-11-15): no autocomplete, at most one request per second,
 * a real Referer/User-Agent, cache every result, and show OSM attribution.
 * Every rule here is enforced in code: we only search on submit, a module-level
 * queue spaces requests, and results live in the shared cache for 30 days.
 *
 * In development requests go through the Vite proxy at /api/nominatim so the
 * provider can be swapped in one place; the production build calls Nominatim
 * directly, which it allows with CORS.
 */
const DIRECT = "https://nominatim.openstreetmap.org";
const PROXY = "/api/nominatim";

/**
 * Development tries the local proxy first and falls back to Nominatim itself if
 * the proxy cannot reach it (no TLS interception in the browser, but a
 * corporate or sandbox proxy can break Node's fetch). The production build has
 * no server route, so it calls Nominatim directly, which CORS allows.
 */
function bases(): Array<string> {
  return import.meta.env.DEV ? [PROXY, DIRECT] : [DIRECT];
}

const MIN_INTERVAL_MS = 1100;

export type PlaceHit = {
  name: string;
  detail: string;
  lat: number;
  lon: number;
};

export class GeocodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeocodeError";
  }
}

let nextSlot = 0;
let chain: Promise<unknown> = Promise.resolve();

/** One request at a time, at least 1.1s apart, as the policy requires. */
function polite<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = nextSlot - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    nextSlot = Date.now() + MIN_INTERVAL_MS;
    return task();
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}

type RawHit = {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  addresstype?: string;
  address?: Record<string, string>;
};

export async function searchPlaces(query: string): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  return cached(`geo:search:${q.toLowerCase()}`, 30 * DAY, () =>
    polite(async () => {
      const body = await request<Array<RawHit>>("/search", {
        format: "jsonv2",
        q,
        addressdetails: "1",
        limit: "6",
      });
      return body.map(shapeHit).filter((hit) => Number.isFinite(hit.lat) && Number.isFinite(hit.lon));
    }),
  );
}

/**
 * The name for a clicked point. A point in the ocean returns null, and the
 * caller keeps showing coordinates: an honest empty state, not a guess.
 */
export async function reversePlace(lat: number, lon: number): Promise<Place | null> {
  const key = `geo:reverse:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  return cached(key, 30 * DAY, () =>
    polite(async () => {
      let body: RawHit;
      try {
        body = await request<RawHit>("/reverse", {
          format: "jsonv2",
          lat: lat.toFixed(5),
          lon: lon.toFixed(5),
          zoom: "10",
          addressdetails: "1",
        });
      } catch (error) {
        // Nominatim answers 404 for open water; that is not an app error.
        if (error instanceof GeocodeError && /no result/i.test(error.message)) return null;
        throw error;
      }

      const address = body.address ?? {};
      const name =
        address.city ??
        address.town ??
        address.village ??
        address.municipality ??
        address.county ??
        address.state ??
        body.name ??
        "";
      if (!name) return null;

      const detail = [address.state !== name ? address.state : undefined, address.country]
        .filter((part): part is string => Boolean(part))
        .join(", ");

      return {
        lat: clampLat(Number(body.lat) || lat),
        lon: Number(body.lon) || lon,
        name,
        detail: detail || undefined,
      };
    }),
  );
}

async function request<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  let response: Response | null = null;

  for (const base of bases()) {
    const url = new URL(`${base}${path}`, window.location.origin);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    try {
      const attempt = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      // 502 means our dev proxy could not reach the provider; try the next base.
      if (attempt.status === 502 && base !== DIRECT) continue;
      response = attempt;
      break;
    } catch {
      // Try the next base; the browser may be able to reach it directly.
    }
  }

  if (!response) {
    throw new GeocodeError("Could not reach OpenStreetMap. Check the connection and try again.");
  }

  if (response.status === 429) {
    throw new GeocodeError("OpenStreetMap is rate limiting searches. Wait a second, then try again.");
  }
  if (response.status === 404) {
    throw new GeocodeError("No result near that point.");
  }
  if (!response.ok) {
    throw new GeocodeError(`OpenStreetMap returned ${response.status}. Try again in a moment.`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new GeocodeError("OpenStreetMap sent something we could not read.");
  }
}

function shapeHit(raw: RawHit): PlaceHit {
  const parts = (raw.display_name ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const name = raw.name?.trim() || parts[0] || "Unnamed place";

  let rest = parts.slice(1);
  while (rest.length > 0 && rest[0] === name) rest = rest.slice(1);
  // Keep the line short: a region, a country and at most one extra part.
  const detail = rest.slice(0, 3).join(", ");

  return {
    name,
    detail,
    lat: Number(raw.lat),
    lon: Number(raw.lon),
  };
}

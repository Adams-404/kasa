import { cached, DAY } from "../cache";
import { wikidataFacts, type PlaceFacts } from "./wikidata";

/**
 * Wikipedia geosearch and page summaries, plus the facts we can pull for the
 * matched article. All text is CC BY-SA and the panel always links to the
 * source; we never present an extract without that link.
 */
const API = "https://en.wikipedia.org/w/api.php";
const REST = "https://en.wikipedia.org/api/rest_v1/page/summary";

export type NearbyArticle = {
  title: string;
  distanceMetres: number;
};

export type HistoryEntry = {
  title: string;
  description: string;
  extract: string;
  url: string;
  distanceMetres: number;
  facts: PlaceFacts;
};

type GeoSearchBody = {
  query?: {
    geosearch?: Array<{ title: string; dist: number; ns: number }>;
  };
};

type SummaryBody = {
  title?: string;
  description?: string;
  extract?: string;
  type?: string;
  content_urls?: { desktop?: { page?: string } };
};

/** Articles within 10 km, nearest first. 10 km is the API's maximum radius. */
export async function nearbyArticles(lat: number, lon: number): Promise<Array<NearbyArticle>> {
  const key = `wiki:near:${lat.toFixed(3)}:${lon.toFixed(3)}`;

  return cached(key, 30 * DAY, async () => {
    const url = new URL(API);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "geosearch");
    url.searchParams.set("gscoord", `${lat}|${lon}`);
    url.searchParams.set("gsradius", "10000");
    url.searchParams.set("gslimit", "20");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const body = await getJson<GeoSearchBody>(url);
    const pages = body.query?.geosearch ?? [];

    return pages
      .filter((page) => page.ns === 0 && !/disambiguation/i.test(page.title))
      .map((page) => ({ title: page.title, distanceMetres: page.dist }));
  });
}

/** The REST summary, or null when the article has no summary to show. */
export async function articleSummary(title: string): Promise<Omit<HistoryEntry, "facts" | "distanceMetres"> | null> {
  const key = `wiki:summary:${title}`;

  return cached(key, 30 * DAY, async () => {
    const url = `${REST}/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" } });
    } catch {
      throw new Error("Could not reach Wikipedia. Check the connection and try again.");
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Wikipedia returned ${response.status}. Try again in a moment.`);
    }

    const body = (await response.json()) as SummaryBody;
    if (!body.extract) return null;

    return {
      title: body.title ?? title,
      description: body.description ?? "",
      extract: body.extract,
      url: body.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  });
}

/**
 * The full panel payload: the nearest article that actually has a summary, its
 * facts, and the nearby list for switching between articles.
 */
export async function loadHistory(
  lat: number,
  lon: number,
  preferredTitle?: string,
): Promise<{ entry: HistoryEntry | null; nearby: Array<NearbyArticle> }> {
  const nearby = await nearbyArticles(lat, lon);
  if (nearby.length === 0) return { entry: null, nearby };

  const preferred = preferredTitle
    ? nearby.find((item) => item.title === preferredTitle)
    : undefined;
  const candidates = preferred ? [preferred] : nearby.slice(0, 3);

  for (const candidate of candidates) {
    const summary = await articleSummary(candidate.title).catch(() => null);
    if (!summary) continue;
    const facts = await wikidataFacts(candidate.title).catch(() => ({}));
    return {
      entry: { ...summary, distanceMetres: candidate.distanceMetres, facts },
      nearby,
    };
  }

  return { entry: null, nearby };
}

async function getJson<T>(url: URL): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Could not reach Wikipedia. Check the connection and try again.");
  }
  if (!response.ok) {
    throw new Error(`Wikipedia returned ${response.status}. Try again in a moment.`);
  }
  return (await response.json()) as T;
}

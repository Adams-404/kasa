import { cached, DAY } from "../cache";

/**
 * A few structured facts for the article Wikipedia matched.
 *
 * The article title is the key: querying `wbsearchentities` with a place name
 * does not resolve reliably ("Gombe Nigeria" returns nothing), while
 * `sites=enwiki&titles=<article>` lands on the right item. Entities are cached,
 * labels are fetched in one extra call so "Nigeria" is not shown as "Q1033".
 */
const API = "https://www.wikidata.org/w/api.php";

export type PlaceFacts = {
  population?: number;
  populationYear?: number;
  country?: string;
  region?: string;
  founded?: string;
};

type Snak = {
  mainsnak?: { datavalue?: { value?: unknown } };
  qualifiers?: Record<string, Array<{ datavalue?: { value?: unknown } }>>;
};

type Entity = {
  id?: string;
  missing?: string;
  claims?: Record<string, Array<Snak>>;
};

type EntitiesBody = {
  entities?: Record<string, Entity>;
};

export async function wikidataFacts(title: string): Promise<PlaceFacts> {
  return cached(`wd:facts:${title}`, 30 * DAY, async () => {
    const entity = await entityForTitle(title);
    if (!entity?.claims) return {};

    const claims = entity.claims;
    const population = latestQuantity(claims.P1082);
    const countryId = entityId(claims.P17?.[0]);
    const regionId = entityId(claims.P131?.[0]);
    const founded = yearOf(claims.P571?.[0]);

    const labels = await labelsFor([countryId, regionId].filter((id): id is string => Boolean(id)));

    return {
      population: population?.value,
      populationYear: population?.year,
      country: countryId ? labels[countryId] : undefined,
      region: regionId ? labels[regionId] : undefined,
      founded,
    };
  });
}

async function entityForTitle(title: string): Promise<Entity | undefined> {
  const url = new URL(API);
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("sites", "enwiki");
  url.searchParams.set("titles", title);
  url.searchParams.set("props", "claims");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const body = await getJson<EntitiesBody>(url);
  return Object.values(body.entities ?? {}).find((entity) => !entity.missing);
}

async function labelsFor(ids: Array<string>): Promise<Record<string, string>> {
  if (ids.length === 0) return {};

  const url = new URL(API);
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", ids.join("|"));
  url.searchParams.set("props", "labels");
  url.searchParams.set("languages", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const body = await getJson<EntitiesBody & { entities?: Record<string, { labels?: Record<string, { value?: string }> }> }>(url);
  const labels: Record<string, string> = {};
  for (const [id, entity] of Object.entries(body.entities ?? {})) {
    const value = entity.labels?.en?.value;
    if (value) labels[id] = value;
  }
  return labels;
}

/** Population claims carry a point-in-time qualifier; take the most recent. */
function latestQuantity(claims: Array<Snak> | undefined): { value: number; year?: number } | undefined {
  let best: { value: number; year?: number; time: string } | undefined;

  for (const claim of claims ?? []) {
    const value = claim.mainsnak?.datavalue?.value as { amount?: string } | undefined;
    if (!value?.amount) continue;
    const amount = Number(value.amount);
    if (!Number.isFinite(amount)) continue;

    const time = (claim.qualifiers?.P585?.[0]?.datavalue?.value as { time?: string } | undefined)?.time ?? "";
    if (!best || time > best.time) {
      best = { value: amount, year: time ? Number(time.slice(1, 5)) : undefined, time };
    }
  }

  return best ? { value: best.value, year: best.year } : undefined;
}

function entityId(claim: Snak | undefined): string | undefined {
  const value = claim?.mainsnak?.datavalue?.value as { id?: string } | undefined;
  return value?.id;
}

function yearOf(claim: Snak | undefined): string | undefined {
  const time = (claim?.mainsnak?.datavalue?.value as { time?: string } | undefined)?.time;
  if (!time) return undefined;
  const year = time.slice(1, 5);
  return /^\d{4}$/.test(year) ? year : undefined;
}

async function getJson<T>(url: URL): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Could not reach Wikidata. Check the connection and try again.");
  }
  if (!response.ok) {
    throw new Error(`Wikidata returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

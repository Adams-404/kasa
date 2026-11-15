import type { Place } from "./format";
import { formatLatLon } from "./format";
import { formatDateRange } from "./dates";
import type { TrendAnalysis } from "./stats/analyse";
import { VARIABLES, VARIABLE_ORDER, type VariableId } from "./variables";
import type { HistoryEntry } from "./api/wikipedia";

/**
 * The context bundle for the assistant.
 *
 * Everything here was already fetched for the page: the place, the imagery
 * date, the computed trend for both variables, and the encyclopedia entry if
 * the history panel found one. Nothing is looked up specially for the model, so
 * the answer can never be grounded in something the person cannot see.
 *
 * `text` is the exact block sent to the server, and the panel shows it verbatim
 * under "what the assistant was given".
 */
export type ChatContext = {
  text: string;
  sources: Array<string>;
  /** True when the only thing we can offer is coordinates and a date. */
  thin: boolean;
};

type ContextInput = {
  place: Place;
  imageryDate: string;
  imageryLabel: string;
  windowYears: number;
  analyses: Partial<Record<VariableId, TrendAnalysis>>;
  wiki: HistoryEntry | null;
};

const MAX_EXTRACT = 1200;

export function buildChatContext(input: ContextInput): ChatContext {
  const { place, imageryDate, imageryLabel, windowYears, analyses, wiki } = input;
  const sources: Array<string> = ["NASA POWER"];

  const lines: Array<string> = [];

  lines.push("PLACE");
  lines.push(`${place.name || "Unnamed point"} — ${formatLatLon(place.lat, place.lon)}`);
  if (place.detail) lines.push(`Administrative detail: ${place.detail}`);

  lines.push("");
  lines.push("IMAGERY");
  lines.push(
    `${imageryLabel} for the 8-day period ${formatDateRange(imageryDate, addDays(imageryDate, 7))} (NASA GIBS).`,
  );
  sources.push("NASA GIBS");

  lines.push("");
  lines.push(
    `CLIMATE (NASA POWER / MERRA-2 reanalysis, one ~0.5° grid cell, monthly values with the seasonal cycle removed, then averaged by year; window ${windowYears} years)`,
  );

  let withData = 0;
  for (const id of VARIABLE_ORDER) {
    const analysis = analyses[id];
    if (!analysis) continue;
    const spec = VARIABLES[id];
    const values = analysis.annual.years.map(
      (year, index) => `${year} ${formatNumber(analysis.annual.anomalies[index], spec.decimals + 1)}`,
    );

    lines.push("");
    lines.push(
      `${spec.label} (${spec.unit}), ${analysis.startYear}–${analysis.endYear}, n = ${analysis.annual.years.length} annual values:`,
    );
    lines.push(values.length > 0 ? `  ${values.join(", ")}` : "  no complete years");
    lines.push(
      `  Theil-Sen slope: ${signed(analysis.slopePerDecade, spec.decimals)} ${spec.unit} per decade`,
    );
    lines.push(
      `  Mann-Kendall: S = ${analysis.mk.s}, p = ${formatP(analysis.mk.p)} (${analysis.mk.method} null distribution)`,
    );
    lines.push(
      `  Significance at p < 0.05: ${analysis.significant ? "yes" : "no"}`,
    );
    lines.push(`  Kasa's verdict: ${analysis.verdict.statement}`);
    if (analysis.annual.years.length >= 2) withData += 1;
  }

  if (withData === 0) {
    lines.push("");
    lines.push("No complete annual values were available, so there is no trend to discuss.");
  }

  lines.push("");
  if (wiki) {
    sources.push("Wikipedia", "Wikidata");
    lines.push(
      `ENCYCLOPEDIA (Wikipedia, CC BY-SA, article "${wiki.title}", ${formatDistance(wiki.distanceMetres)} from this point)`,
    );
    if (wiki.description) lines.push(`Description: ${wiki.description}`);
    lines.push(trim(wiki.extract, MAX_EXTRACT));

    const facts: Array<string> = [];
    if (wiki.facts.population !== undefined) {
      facts.push(
        `population ${wiki.facts.population.toLocaleString("en")}${
          wiki.facts.populationYear ? ` (${wiki.facts.populationYear})` : ""
        }`,
      );
    }
    if (wiki.facts.region) facts.push(`region ${wiki.facts.region}`);
    if (wiki.facts.country) facts.push(`country ${wiki.facts.country}`);
    if (wiki.facts.founded) facts.push(`founded ${wiki.facts.founded}`);
    if (facts.length > 0) lines.push(`Wikidata facts: ${facts.join("; ")}.`);
  } else {
    lines.push(
      "ENCYCLOPEDIA: none. No Wikipedia article with a summary within 10 km of this point, so history and culture questions cannot be answered from here.",
    );
  }

  lines.push("");
  lines.push(
    "LIMITS to state when relevant: POWER is a reanalysis grid cell, not a station; the imagery is an 8-day 500 m composite, and its product masks open water; a ten-year window is weak evidence either way; a trend describes this window and is not attribution.",
  );

  return {
    text: lines.join("\n"),
    sources: [...new Set(sources)],
    thin: withData === 0 && wiki === null,
  };
}

function addDays(iso: string, days: number): string {
  const ms = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function trim(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

function formatNumber(value: number | undefined, decimals: number): string {
  if (value === undefined || !Number.isFinite(value)) return "n/a";
  const fixed = value.toFixed(decimals);
  return Number(fixed) === 0 ? "0" : `${value > 0 ? "+" : ""}${fixed}`;
}

function signed(value: number, decimals: number): string {
  const fixed = Math.abs(value).toFixed(decimals);
  if (Number(fixed) === 0) return "0";
  return `${value > 0 ? "+" : "−"}${fixed}`;
}

/** Never print a p-value as zero; the test cannot support that. */
function formatP(p: number): string {
  if (!Number.isFinite(p)) return "n/a";
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}

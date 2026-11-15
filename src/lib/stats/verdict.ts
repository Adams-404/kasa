/**
 * Plain-language verdict.
 *
 * Rules (from project.md section 4, which follows the challenge brief):
 * - never say a trend is "caused" by anything
 * - never call a non-significant change a change
 * - always print the window, the numbers and the p-value
 * - say plainly that ten years is weak evidence
 */

export type VerdictInput = {
  /** "Temperature" or "Rainfall". */
  variableLabel: string;
  /** "°C" or "mm/day". */
  unit: string;
  /** Decimal places for the slope. */
  decimals: number;
  startYear: number;
  endYear: number;
  /** Number of annual points in the test. */
  n: number;
  slopePerDecade: number;
  p: number;
  alpha: number;
  method: "exact" | "normal";
};

export type VerdictText = {
  /** The headline sentence. */
  statement: string;
  /** The evidence sentence, always includes p. */
  detail: string;
  /** Honesty note for short windows. */
  caveat?: string;
  direction: "up" | "down" | "none";
  significant: boolean;
};

export function buildVerdict(input: VerdictInput): VerdictText {
  const {
    variableLabel,
    unit,
    decimals,
    startYear,
    endYear,
    n,
    slopePerDecade,
    p,
    alpha,
    method,
  } = input;

  if (n < 5) {
    return {
      statement: `Not enough years to test a trend for ${variableLabel.toLowerCase()} here.`,
      detail: `Only ${n} complete ${n === 1 ? "year" : "years"} of data are available for this window.`,
      direction: "none",
      significant: false,
    };
  }

  const significant = p < alpha;
  const rising = slopePerDecade > 0;
  const magnitude = Math.abs(slopePerDecade).toFixed(decimals);
  const pText = formatP(p);
  const window = `${startYear} to ${endYear}`;
  const testName = method === "exact" ? "Mann-Kendall test (exact)" : "Mann-Kendall test";

  if (significant) {
    const verb = rising ? "rose" : "fell";
    return {
      statement: `${variableLabel} here ${verb} about ${magnitude} ${unit} per decade over ${window}.`,
      detail: `The ${testName} gives ${pText} on ${n} annual values, so a change this consistent is unlikely to be chance.`,
      caveat: shortWindowCaveat(n),
      direction: rising ? "up" : "down",
      significant: true,
    };
  }

  return {
    statement: `${variableLabel} shows no significant trend over ${window}.`,
    detail: `The fitted change is ${signed(magnitude, rising)} ${unit} per decade, but the ${testName} gives ${pText}: a change this size is within normal year-to-year variation.`,
    caveat: shortWindowCaveat(n),
    direction: "none",
    significant: false,
  };
}

/** p < 0.001 is reported as a bound, never as "0". */
export function formatP(p: number): string {
  if (!Number.isFinite(p)) return "p not available";
  if (p < 0.001) return "p < 0.001";
  return `p = ${p.toFixed(2)}`;
}

function signed(magnitude: string, rising: boolean): string {
  if (Number(magnitude) === 0) return "0";
  return rising ? `+${magnitude}` : `-${magnitude}`;
}

function shortWindowCaveat(n: number): string | undefined {
  if (n >= 30) return undefined;
  return `${n} years is a short window: it gives weak evidence either way, so read this as a change in this window, not a verdict on the climate.`;
}

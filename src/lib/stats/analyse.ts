import { annualSeries, type AnnualSeries, type MonthlyPoint } from "./anomalies";
import { mannKendall, type MannKendallResult } from "./mannKendall";
import { theilSen, type TheilSenResult } from "./theilSen";
import { buildVerdict, type VerdictText } from "./verdict";

export type VariableSpec = {
  id: string;
  /** "Temperature" */
  label: string;
  /** "°C" */
  unit: string;
  /** Decimal places for the slope, e.g. 1 for °C per decade. */
  decimals: number;
  /** One plain sentence, required by the challenge brief's audience note. */
  definition: string;
};

export type TrendAnalysis = {
  spec: VariableSpec;
  annual: AnnualSeries;
  monthly: MonthlyPoint[];
  mk: MannKendallResult;
  slope: TheilSenResult;
  slopePerDecade: number;
  startYear: number;
  endYear: number;
  significant: boolean;
  verdict: VerdictText;
};

export const ALPHA = 0.05;

/**
 * Full pipeline for one variable at one point:
 * monthly values -> seasonal removal -> annual anomalies -> Mann-Kendall +
 * Theil-Sen -> verdict.
 */
export function analyseSeries(
  monthly: ReadonlyArray<MonthlyPoint>,
  spec: VariableSpec,
  alpha: number = ALPHA,
): TrendAnalysis {
  const annual = annualSeries(monthly);
  const x = annual.years.map((year) => year);
  const mk = mannKendall(annual.anomalies);
  const slope = theilSen(x, annual.anomalies);
  const slopePerDecade = slope.slope * 10;

  const startYear = annual.years[0] ?? 0;
  const endYear = annual.years[annual.years.length - 1] ?? 0;

  const verdict = buildVerdict({
    variableLabel: spec.label,
    unit: spec.unit,
    decimals: spec.decimals,
    startYear,
    endYear,
    n: annual.years.length,
    slopePerDecade,
    p: mk.p,
    alpha,
    method: mk.method,
  });

  return {
    spec,
    annual,
    monthly: [...monthly],
    mk,
    slope,
    slopePerDecade,
    startYear,
    endYear,
    significant: mk.p < alpha,
    verdict,
  };
}

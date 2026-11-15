/**
 * Seasonal removal.
 *
 * A monthly climate series is dominated by the seasonal cycle: July is warmer
 * than January everywhere outside the tropics. A trend test on the raw monthly
 * values would read that cycle as a trend, so we subtract each calendar month's
 * mean across the window first, then average within years.
 *
 * This is the step the official challenge brief explicitly asks for: trends
 * "are not evident unless regular cycles, such as the seasonal cycle, are removed".
 */

import { median } from "./theilSen";

export type MonthlyPoint = {
  year: number;
  /** 1-12. */
  month: number;
  value: number;
};

export type AnnualSeries = {
  /** Years with enough months to trust, ascending. */
  years: Array<number>;
  /** Annual mean of the monthly anomalies. */
  anomalies: Array<number>;
  /** Annual mean of the raw monthly values. */
  means: Array<number>;
  /** Month count behind each year, for honesty about gaps. */
  months: Array<number>;
};

/** A year needs at least this many months to enter the trend test. */
export const MIN_MONTHS_PER_YEAR = 9;

/** POWER marks missing data with -999. */
export const POWER_FILL = -999;

export function isMissing(value: number): boolean {
  return !Number.isFinite(value) || value <= POWER_FILL;
}

/**
 * Monthly anomaly = value - the mean of that calendar month over the window.
 * Missing values are dropped before the climatology is computed.
 */
export function monthlyAnomalies(points: ReadonlyArray<MonthlyPoint>): Array<
  MonthlyPoint & { anomaly: number }
> {
  const clean = points.filter((p) => !isMissing(p.value));

  const sums = new Array<number>(13).fill(0);
  const counts = new Array<number>(13).fill(0);
  for (const p of clean) {
    if (p.month < 1 || p.month > 12) continue;
    sums[p.month] += p.value;
    counts[p.month] += 1;
  }

  const climatology = sums.map((sum, month) =>
    counts[month] > 0 ? sum / counts[month] : NaN,
  );

  return clean.map((p) => ({
    ...p,
    anomaly: p.value - climatology[p.month],
  }));
}

/**
 * Annual mean anomalies (and raw annual means), year by year.
 * Years with fewer than MIN_MONTHS_PER_YEAR months are dropped, not zero-filled.
 */
export function annualSeries(
  points: ReadonlyArray<MonthlyPoint>,
  minMonths: number = MIN_MONTHS_PER_YEAR,
): AnnualSeries {
  const withAnomalies = monthlyAnomalies(points);

  const byYear = new Map<
    number,
    { anomalySum: number; valueSum: number; months: number }
  >();

  for (const p of withAnomalies) {
    if (!Number.isFinite(p.anomaly)) continue;
    const entry = byYear.get(p.year) ?? { anomalySum: 0, valueSum: 0, months: 0 };
    entry.anomalySum += p.anomaly;
    entry.valueSum += p.value;
    entry.months += 1;
    byYear.set(p.year, entry);
  }

  const years = [...byYear.keys()].sort((a, b) => a - b).filter((year) => {
    const entry = byYear.get(year)!;
    return entry.months >= minMonths;
  });

  return {
    years,
    anomalies: years.map((year) => {
      const entry = byYear.get(year)!;
      return entry.anomalySum / entry.months;
    }),
    means: years.map((year) => {
      const entry = byYear.get(year)!;
      return entry.valueSum / entry.months;
    }),
    months: years.map((year) => byYear.get(year)!.months),
  };
}

/** Median annual value: a robust "typical year" for a plain-language summary. */
export function typicalYear(series: AnnualSeries): number {
  return median(series.means);
}

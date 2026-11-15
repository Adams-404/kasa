import { describe, expect, it } from "vitest";
import { annualSeries, monthlyAnomalies, type MonthlyPoint } from "./anomalies";
import { mannKendall } from "./mannKendall";
import { median, theilSen } from "./theilSen";
import { analyseSeries, type VariableSpec } from "./analyse";
import { buildVerdict, formatP } from "./verdict";

const TEMP: VariableSpec = {
  id: "T2M",
  label: "Temperature",
  unit: "°C",
  decimals: 1,
  definition: "Air temperature two metres above the ground.",
};

const RAIN: VariableSpec = {
  id: "PRECTOTCORR",
  label: "Rainfall",
  unit: "mm/day",
  decimals: 2,
  definition: "Daily average rainfall.",
};

/** Build a monthly series from one value per year, with a seasonal cycle added. */
function monthlyFrom(
  annual: ReadonlyArray<number>,
  options: { startYear?: number; season?: number; wiggle?: (year: number, month: number) => number } = {},
): Array<MonthlyPoint> {
  const { startYear = 2016, season = 0, wiggle } = options;
  const points: Array<MonthlyPoint> = [];
  annual.forEach((value, index) => {
    const year = startYear + index;
    for (let month = 1; month <= 12; month++) {
      const seasonal = season * Math.sin((2 * Math.PI * (month - 1)) / 12);
      const extra = wiggle ? wiggle(year, month) : 0;
      points.push({ year, month, value: value + seasonal + extra });
    }
  });
  return points;
}

describe("Mann-Kendall", () => {
  it("flags a known increasing series as significant", () => {
    const result = mannKendall([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.s).toBe(45);
    expect(result.method).toBe("exact");
    // Exactly two of 10! orderings reach |S| = 45.
    expect(result.p).toBeCloseTo(2 / 3628800, 12);
    expect(result.p).toBeLessThan(0.05);
  });

  it("does not flag pure noise", () => {
    const result = mannKendall([0.4, -0.3, 0.9, -0.7, 0.2, -0.5, 0.6, -0.1, 0.3, -0.4]);
    expect(result.p).toBeGreaterThan(0.05);
  });

  it("treats a flat series as no trend at all", () => {
    const result = mannKendall([5, 5, 5, 5, 5, 5, 5, 5]);
    expect(result.s).toBe(0);
    expect(result.p).toBe(1);
    expect(result.hasTies).toBe(true);
  });

  it("uses the tie-corrected normal approximation when values repeat", () => {
    const result = mannKendall([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(result.hasTies).toBe(true);
    expect(result.method).toBe("normal");
    expect(result.p).toBeGreaterThan(0);
    expect(result.p).toBeLessThanOrEqual(1);
  });

  it("never returns a p-value above 1 or below 0", () => {
    for (const n of [5, 10, 20, 40]) {
      const values = Array.from({ length: n }, (_, i) => i + (i % 3));
      const { p } = mannKendall(values);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe("Theil-Sen", () => {
  it("recovers an exact line", () => {
    const result = theilSen([0, 1, 2, 3, 4], [0, 2, 4, 6, 8]);
    expect(result.slope).toBe(2);
    expect(result.pairs).toBe(10);
  });

  it("ignores a single outlier when the rest of the series is flat", () => {
    const result = theilSen([0, 1, 2, 3, 4, 5], [10, 10, 10, 10, 10, 40]);
    expect(Math.abs(result.slope)).toBeLessThan(0.5);
  });

  it("takes the mean of the middle two for an even count", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("seasonal removal", () => {
  it("centres each calendar month on zero", () => {
    const points = monthlyFrom([20, 21, 22], { season: 8 });
    const anomalies = monthlyAnomalies(points);
    const byMonth = new Map<number, Array<number>>();
    for (const point of anomalies) {
      byMonth.set(point.month, [...(byMonth.get(point.month) ?? []), point.anomaly]);
    }
    for (const values of byMonth.values()) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      expect(Math.abs(mean)).toBeLessThan(1e-9);
    }
  });

  it("does not turn a strong seasonal cycle with no trend into a trend", () => {
    const years = Array.from({ length: 20 }, (_, i) => 27 + 0 * i);
    const points = monthlyFrom(years, {
      season: 9,
      wiggle: (year, month) => 0.3 * Math.cos(year * 0.7 + month * 1.3),
    });
    const analysis = analyseSeries(points, TEMP);

    expect(analysis.annual.years).toHaveLength(20);
    expect(analysis.significant).toBe(false);
    expect(analysis.mk.p).toBeGreaterThan(0.05);
    expect(Math.abs(analysis.slopePerDecade)).toBeLessThan(0.05);
    // The seasonal signal is gone from the annual anomalies.
    expect(Math.max(...analysis.annual.anomalies.map(Math.abs))).toBeLessThan(0.4);
  });

  it("drops a year with too few months instead of filling it with zeros", () => {
    const points = monthlyFrom([1, 2, 3], { startYear: 2020 });
    const trimmed = points.filter((p) => !(p.year === 2021 && p.month > 3));
    const annual = annualSeries(trimmed);
    expect(annual.years).toEqual([2020, 2022]);
  });

  it("ignores POWER's -999 fill values", () => {
    const points = monthlyFrom([10, 11], { startYear: 2020 });
    points[0].value = -999;
    const annual = annualSeries(points);
    expect(annual.years).toEqual([2020, 2021]);
    expect(Number.isFinite(annual.means[0])).toBe(true);
  });
});

describe("end to end", () => {
  it("finds a real warming trend", () => {
    const points = monthlyFrom(
      Array.from({ length: 10 }, (_, i) => 26 + 0.03 * i),
      { season: 5, wiggle: (year, month) => 0.05 * Math.sin(year * 3 + month) },
    );
    const analysis = analyseSeries(points, TEMP);
    expect(analysis.significant).toBe(true);
    expect(analysis.slopePerDecade).toBeGreaterThan(0.1);
    expect(analysis.verdict.statement).toContain("rose about");
    expect(analysis.verdict.caveat).toContain("short window");
  });

  it("reports no significant trend for noisy rainfall without claiming a change", () => {
    const points = monthlyFrom(
      [2.1, 1.4, 2.6, 1.8, 2.2, 1.6, 2.4, 1.9, 2.5, 1.7],
      { season: 3, wiggle: (year, month) => 0.15 * Math.cos(year * 2 + month) },
    );
    const analysis = analyseSeries(points, RAIN);
    expect(analysis.significant).toBe(false);
    expect(analysis.verdict.statement).toContain("no significant trend");
    expect(analysis.verdict.direction).toBe("none");
    expect(analysis.verdict.detail).toContain("p =");
  });
});

describe("verdict copy", () => {
  it("formats tiny p-values as a bound, never as zero", () => {
    expect(formatP(0.0004)).toBe("p < 0.001");
    expect(formatP(0.02)).toBe("p = 0.02");
  });

  it("states the window and the slope when significant", () => {
    const verdict = buildVerdict({
      variableLabel: "Temperature",
      unit: "°C",
      decimals: 1,
      startYear: 2016,
      endYear: 2025,
      n: 10,
      slopePerDecade: 0.31,
      p: 0.02,
      alpha: 0.05,
      method: "exact",
    });
    expect(verdict.statement).toBe(
      "Temperature here rose about 0.3 °C per decade over 2016 to 2025.",
    );
    expect(verdict.detail).toContain("p = 0.02");
    expect(verdict.significant).toBe(true);
  });

  it("does not claim a decrease when the test is not significant", () => {
    const verdict = buildVerdict({
      variableLabel: "Rainfall",
      unit: "mm/day",
      decimals: 2,
      startYear: 2016,
      endYear: 2025,
      n: 10,
      slopePerDecade: -0.04,
      p: 0.41,
      alpha: 0.05,
      method: "exact",
    });
    expect(verdict.statement).toBe("Rainfall shows no significant trend over 2016 to 2025.");
    expect(verdict.statement).not.toContain("fell");
    expect(verdict.detail).toContain("-0.04");
  });

  it("says so when there are too few years", () => {
    const verdict = buildVerdict({
      variableLabel: "Temperature",
      unit: "°C",
      decimals: 1,
      startYear: 2024,
      endYear: 2025,
      n: 2,
      slopePerDecade: 1,
      p: 1,
      alpha: 0.05,
      method: "normal",
    });
    expect(verdict.statement).toContain("Not enough years");
  });
});

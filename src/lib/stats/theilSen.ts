/**
 * Theil-Sen slope: the median of the slopes between every pair of points.
 * Robust to outliers, which matters for annual climate data where one bad year
 * should not set the trend.
 */

export type TheilSenResult = {
  /** Change per unit of x. Callers scale this to a decade. */
  slope: number;
  /** y value of the fitted line at the mean x (a robust intercept). */
  intercept: number;
  /** Number of pairwise slopes. */
  pairs: number;
};

export function theilSen(
  x: ReadonlyArray<number>,
  y: ReadonlyArray<number>,
): TheilSenResult {
  if (x.length !== y.length) {
    throw new Error("theilSen: x and y must have the same length");
  }
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0, pairs: 0 };

  const slopes: Array<number> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = x[j] - x[i];
      if (dx === 0) continue;
      slopes.push((y[j] - y[i]) / dx);
    }
  }
  if (slopes.length === 0) return { slope: 0, intercept: y[0], pairs: 0 };

  slopes.sort((a, b) => a - b);
  const slope = medianSorted(slopes);

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const intercept = meanY - slope * meanX;

  return { slope, intercept, pairs: slopes.length };
}

/** Median of an already sorted array. Even counts average the middle two. */
export function medianSorted(sorted: ReadonlyArray<number>): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function median(values: ReadonlyArray<number>): number {
  return medianSorted([...values].sort((a, b) => a - b));
}

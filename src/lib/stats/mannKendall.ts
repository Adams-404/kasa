/**
 * Mann-Kendall trend test.
 *
 * S = sum over all pairs i<j of sign(x_j - x_i).
 * Under the null hypothesis (no trend, values in random order) S is symmetric
 * around zero. With no ties we compute the exact null distribution, which
 * matters because our default window is only 10 annual points — the normal
 * approximation is weak there. With ties we fall back to the normal
 * approximation with the standard tie correction and continuity correction.
 */

export type MannKendallResult = {
  n: number;
  /** Kendall S statistic. */
  s: number;
  /** Normalised statistic, 0 when S = 0. */
  z: number;
  /** Two-sided p-value. */
  p: number;
  /** Kendall's tau-b, for display only. */
  tau: number;
  method: "exact" | "normal";
  /** True when the series has repeated values, which decides the method. */
  hasTies: boolean;
};

export function mannKendall(values: ReadonlyArray<number>): MannKendallResult {
  const n = values.length;
  if (n < 3) {
    return {
      n,
      s: 0,
      z: 0,
      p: 1,
      tau: 0,
      method: "normal",
      hasTies: false,
    };
  }

  let s = 0;
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      s += Math.sign(values[j] - values[i]);
      pairs++;
    }
  }

  // Tie groups, for the variance correction and tau-b.
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const tieGroups = [...counts.values()];
  const hasTies = tieGroups.some((c) => c > 1);

  // tau-b: x is the time index (no ties), y may have ties.
  const tiePairs = tieGroups.reduce((acc, t) => acc + (t * (t - 1)) / 2, 0);
  const tauDenominator = Math.sqrt(pairs * (pairs - tiePairs)) || 1;
  const tau = s / tauDenominator;

  if (!hasTies && n <= 40) {
    const p = exactTwoSidedP(n, s);
    const variance = (n * (n - 1) * (2 * n + 5)) / 18;
    const z = s === 0 ? 0 : (s - Math.sign(s)) / Math.sqrt(variance);
    return { n, s, z, p, tau, method: "exact", hasTies };
  }

  const tieTerm = tieGroups.reduce((acc, t) => acc + t * (t - 1) * (2 * t + 5), 0);
  const variance = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;

  if (variance <= 0) {
    return { n, s, z: 0, p: 1, tau, method: "normal", hasTies };
  }

  const z = s === 0 ? 0 : (s - Math.sign(s)) / Math.sqrt(variance);
  const p = clampP(2 * (1 - normalCdf(Math.abs(z))));

  return { n, s, z, p, tau, method: "normal", hasTies };
}

/** Convenience: is the trend significant at the usual 0.05 level? */
export function isSignificant(result: MannKendallResult, alpha = 0.05): boolean {
  return result.p < alpha;
}

/**
 * Exact two-sided P(|S| >= |s|) under the no-trend null, from the Mahonian
 * distribution of inversions. S = M - 2k where M = n(n-1)/2 and k is the
 * number of inversions, so counting permutations by inversions counts by S.
 */
function exactTwoSidedP(n: number, s: number): number {
  const ways = mahonian(n);
  const m = (n * (n - 1)) / 2;
  const target = Math.abs(s);
  let count = 0;
  for (let k = 0; k < ways.length; k++) {
    if (Math.abs(m - 2 * k) >= target) count += ways[k];
  }
  return clampP(count / factorial(n));
}

/** Number of permutations of n with exactly k inversions, for every k. */
function mahonian(n: number): Float64Array {
  let ways = new Float64Array([1]);
  for (let size = 2; size <= n; size++) {
    const maxInv = (size * (size - 1)) / 2;
    const next = new Float64Array(maxInv + 1);
    let window = 0;
    for (let k = 0; k <= maxInv; k++) {
      if (k < ways.length) window += ways[k];
      if (k - size >= 0 && k - size < ways.length) window -= ways[k - size];
      next[k] = window;
    }
    ways = next;
  }
  return ways;
}

const FACTORIALS: Array<number> = [1];
function factorial(n: number): number {
  for (let i = FACTORIALS.length; i <= n; i++) FACTORIALS[i] = FACTORIALS[i - 1] * i;
  return FACTORIALS[n];
}

/** Keep floating point dust from producing p < 0 or p > 1. */
function clampP(p: number): number {
  return Math.min(1, Math.max(0, p));
}

/** Standard normal CDF via the complementary error function. */
export function normalCdf(x: number): number {
  return 0.5 * erfc(-x / Math.SQRT2);
}

/**
 * Complementary error function, Chebyshev form (Numerical Recipes `erfc`,
 * fractional error below 1.2e-16). Accurate enough for p-values down to 1e-15.
 */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;
  const cof = [
    -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2,
    -9.561514786808631e-3, -9.46595344482036e-4, 3.66839497852761e-4,
    4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6,
    1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11,
    2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13,
    3.81e-16, 7.106e-15,
  ];

  let d = 0;
  let dd = 0;
  for (let j = cof.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + cof[j];
    dd = tmp;
  }
  const ans = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd);
  return x >= 0 ? ans : 2 - ans;
}

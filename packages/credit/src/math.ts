// Statistical helpers — all pure, no side effects.

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = sum(values.map((v) => (v - m) ** 2)) / values.length;
  return Math.sqrt(variance);
}

/**
 * Coefficient of variation (stddev / mean). Returns 0 when mean is 0.
 * Measures revenue volatility — lower is more consistent.
 */
export function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (m === 0) return values.some((v) => v !== 0) ? 2 : 0;
  return stddev(values) / m;
}

/**
 * Linear regression slope, normalized by mean (relative growth rate).
 * Returns a value in [-∞, +∞]; callers clamp to [-1, 1].
 * Months with zero revenue bring the slope down appropriately.
 */
export function linearTrendRate(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const m = mean(values);
  if (m === 0) return 0;

  // OLS slope on (index, value) pairs
  const indices = Array.from({ length: n }, (_, i) => i);
  const sumX = sum(indices);
  const sumY = sum(values);
  const sumXY = sum(indices.map((i) => i * (values[i] ?? 0)));
  const sumX2 = sum(indices.map((i) => i * i));

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;

  // Normalize: slope per month relative to mean revenue
  // A slope equal to the mean per month means 100% monthly growth → clamp to 1
  return Math.max(-1, Math.min(1, slope / m));
}

/**
 * Kasb Credit Score — transparent formula (v1)
 *
 * Total: 100 pts = sum of 5 components (never hidden, shown to user)
 *   revenueConsistency  (0–30)  low CV of monthly income → more predictable cash flow
 *   expenseControl      (0–25)  low expense/revenue ratio → healthy margin
 *   growthTrend         (0–20)  positive MoM revenue slope → business is growing
 *   debtRecoveryRate    (0–15)  % of customer credit recovered → clients pay back
 *   dataRichness        (0–10)  6+ months of dense data → score is trustworthy
 *
 * Minimum data gate: ≥ 30 entries spanning ≥ 30 days → returns null if below.
 * This is NOT a FICO score. It generates leads for licensed microfinance partners.
 * Partners make their own credit decisions — Kasb never approves or denies credit.
 */

import type { CashEntry, DebtEntry, ScoreComponents } from "@kasb/core";
import { coefficientOfVariation, linearTrendRate, sum } from "./math";

const MIN_ENTRIES = 30;
const MIN_DAYS = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Groups income entry amounts by YYYY-MM, returns amounts in chronological order. */
function monthlyIncomes(entries: CashEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "income") continue;
    const key = toYearMonth(new Date(e.entryDate));
    map.set(key, (map.get(key) ?? 0) + e.amount);
  }
  // Return sorted by key (chronological for ISO YYYY-MM)
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function countMonthsWithEntries(entries: CashEntry[]): number {
  const months = new Set(entries.map((e) => toYearMonth(new Date(e.entryDate))));
  return months.size;
}

function datespanDays(entries: CashEntry[]): number {
  if (entries.length < 2) return 0;
  const dates = entries.map((e) => new Date(e.entryDate).getTime());
  const ms = Math.max(...dates) - Math.min(...dates);
  return ms / (1000 * 60 * 60 * 24);
}

// ─── Score result type ────────────────────────────────────────────────────────

export interface CreditScoreResult {
  score: number; // 0–100, always equals sum of components
  components: ScoreComponents;
  monthsOfData: number;
  computedAt: Date;
}

// ─── Component scorers ────────────────────────────────────────────────────────

/** (0–30) Low coefficient of variation on monthly income = more consistent business. */
function scoreRevenueConsistency(monthlyAmounts: number[]): number {
  if (monthlyAmounts.length < 2) return monthlyAmounts.length === 1 ? 15 : 0;
  const cv = coefficientOfVariation(monthlyAmounts);
  // CV=0 → 30 pts, CV≥2 → 0 pts
  return Math.round(30 * Math.max(0, 1 - cv / 2));
}

/** (0–25) Low expense/income ratio = healthy margin. */
function scoreExpenseControl(entries: CashEntry[]): number {
  const totalIncome = sum(entries.filter((e) => e.type === "income").map((e) => e.amount));
  const totalExpense = sum(entries.filter((e) => e.type === "expense").map((e) => e.amount));
  if (totalIncome === 0) return 0;
  const ratio = totalExpense / totalIncome;
  // ratio=0 → 25, ratio≥1 → 0
  return Math.round(25 * Math.max(0, 1 - ratio));
}

/** (0–20) Positive month-over-month revenue slope = growth. */
function scoreGrowthTrend(monthlyAmounts: number[]): number {
  if (monthlyAmounts.length < 2) return 10; // neutral: no trend data
  const rate = linearTrendRate(monthlyAmounts); // -1 to +1
  // Map [-1,+1] → [0,20]
  return Math.round(20 * ((rate + 1) / 2));
}

/** (0–15) % of customer debt collected. Default 50% when no debt data. */
function scoreDebtRecovery(debtEntries: DebtEntry[]): number {
  const totalLent = sum(debtEntries.filter((d) => d.amount > 0).map((d) => d.amount));
  if (totalLent === 0) return Math.round(15 * 0.5); // 7 pts — no data, neutral
  const totalRepaid = sum(debtEntries.filter((d) => d.amount < 0).map((d) => -d.amount));
  const rate = Math.min(1, totalRepaid / totalLent);
  return Math.round(15 * rate);
}

/** (0–10) Data completeness: months covered + entries/month density. */
function scoreDataRichness(entries: CashEntry[]): number {
  const months = countMonthsWithEntries(entries);
  const avgPerMonth = entries.length / Math.max(months, 1);
  // 6 months = full month score, 20 entries/month = full density score
  const monthScore = Math.min(1, months / 6) * 0.5;
  const densityScore = Math.min(1, avgPerMonth / 20) * 0.5;
  return Math.round(10 * (monthScore + densityScore));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Computes the Kasb credit score from raw cash book data.
 *
 * @param entries     All cash entries for this business (from DB)
 * @param debtEntries All debt entries (positive = sale on credit, negative = repayment)
 * @returns           Score result, or null if insufficient data (< 30 entries / 30 days)
 */
export function computeCreditScore(
  entries: CashEntry[],
  debtEntries: DebtEntry[],
): CreditScoreResult | null {
  // Minimum data gate
  if (entries.length < MIN_ENTRIES) return null;
  if (datespanDays(entries) < MIN_DAYS) return null;

  const incomeByMonth = monthlyIncomes(entries);
  const monthlyAmounts = Array.from(incomeByMonth.values());

  const revenueConsistency = scoreRevenueConsistency(monthlyAmounts);
  const expenseControl = scoreExpenseControl(entries);
  const growthTrend = scoreGrowthTrend(monthlyAmounts);
  const debtRecoveryRate = scoreDebtRecovery(debtEntries);
  const dataRichness = scoreDataRichness(entries);

  // Score IS the sum — so components always sum to score (invariant preserved)
  const score = Math.min(
    100,
    revenueConsistency + expenseControl + growthTrend + debtRecoveryRate + dataRichness,
  );

  return {
    score,
    components: { revenueConsistency, expenseControl, growthTrend, debtRecoveryRate, dataRichness },
    monthsOfData: countMonthsWithEntries(entries),
    computedAt: new Date(),
  };
}

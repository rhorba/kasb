// packages/credit — Kasb credit score algorithm + partner matching
// Sprint 5: statistical credit score algorithm + partner matching
// 5 components: revenueConsistency(30) + expenseControl(25) + growthTrend(20)
//               + debtRecoveryRate(15) + dataRichness(10) = 100

export { computeCreditScore, type CreditScoreResult } from "./score";
export { matchPartners } from "./partners";
export { coefficientOfVariation, linearTrendRate, mean, stddev, sum } from "./math";

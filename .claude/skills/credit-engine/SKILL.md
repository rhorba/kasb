---
name: credit-engine
description: Credit score algorithm, partner matching, eligibility. Trigger on: "credit", "score", "microfinance", "Al Amana", "Fondep", "eligibility", "scoring".
---
# Credit Engine — Kasb

## Role
Own `packages/credit`. This is the economic unlock — the component that transforms
a cash book into a path to financing. The algorithm must be transparent, documented,
and never a black box.

## Score Formula (0–100, 5 components)

```typescript
// packages/credit/src/score.ts

export function computeCreditScore(
  businessId: string,
  entries: CashEntry[],       // 90+ days of entries
  debtEntries: DebtEntry[]    // customer debt recovery data
): CreditScore {

  // 1. Revenue Consistency (0-30 pts)
  // How regular is monthly revenue? Low variance = higher score.
  const monthlyRevenues = groupByMonth(entries.filter(e => e.type === 'income'))
  const revenueCV = coefficientOfVariation(monthlyRevenues)  // lower = better
  const revenueConsistency = Math.round(30 * Math.max(0, 1 - revenueCV / 2))

  // 2. Expense Control (0-25 pts)
  // Expense-to-revenue ratio. Lower ratio = higher score.
  const totalIncome  = sum(entries.filter(e => e.type === 'income').map(e => e.amount))
  const totalExpense = sum(entries.filter(e => e.type === 'expense').map(e => e.amount))
  const expenseRatio = totalExpense / Math.max(totalIncome, 1)
  const expenseControl = Math.round(25 * Math.max(0, 1 - expenseRatio))

  // 3. Growth Trend (0-20 pts)
  // Month-over-month revenue trend. Positive = higher score.
  const growthRate = computeLinearTrend(monthlyRevenues)  // -1 to +1
  const growthTrend = Math.round(20 * Math.max(0, (growthRate + 1) / 2))

  // 4. Debt Recovery Rate (0-15 pts)
  // % of customer debts actually collected. Higher = more responsible clients.
  const totalDebt     = sum(debtEntries.filter(d => d.amount > 0).map(d => d.amount))
  const totalRecovered = sum(debtEntries.filter(d => d.amount < 0).map(d => -d.amount))
  const recoveryRate  = totalDebt > 0 ? totalRecovered / totalDebt : 0.5  // default 50% if no data
  const debtRecovery  = Math.round(15 * recoveryRate)

  // 5. Data Richness (0-10 pts)
  // Completeness: months of data, entries per month, recency.
  const monthsOfData = getMonthsOfData(entries)
  const avgEntriesPerMonth = entries.length / Math.max(monthsOfData, 1)
  const dataRichness = Math.round(10 * Math.min(1,
    (monthsOfData / 6) * 0.5 +            // 6 months = full points on this sub
    (Math.min(avgEntriesPerMonth, 20) / 20) * 0.5
  ))

  const total = revenueConsistency + expenseControl + growthTrend + debtRecovery + dataRichness

  return {
    businessId, score: Math.min(100, Math.max(0, total)),
    components: { revenueConsistency, expenseControl, growthTrend, debtRecoveryRate: debtRecovery, dataRichness },
    monthsOfData,
    computedAt: new Date(),
    eligiblePartners: []  // filled by matchPartners()
  }
}
```

## Partner Matching
```typescript
export function matchPartners(
  score: number,
  business: BusinessProfile,
  partners: MicrofinancePartner[]
): MicrofinancePartner[] {
  return partners
    .filter(p => p.active && score >= p.minScore)
    .filter(p => !p.cities.length || p.cities.includes(business.city))
    .sort((a, b) => a.minScore - b.minScore)  // most accessible first
}
```

## Score Sweep (pg-boss, nightly)
For each active business with ≥ 30 entries (data minimum): recompute score, store, notify
if score increased by ≥ 5 points ("Votre score a augmenté! Vous êtes maintenant éligible chez Fondep").

## CRITICAL: What the score is NOT
- Not a FICO-style score (no credit history, no bank data)
- Not used for automatic credit approval (human at partner reviews)
- Not shared with partners without explicit user consent
- Not permanent: recomputed every night from current data

## Minimum Data Requirement
Score not shown until: ≥ 30 entries AND ≥ 30 days of data.
Before that: "Enregistrez vos ventes pendant 30 jours pour voir votre score."

## Checklist
- [ ] Score formula documented in-code with comments
- [ ] Score displayed with component breakdown (no black box)
- [ ] Score not computed with < 30 entries / 30 days
- [ ] Partner data only shared with explicit consent at application time
- [ ] Score sweep idempotent (re-run same day → overwrites, no duplicate)

## Handoff Points
- **← DBA**: cash_entries, debt_entries, credit_scores tables
- **← Backend Dev**: score sweep scheduling
- **→ Frontend Dev**: score dashboard display
- **→ Tester**: score edge cases (no data, all zeros, single entry)

/**
 * S5-10 tests — credit score engine + marketplace:
 * 1. computeCreditScore — minimum data gate (< 30 entries, < 30 days)
 * 2. computeCreditScore — CRITICAL invariant: sum(components) === score
 * 3. computeCreditScore — component max bounds
 * 4. computeCreditScore — expenseControl edge cases
 * 5. computeCreditScore — debtRecovery edge cases
 * 6. matchPartners — score threshold, city filter, sort order
 * 7. submitCreditApplication — RBAC + consent guard
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Pure function imports (no mocks needed) ──────────────────────────────────

import type { CashEntry, DebtEntry, MicrofinancePartner } from "@kasb/core";
import { computeCreditScore } from "@kasb/credit";
import { matchPartners } from "@kasb/credit";

// ─── Test data builders ───────────────────────────────────────────────────────

const BIZ_ID = "00000000-b001-4000-8000-000000000001";

/**
 * Builds n income entries evenly spread over `days` days.
 * Each entry has `amount` centimes. entryDate starts `days` ago.
 */
function buildIncomeEntries(n: number, days: number, amount = 50000): CashEntry[] {
  const now = Date.now();
  const interval = (days * 24 * 60 * 60 * 1000) / Math.max(n - 1, 1);
  return Array.from({ length: n }, (_, i) => ({
    id: `e-${i}`,
    businessId: BIZ_ID,
    type: "income" as const,
    amount,
    category: "sales" as const,
    entryDate: new Date(now - days * 24 * 60 * 60 * 1000 + i * interval),
    source: "manual" as const,
    createdAt: new Date(),
  }));
}

/**
 * Builds a realistic dataset: 60 income + 30 expense entries over 120 days.
 * Income ~50,000 centimes each; expense ~10,000 centimes each.
 */
function buildRealisticEntries(incomePer = 50000, expenseRatioOfIncome = 0.4): CashEntry[] {
  const incomeEntries = buildIncomeEntries(60, 120, incomePer);
  const expenseAmount = Math.round(incomePer * expenseRatioOfIncome);
  const expenseEntries = buildIncomeEntries(30, 120, expenseAmount).map((e) => ({
    ...e,
    id: `exp-${e.id}`,
    type: "expense" as const,
    category: "stock_purchase" as const,
  }));
  return [...incomeEntries, ...expenseEntries];
}

function buildDebtEntries(lent: number, repaid: number): DebtEntry[] {
  const entries: DebtEntry[] = [];
  if (lent > 0) {
    entries.push({
      id: "d-1",
      customerId: "c-1",
      businessId: BIZ_ID,
      amount: lent,
      entryDate: new Date(),
      createdAt: new Date(),
    });
  }
  if (repaid > 0) {
    entries.push({
      id: "d-2",
      customerId: "c-1",
      businessId: BIZ_ID,
      amount: -repaid,
      entryDate: new Date(),
      createdAt: new Date(),
    });
  }
  return entries;
}

// ─── Partner fixture ──────────────────────────────────────────────────────────

function makePartner(
  id: string,
  minScore: number,
  cities: string[] = [],
  active = true,
): MicrofinancePartner {
  return {
    id,
    name: `Partner ${id}`,
    logoUrl: "https://example.com/logo.png",
    minScore,
    products: [],
    cities,
    contactPhone: "0522000000",
    active,
  };
}

// ─── 1. Minimum data gate ─────────────────────────────────────────────────────

describe("computeCreditScore — minimum data gate", () => {
  it("returns null for empty entries", () => {
    expect(computeCreditScore([], [])).toBeNull();
  });

  it("returns null when < 30 entries (29 entries)", () => {
    const entries = buildIncomeEntries(29, 90);
    expect(computeCreditScore(entries, [])).toBeNull();
  });

  it("returns null when data spans < 30 days (30 entries in 10 days)", () => {
    const entries = buildIncomeEntries(30, 10);
    expect(computeCreditScore(entries, [])).toBeNull();
  });

  it("returns non-null for exactly 30 entries spanning 31 days", () => {
    const entries = buildIncomeEntries(30, 31);
    expect(computeCreditScore(entries, [])).not.toBeNull();
  });

  it("returns non-null for 90 entries spanning 120 days", () => {
    const entries = buildRealisticEntries();
    expect(computeCreditScore(entries, [])).not.toBeNull();
  });
});

// ─── 2. CRITICAL: sum(components) === score ────────────────────────────────────

describe("computeCreditScore — components sum invariant (CRITICAL)", () => {
  it("components sum equals score for realistic entries", () => {
    const entries = buildRealisticEntries();
    const result = computeCreditScore(entries, []);
    expect(result).not.toBeNull();
    if (!result) return;
    const { revenueConsistency, expenseControl, growthTrend, debtRecoveryRate, dataRichness } =
      result.components;
    const componentSum =
      revenueConsistency + expenseControl + growthTrend + debtRecoveryRate + dataRichness;
    expect(componentSum).toBe(result.score);
  });

  it("components sum equals score for income-only entries", () => {
    const entries = buildIncomeEntries(50, 120);
    const result = computeCreditScore(entries, []);
    expect(result).not.toBeNull();
    if (!result) return;
    const { revenueConsistency, expenseControl, growthTrend, debtRecoveryRate, dataRichness } =
      result.components;
    expect(
      revenueConsistency + expenseControl + growthTrend + debtRecoveryRate + dataRichness,
    ).toBe(result.score);
  });

  it("components sum equals score when all spending equals income", () => {
    const entries = buildRealisticEntries(50000, 1.0); // 100% expense ratio
    const result = computeCreditScore(entries, []);
    expect(result).not.toBeNull();
    if (!result) return;
    const { revenueConsistency, expenseControl, growthTrend, debtRecoveryRate, dataRichness } =
      result.components;
    expect(
      revenueConsistency + expenseControl + growthTrend + debtRecoveryRate + dataRichness,
    ).toBe(result.score);
  });

  it("score is between 0 and 100 inclusive", () => {
    const entries = buildRealisticEntries();
    const result = computeCreditScore(entries, []);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ─── 3. Component max bounds ──────────────────────────────────────────────────

describe("computeCreditScore — component bounds", () => {
  it("revenueConsistency is between 0 and 30", () => {
    const result = computeCreditScore(buildRealisticEntries(), []);
    expect(result?.components.revenueConsistency).toBeGreaterThanOrEqual(0);
    expect(result?.components.revenueConsistency).toBeLessThanOrEqual(30);
  });

  it("expenseControl is between 0 and 25", () => {
    const result = computeCreditScore(buildRealisticEntries(), []);
    expect(result?.components.expenseControl).toBeGreaterThanOrEqual(0);
    expect(result?.components.expenseControl).toBeLessThanOrEqual(25);
  });

  it("growthTrend is between 0 and 20", () => {
    const result = computeCreditScore(buildRealisticEntries(), []);
    expect(result?.components.growthTrend).toBeGreaterThanOrEqual(0);
    expect(result?.components.growthTrend).toBeLessThanOrEqual(20);
  });

  it("debtRecoveryRate is between 0 and 15", () => {
    const result = computeCreditScore(buildRealisticEntries(), []);
    expect(result?.components.debtRecoveryRate).toBeGreaterThanOrEqual(0);
    expect(result?.components.debtRecoveryRate).toBeLessThanOrEqual(15);
  });

  it("dataRichness is between 0 and 10", () => {
    const result = computeCreditScore(buildRealisticEntries(), []);
    expect(result?.components.dataRichness).toBeGreaterThanOrEqual(0);
    expect(result?.components.dataRichness).toBeLessThanOrEqual(10);
  });
});

// ─── 4. expenseControl edge cases ────────────────────────────────────────────

describe("computeCreditScore — expenseControl", () => {
  it("expenseControl = 25 (max) when no expenses", () => {
    const entries = buildIncomeEntries(50, 120);
    const result = computeCreditScore(entries, []);
    expect(result?.components.expenseControl).toBe(25);
  });

  it("expenseControl = 0 when total expense >= total income", () => {
    const incomeEntries = buildIncomeEntries(40, 120, 10000);
    const expenseEntries = buildIncomeEntries(40, 120, 10000).map((e) => ({
      ...e,
      id: `exp-${e.id}`,
      type: "expense" as const,
      category: "rent" as const,
    }));
    const result = computeCreditScore([...incomeEntries, ...expenseEntries], []);
    expect(result?.components.expenseControl).toBe(0);
  });

  it("expenseControl is strictly between 0 and 25 when expenses are moderate", () => {
    // Some expenses but well below income
    const entries = buildRealisticEntries(100000, 0.5);
    const result = computeCreditScore(entries, []);
    expect(result?.components.expenseControl).toBeGreaterThan(0);
    expect(result?.components.expenseControl).toBeLessThan(25);
  });
});

// ─── 5. debtRecoveryRate edge cases ──────────────────────────────────────────

describe("computeCreditScore — debtRecoveryRate", () => {
  it("debtRecoveryRate = 15 (max) when all debt is recovered", () => {
    const entries = buildIncomeEntries(50, 120);
    const debts = buildDebtEntries(50000, 50000); // fully recovered
    const result = computeCreditScore(entries, debts);
    expect(result?.components.debtRecoveryRate).toBe(15);
  });

  it("debtRecoveryRate = 0 when no debt is repaid", () => {
    const entries = buildIncomeEntries(50, 120);
    const debts = buildDebtEntries(50000, 0); // none recovered
    const result = computeCreditScore(entries, debts);
    expect(result?.components.debtRecoveryRate).toBe(0);
  });

  it("debtRecoveryRate ≈ 7 (neutral) when no debt data at all", () => {
    const entries = buildIncomeEntries(50, 120);
    const result = computeCreditScore(entries, []);
    // Default: 50% of 15 = round(7.5) = 8
    expect(result?.components.debtRecoveryRate).toBeGreaterThanOrEqual(7);
    expect(result?.components.debtRecoveryRate).toBeLessThanOrEqual(8);
  });
});

// ─── 6. matchPartners ─────────────────────────────────────────────────────────

describe("matchPartners", () => {
  const p40 = makePartner("p-40", 40, ["Casablanca", "Rabat"]);
  const p60 = makePartner("p-60", 60, ["Casablanca"]);
  const p70 = makePartner("p-70", 70, []); // any city
  const pInactive = makePartner("p-inactive", 30, [], false);

  const allPartners = [p60, p40, p70, pInactive];

  it("excludes partner when score < minScore", () => {
    const ids = matchPartners(35, "Casablanca", allPartners);
    expect(ids).not.toContain("p-40"); // score 35 < minScore 40
  });

  it("includes partner when score >= minScore and city matches", () => {
    const ids = matchPartners(65, "Casablanca", allPartners);
    expect(ids).toContain("p-40");
    expect(ids).toContain("p-60");
  });

  it("excludes partner when city does not match partner's city list", () => {
    const ids = matchPartners(65, "Fès", allPartners); // p-60 city-restricted to Casablanca
    expect(ids).not.toContain("p-60");
  });

  it("includes partner with empty cities for any city", () => {
    const ids = matchPartners(75, "Fès", allPartners);
    expect(ids).toContain("p-70"); // cities=[] means nationwide
  });

  it("excludes inactive partner even if score qualifies", () => {
    const ids = matchPartners(75, "Casablanca", allPartners);
    expect(ids).not.toContain("p-inactive");
  });

  it("returns partner IDs sorted by minScore ascending (most accessible first)", () => {
    const ids = matchPartners(75, "Casablanca", allPartners);
    const scores = ids.map((id) => allPartners.find((p) => p.id === id)?.minScore ?? 0);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1] ?? 0);
    }
  });

  it("returns empty array when no partner qualifies", () => {
    const ids = matchPartners(20, "Casablanca", allPartners);
    expect(ids).toHaveLength(0);
  });

  it("returns empty array for empty partner list", () => {
    expect(matchPartners(80, "Casablanca", [])).toHaveLength(0);
  });
});

// ─── 7. submitCreditApplication — RBAC + consent ──────────────────────────────

const { mockAuth, mockTxInsert, mockWithUserContext, mockDbSelect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockTxInsert: vi.fn(),
  mockWithUserContext: vi.fn(),
  mockDbSelect: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@kasb/db", () => ({
  // db used directly for score lookup (outside RLS tx)
  db: { select: mockDbSelect },
  businessProfiles: {},
  creditScores: {},
  creditApplications: {},
  auditLogs: {},
  loanProducts: {},
  microfinancePartners: {},
  cashEntries: {},
  debtEntries: {},
  withUserContext: mockWithUserContext,
}));

import { submitCreditApplication } from "@/actions/credit";

const PARTNER_UUID = "00000000-0a01-4000-8000-000000000001";
const OWNER_SESSION = {
  userId: "00000000-u001-4000-8000-000000000001",
  role: "owner" as const,
  businessId: "00000000-b001-4000-8000-000000000001",
  partnerOrgId: undefined,
};
const PARTNER_SESSION = {
  userId: "00000000-u002-4000-8000-000000000001",
  role: "partner" as const,
  partnerOrgId: "00000000-po01-4000-8000-000000000001",
};

function setupDbSelectEmpty() {
  mockDbSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // no prior score
        }),
      }),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(OWNER_SESSION);
  setupDbSelectEmpty();
  mockWithUserContext.mockImplementation(
    (_db: unknown, _uid: string, _role: string, fn: (tx: unknown) => unknown) =>
      fn({ insert: mockTxInsert }),
  );
});

describe("submitCreditApplication — RBAC + consent", () => {
  it("blocks partner role", async () => {
    mockAuth.mockResolvedValue(PARTNER_SESSION);
    const result = await submitCreditApplication({
      partnerId: PARTNER_UUID,
      requestedAmount: 500000,
      consentGiven: true,
    });
    expect(result).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("blocks unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await submitCreditApplication({
      partnerId: PARTNER_UUID,
      requestedAmount: 500000,
      consentGiven: true,
    });
    expect(result).toMatchObject({ ok: false, error: "unauthenticated" });
  });

  it("rejects when consentGiven is false", async () => {
    const result = await submitCreditApplication({
      partnerId: PARTNER_UUID,
      requestedAmount: 500000,
      consentGiven: false as unknown as true,
    });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
    // Zod literal(true) errorMap message
    expect(result.ok === false && result.message).toContain("partage");
  });

  it("creates application when consent given (scoreAtApplication defaults to 0 when no stored score)", async () => {
    const appRow = {
      id: "00000000-0a01-4000-8000-000000000001",
      businessId: OWNER_SESSION.businessId,
      partnerId: PARTNER_UUID,
      requestedAmount: 500000,
      scoreAtApplication: 0, // no prior score stored → defaults to 0
      status: "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
      productId: null,
    };

    let insertCall = 0;
    mockTxInsert.mockImplementation(() => {
      insertCall++;
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(insertCall === 1 ? [appRow] : [{}]),
        }),
      };
    });

    const result = await submitCreditApplication({
      partnerId: PARTNER_UUID,
      requestedAmount: 500000,
      consentGiven: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("submitted");
      expect(result.data.requestedAmount).toBe(500000);
    }
  });
});

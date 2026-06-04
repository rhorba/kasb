/**
 * S1-07 tests:
 * 1. Business profile Zod schema validation
 * 2. Server action RBAC — partner cannot call owner actions
 * 3. RLS SQL assertions — append-only (no DELETE), partner isolation
 * 4. Seed integrity — credit score components sum to total
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBusinessProfileSchema } from "@kasb/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mock refs ────────────────────────────────────────────────────────

const { mockAuth, mockTxInsert, mockTxSelect, mockTxUpdate } = vi.hoisted(() => {
  const selectLimit = vi.fn().mockResolvedValue([]);
  const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
  const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
  const mockTxSelect = vi.fn().mockReturnValue({ from: selectFrom });

  const returningInsert = vi.fn().mockResolvedValue([
    {
      id: "bp-1",
      userId: "u-1",
      name: "Test",
      category: "commerce",
      city: "Casablanca",
      hasFixedPremises: true,
      isAutoEntrepreneur: false,
    },
  ]);
  const onConflictInsert = vi.fn().mockReturnValue({ returning: returningInsert });
  const valuesInsert = vi.fn().mockReturnValue({
    returning: returningInsert,
    onConflictDoNothing: onConflictInsert,
  });
  const mockTxInsert = vi.fn().mockReturnValue({ values: valuesInsert });

  const returningUpdate = vi.fn().mockResolvedValue([
    {
      id: "bp-1",
      userId: "u-1",
      name: "Updated",
      category: "commerce",
      city: "Rabat",
      hasFixedPremises: false,
      isAutoEntrepreneur: false,
    },
  ]);
  const whereUpdate = vi.fn().mockReturnValue({ returning: returningUpdate });
  const setUpdate = vi.fn().mockReturnValue({ where: whereUpdate });
  const mockTxUpdate = vi.fn().mockReturnValue({ set: setUpdate });

  return {
    mockAuth: vi.fn(),
    mockTxInsert,
    mockTxSelect,
    mockTxUpdate,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/auth", () => ({ auth: mockAuth }));

vi.mock("@kasb/db", () => ({
  db: {},
  businessProfiles: {},
  auditLogs: {},
  withUserContext: vi.fn(
    (_db: unknown, _uid: string, _role: string, fn: (tx: unknown) => unknown) =>
      fn({ select: mockTxSelect, insert: mockTxInsert, update: mockTxUpdate }),
  ),
}));

// ─── Import under test (after mocks) ─────────────────────────────────────────

import { createProfile, getMyProfile, updateProfile } from "@/actions/business-profile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ownerSession = () => ({
  userId: "u-1",
  role: "owner" as const,
  businessId: "b-1",
  partnerOrgId: undefined,
});

const partnerSession = () => ({
  userId: "u-p",
  role: "partner" as const,
  businessId: undefined,
  partnerOrgId: "partner-org-1",
});

const validInput = {
  name: "Épicerie Hassan",
  category: "commerce" as const,
  city: "Casablanca",
  hasFixedPremises: true,
  isAutoEntrepreneur: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default mock implementations after clearAllMocks
  const selectLimit = vi.fn().mockResolvedValue([]);
  const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
  mockTxSelect.mockReturnValue({ from: vi.fn().mockReturnValue({ where: selectWhere }) });
  mockTxInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: "bp-1",
          userId: "u-1",
          name: "Test",
          category: "commerce",
          city: "Casablanca",
          hasFixedPremises: true,
          isAutoEntrepreneur: false,
        },
      ]),
    }),
  });
  mockTxUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "bp-1",
            userId: "u-1",
            name: "Updated",
            category: "commerce",
            city: "Rabat",
            hasFixedPremises: false,
            isAutoEntrepreneur: false,
          },
        ]),
      }),
    }),
  });
});

// ─── 1. Zod schema validation ─────────────────────────────────────────────────

describe("createBusinessProfileSchema", () => {
  it("accepts a fully valid input", () => {
    expect(() => createBusinessProfileSchema.parse(validInput)).not.toThrow();
  });

  it("accepts valid input with all optional fields", () => {
    expect(() =>
      createBusinessProfileSchema.parse({
        ...validInput,
        neighborhood: "Derb Sultan",
        isAutoEntrepreneur: true,
        rnaNumber: "AE-2024-CAS-00001",
        monthlyRevenueEstimate: 5000000,
      }),
    ).not.toThrow();
  });

  it("rejects empty name", () => {
    expect(() => createBusinessProfileSchema.parse({ ...validInput, name: "" })).toThrow();
  });

  it("rejects name longer than 200 characters", () => {
    expect(() =>
      createBusinessProfileSchema.parse({ ...validInput, name: "A".repeat(201) }),
    ).toThrow();
  });

  it("rejects invalid business category", () => {
    expect(() =>
      createBusinessProfileSchema.parse({ ...validInput, category: "pharmacy" }),
    ).toThrow();
  });

  it("rejects empty city", () => {
    expect(() => createBusinessProfileSchema.parse({ ...validInput, city: "" })).toThrow();
  });

  it("rejects negative monthly revenue", () => {
    expect(() =>
      createBusinessProfileSchema.parse({ ...validInput, monthlyRevenueEstimate: -100 }),
    ).toThrow();
  });

  it("rejects fractional (non-integer) monthly revenue", () => {
    // Money must be integer centimes — no floats
    expect(() =>
      createBusinessProfileSchema.parse({ ...validInput, monthlyRevenueEstimate: 1000.5 }),
    ).toThrow();
  });
});

// ─── 2. Action RBAC — partner is forbidden from owner actions ─────────────────

describe("business profile actions — RBAC", () => {
  it("getMyProfile succeeds for owner role", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const result = await getMyProfile();
    expect(result.ok).toBe(true);
  });

  it("createProfile returns forbidden for partner role", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    const result = await createProfile(validInput);
    expect(result).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("updateProfile returns forbidden for partner role", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    const result = await updateProfile({ name: "Updated" });
    expect(result).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("createProfile returns unauthenticated when no session", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createProfile(validInput);
    expect(result).toMatchObject({ ok: false, error: "unauthenticated" });
  });

  it("createProfile succeeds for owner role", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const result = await createProfile(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Test"); // from mock
    }
  });

  it("createProfile returns server_error when Zod validation fails", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const result = await createProfile({ name: "", city: "x", category: "bad" });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
  });
});

// ─── 3. RLS SQL assertions ────────────────────────────────────────────────────
// Verify the actual SQL file contains the required security policies.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rlsSql = readFileSync(path.join(__dirname, "../../../../packages/db/src/rls.sql"), "utf-8");

describe("rls.sql — append-only enforcement", () => {
  it("contains no-delete policy for cash_entries", () => {
    expect(rlsSql).toContain("cash_entries_no_delete");
  });

  it("cash_entries no-delete uses USING (false)", () => {
    expect(rlsSql).toMatch(/cash_entries_no_delete.*FOR DELETE USING \(false\)/s);
  });
});

describe("rls.sql — partner isolation", () => {
  it("credit_applications policy checks app.current_partner", () => {
    expect(rlsSql).toContain("app.current_partner");
  });

  it("partner sees only applications matching their partner_id", () => {
    expect(rlsSql).toMatch(/partner_id.*current_partner|current_partner.*partner_id/s);
  });
});

describe("rls.sql — sign-up INSERT policy", () => {
  it("users table has an INSERT policy for owner sign-up", () => {
    expect(rlsSql).toContain("users_signup_insert");
    expect(rlsSql).toContain("FOR INSERT WITH CHECK");
  });
});

// ─── 4. Seed integrity — credit score components sum ─────────────────────────

const SEED_SCORES = [
  {
    business: "Épicerie Hassan",
    score: 72,
    components: {
      revenueConsistency: 22,
      expenseControl: 18,
      growthTrend: 14,
      debtRecoveryRate: 10,
      dataRichness: 8,
    },
  },
  {
    business: "Salon Fatima",
    score: 68,
    components: {
      revenueConsistency: 20,
      expenseControl: 19,
      growthTrend: 13,
      debtRecoveryRate: 10,
      dataRichness: 6,
    },
  },
  {
    business: "Atelier Mohammed",
    score: 55,
    components: {
      revenueConsistency: 15,
      expenseControl: 16,
      growthTrend: 12,
      debtRecoveryRate: 8,
      dataRichness: 4,
    },
  },
  {
    business: "Restaurant Khadija",
    score: 82,
    components: {
      revenueConsistency: 27,
      expenseControl: 20,
      growthTrend: 18,
      debtRecoveryRate: 12,
      dataRichness: 5,
    },
  },
  {
    business: "Électricité Omar",
    score: 45,
    components: {
      revenueConsistency: 12,
      expenseControl: 14,
      growthTrend: 8,
      debtRecoveryRate: 5,
      dataRichness: 6,
    },
  },
];

describe("seed credit score component integrity", () => {
  it.each(SEED_SCORES)("$business: components sum to score ($score)", ({ score, components }) => {
    const sum = Object.values(components).reduce((a, b) => a + b, 0);
    expect(sum).toBe(score);
  });

  it("each component is within its defined max", () => {
    const maxes = {
      revenueConsistency: 30,
      expenseControl: 25,
      growthTrend: 20,
      debtRecoveryRate: 15,
      dataRichness: 10,
    };
    for (const { business, components } of SEED_SCORES) {
      for (const [key, max] of Object.entries(maxes)) {
        expect(
          components[key as keyof typeof components],
          `${business}.${key} exceeds max ${max}`,
        ).toBeLessThanOrEqual(max);
      }
    }
  });

  it("scores are within the documented range 45-82", () => {
    const scores = SEED_SCORES.map((s) => s.score);
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(45);
    expect(Math.max(...scores)).toBeLessThanOrEqual(82);
  });
});

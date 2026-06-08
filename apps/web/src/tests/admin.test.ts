/**
 * Coverage for actions/admin.ts — getAdminKPIs
 *
 *  1. admin role — returns KPI object with correct shape
 *  2. owner role — forbidden
 *  3. partner role — forbidden
 *  4. zero data — all KPIs are 0 / 0%
 *  5. DAU = distinct businesses with entries today
 *  6. formalizationRate = 0 when no AE businesses
 *  7. formalizationRate = 100 when all businesses are AE
 *  8. avgEntriesPerDay30d = Math.round(count/30)
 *  9. creditApps breakdown — approved/rejected counts respected
 * 10. aeRegistered — reflects completed AE registrations count
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAuth, mockDbSelect, mockWithUserContext } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDbSelect: vi.fn(),
  mockWithUserContext: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@kasb/db", () => ({
  db: { select: mockDbSelect },
  aeRegistrationProgress: {},
  businessProfiles: {},
  cashEntries: {},
  creditApplications: {},
  creditScores: {},
  microfinancePartners: {},
  users: {},
  withUserContext: mockWithUserContext,
}));

import { getAdminKPIs } from "@/actions/admin";

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  userId: "aaaaaaaa-1001-4000-8000-000000000001",
  role: "admin" as const,
  businessId: undefined,
  partnerOrgId: undefined,
};

const OWNER_SESSION = { ...ADMIN_SESSION, role: "owner" as const };
const PARTNER_SESSION = { ...ADMIN_SESSION, role: "partner" as const };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Stub all 9 parallel queries in getAdminKPIs.
 * Builds a real Promise.resolve(rows) with from/where/innerJoin methods attached.
 * Since the base IS a Promise, awaiting at any chain depth returns rows correctly.
 */
function setupParallelQueries(rowsPerCall: unknown[][]) {
  let call = 0;
  mockDbSelect.mockImplementation(() => {
    const rows = rowsPerCall[call] ?? [];
    call++;
    function makeChain(data: unknown[]) {
      const p = Object.assign(Promise.resolve(data), {
        from: vi.fn().mockImplementation(() => makeChain(data)),
        where: vi.fn().mockImplementation(() => makeChain(data)),
        innerJoin: vi.fn().mockImplementation(() => makeChain(data)),
      });
      return p;
    }
    return makeChain(rows);
  });
}

describe("getAdminKPIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // withUserContext must execute the wrapped function — admin uses db directly (not ctx.tx)
    mockWithUserContext.mockImplementation(
      (_db: unknown, _uid: string, _role: string, fn: () => unknown) => fn(),
    );
  });

  it("2. owner role → forbidden", async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION);
    const result = await getAdminKPIs();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("forbidden");
  });

  it("3. partner role → forbidden", async () => {
    mockAuth.mockResolvedValue(PARTNER_SESSION);
    const result = await getAdminKPIs();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("forbidden");
  });

  it("1. admin role — returns KPI object with correct shape", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    // 9 parallel queries: dau, mau, totalBiz, entriesToday, entries30d, scores, apps, aeBiz, aeCompleted
    setupParallelQueries([
      [{ count: 5 }], // dau
      [{ count: 42 }], // mau
      [{ count: 10 }], // totalBiz
      [{ count: 12 }], // entriesToday
      [{ count: 300 }], // entries30d
      [{ count: 7 }], // scores
      [{ total: 4, submitted: 1, reviewing: 1, approved: 1, rejected: 1 }], // apps
      [{ count: 3 }], // aeBiz
      [{ count: 2 }], // aeCompleted
    ]);

    const result = await getAdminKPIs();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const k = result.data;
    expect(k.dau).toBe(5);
    expect(k.mau).toBe(42);
    expect(k.totalBusinesses).toBe(10);
    expect(k.entriesToday).toBe(12);
    expect(k.avgEntriesPerDay30d).toBe(10); // 300/30
    expect(k.scoresComputed).toBe(7);
    expect(k.creditApps.total).toBe(4);
    expect(k.creditApps.approved).toBe(1);
    expect(k.formalizationRate).toBe(30); // 3/10 * 100
    expect(k.aeRegistered).toBe(2);
  });

  it("4. zero data — all KPIs are 0 / 0%", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    setupParallelQueries([
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ total: 0, submitted: 0, reviewing: 0, approved: 0, rejected: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
    ]);

    const result = await getAdminKPIs();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.dau).toBe(0);
    expect(result.data.formalizationRate).toBe(0);
    expect(result.data.creditApps.total).toBe(0);
  });

  it("5. DAU reflects distinct businesses with entries today", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    setupParallelQueries([
      [{ count: 15 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ total: 0, submitted: 0, reviewing: 0, approved: 0, rejected: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
    ]);
    const result = await getAdminKPIs();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.dau).toBe(15);
  });

  it("8. avgEntriesPerDay30d = Math.round(entries30d / 30)", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    setupParallelQueries([
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 91 }],
      [{ count: 0 }], // 91/30 = 3.03 → rounds to 3
      [{ total: 0, submitted: 0, reviewing: 0, approved: 0, rejected: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
    ]);
    const result = await getAdminKPIs();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.avgEntriesPerDay30d).toBe(3);
  });

  it("7. formalizationRate = 100 when all businesses are AE", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    setupParallelQueries([
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 5 }], // totalBiz = 5
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ total: 0, submitted: 0, reviewing: 0, approved: 0, rejected: 0 }],
      [{ count: 5 }], // aeBiz = 5 (100%)
      [{ count: 0 }],
    ]);
    const result = await getAdminKPIs();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.formalizationRate).toBe(100);
  });

  it("9. creditApps breakdown — all statuses reflected", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    setupParallelQueries([
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ total: 10, submitted: 3, reviewing: 2, approved: 4, rejected: 1 }],
      [{ count: 0 }],
      [{ count: 0 }],
    ]);
    const result = await getAdminKPIs();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.creditApps).toMatchObject({
      total: 10,
      submitted: 3,
      reviewing: 2,
      approved: 4,
      rejected: 1,
    });
  });
});

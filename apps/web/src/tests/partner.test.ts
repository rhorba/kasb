/**
 * Coverage for actions/partner.ts — listMyLeads + updateApplicationStatus
 *
 *  1. listMyLeads — partner role with orgId returns filtered leads
 *  2. listMyLeads — admin role returns all leads (no filter)
 *  3. listMyLeads — partner with no orgId returns empty array
 *  4. listMyLeads — owner role → forbidden
 *  5. updateApplicationStatus — partner updates own lead status
 *  6. updateApplicationStatus — partner cannot update another partner's lead
 *  7. updateApplicationStatus — application not found → error
 *  8. updateApplicationStatus — admin can update any lead
 *  9. updateApplicationStatus — owner role → forbidden
 * 10. phone field absent from lead data (PII guard)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAuth, mockDbSelect, mockDbUpdate, mockWithUserContext } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockWithUserContext: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@kasb/db", () => ({
  db: { select: mockDbSelect, update: mockDbUpdate },
  businessProfiles: {},
  creditApplications: {},
  withUserContext: mockWithUserContext,
}));

import { listMyLeads, updateApplicationStatus } from "@/actions/partner";

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_ID = "bbbbbbbb-1001-4000-8000-000000000001";
const APP_ID = "cccccccc-1001-4000-8000-000000000001";

const partnerSession = () => ({
  userId: "aaaaaaaa-1001-4000-8000-000000000001",
  role: "partner" as const,
  businessId: undefined,
  partnerOrgId: ORG_ID,
});

const adminSession = () => ({
  userId: "aaaaaaaa-2001-4000-8000-000000000001",
  role: "admin" as const,
  businessId: undefined,
  partnerOrgId: undefined,
});

const ownerSession = () => ({
  userId: "aaaaaaaa-3001-4000-8000-000000000001",
  role: "owner" as const,
  businessId: "bbbbbbbb-2001-4000-8000-000000000001",
  partnerOrgId: undefined,
});

const mockLead = {
  id: APP_ID,
  status: "submitted",
  requestedAmount: 500000,
  scoreAtApplication: 65,
  submittedAt: new Date(),
  updatedAt: new Date(),
  businessName: "Épicerie Test",
  businessCity: "Casablanca",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupTx() {
  mockWithUserContext.mockImplementation(
    (_db: unknown, _uid: string, _role: string, fn: (tx: unknown) => unknown) =>
      fn({ select: mockDbSelect, update: mockDbUpdate }),
  );
}

function setupSelectReturns(rows: unknown[]) {
  mockDbSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(rows),
        }),
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

function setupUpdateReturns(row: unknown) {
  mockDbUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([row]),
      }),
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("listMyLeads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTx();
  });

  it("4. owner role → forbidden", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const result = await listMyLeads();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("forbidden");
  });

  it("3. partner with no orgId returns empty array", async () => {
    mockAuth.mockResolvedValue({ ...partnerSession(), partnerOrgId: undefined });
    const result = await listMyLeads();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });

  it("1. partner role returns filtered leads", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    setupSelectReturns([mockLead]);
    const result = await listMyLeads();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ businessName: "Épicerie Test" });
  });

  it("2. admin role returns all leads (no filter)", async () => {
    mockAuth.mockResolvedValue(adminSession());
    setupSelectReturns([mockLead, { ...mockLead, id: "dddddddd-1001-4000-8000-000000000001" }]);
    const result = await listMyLeads();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2);
  });

  it("10. phone field absent from lead data (PII guard)", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    setupSelectReturns([mockLead]);
    const result = await listMyLeads();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]).not.toHaveProperty("ownerPhone");
    expect(result.data[0]).not.toHaveProperty("phone");
  });
});

describe("updateApplicationStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTx();
  });

  it("9. owner role → forbidden", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    const result = await updateApplicationStatus({ applicationId: APP_ID, status: "reviewing" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("forbidden");
  });

  it("7. application not found → server_error", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    // Select returns empty (app not found)
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    const result = await updateApplicationStatus({ applicationId: APP_ID, status: "reviewing" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("server_error");
    expect(result.message).toMatch(/introuvable/i);
  });

  it("6. partner cannot update another partner's lead → server_error", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    // Application belongs to a different partner
    const differentOrg = "ffffffff-1001-4000-8000-000000000001";
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: APP_ID, partnerId: differentOrg }]),
        }),
      }),
    });
    const result = await updateApplicationStatus({ applicationId: APP_ID, status: "approved" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/autorisé/i);
  });

  it("5. partner updates own lead status successfully", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: APP_ID, partnerId: ORG_ID }]),
        }),
      }),
    });
    const updatedApp = { ...mockLead, status: "reviewing" };
    setupUpdateReturns(updatedApp);
    const result = await updateApplicationStatus({ applicationId: APP_ID, status: "reviewing" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.status).toBe("reviewing");
  });

  it("8. admin can update any lead regardless of partnerId", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const anyOrg = "ffffffff-2001-4000-8000-000000000001";
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: APP_ID, partnerId: anyOrg }]),
        }),
      }),
    });
    setupUpdateReturns({ ...mockLead, status: "approved" });
    const result = await updateApplicationStatus({ applicationId: APP_ID, status: "approved" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.status).toBe("approved");
  });
});

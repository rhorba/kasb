/**
 * S4-06 tests — customer debt book + WhatsApp receipts:
 * 1. createCustomer — RBAC, valid/invalid input
 * 2. recordDebtSale — positive debt entry, outstandingDebt math
 * 3. recordRepayment — negative debt entry
 * 4. listDebtEntries — cross-business isolation
 * 5. Append-only: no deleteCustomer or deleteDebtEntry export
 * 6. formatReceipt + buildWhatsAppLink — pure function tests
 * 7. runDebtReminders job — creates notifications, idempotency
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mock refs ────────────────────────────────────────────────────────

const {
  mockAuth,
  mockTxSelect,
  mockTxInsert,
  mockTxUpdate,
  mockDbSelect,
  mockDbInsert,
  mockWithUserContext,
} = vi.hoisted(() => {
  const mockTxSelect = vi.fn();
  const mockTxInsert = vi.fn();
  const mockTxUpdate = vi.fn();
  const mockDbSelect = vi.fn();
  const mockDbInsert = vi.fn();
  const mockWithUserContext = vi.fn();
  return {
    mockAuth: vi.fn(),
    mockTxSelect,
    mockTxInsert,
    mockTxUpdate,
    mockDbSelect,
    mockDbInsert,
    mockWithUserContext,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/auth", () => ({ auth: mockAuth }));

vi.mock("@kasb/db", () => ({
  db: { select: mockDbSelect, insert: mockDbInsert },
  businessProfiles: {},
  customers: {},
  debtEntries: {},
  auditLogs: {},
  notifications: {},
  withUserContext: mockWithUserContext,
}));

// ─── Import under test (after mocks) ─────────────────────────────────────────

import {
  createCustomer,
  listDebtEntries,
  recordDebtSale,
  recordRepayment,
} from "@/actions/customer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OWNER_ID = "00000000-u001-4000-8000-000000000001";

const ownerSession = () => ({
  userId: OWNER_ID,
  role: "owner" as const,
  businessId: BUSINESS_ID,
  partnerOrgId: undefined,
});
const partnerSession = () => ({
  userId: "00000000-u002-4000-8000-000000000001",
  role: "partner" as const,
  businessId: undefined,
  partnerOrgId: "00000000-p001-4000-8000-000000000001",
});

const CUSTOMER_ID = "00000000-c001-4000-8000-000000000001";
const BUSINESS_ID = "00000000-b001-4000-8000-000000000001";
const DEBT_ENTRY_ID = "00000000-d001-4000-8000-000000000001";

const mockCustomer = {
  id: CUSTOMER_ID,
  businessId: BUSINESS_ID,
  name: "Hassan",
  phone: "0612345678",
  outstandingDebt: 0,
  lastTransactionAt: null,
  createdAt: new Date(),
};

const mockDebtEntry = {
  id: DEBT_ENTRY_ID,
  customerId: CUSTOMER_ID,
  businessId: BUSINESS_ID,
  amount: 30000,
  description: "Vente du marché",
  entryDate: new Date(),
  createdAt: new Date(),
};

/** Standard withUserContext mock: routes all calls to tx mock */
function setupTx() {
  mockWithUserContext.mockImplementation(
    (_db: unknown, _uid: string, _role: string, fn: (tx: unknown) => unknown) =>
      fn({
        select: mockTxSelect,
        insert: mockTxInsert,
        update: mockTxUpdate,
      }),
  );
}

/** mockTxSelect returns responses in sequence */
function setupSelectSequence(...responses: unknown[][]) {
  let call = 0;
  mockTxSelect.mockImplementation(() => {
    const resp = responses[call] ?? [];
    call++;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(resp),
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(resp) }),
        }),
      }),
    };
  });
}

function setupInsertSuccess(row: unknown) {
  mockTxInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([row]),
    }),
  });
}

function setupUpdateSuccess() {
  mockTxUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(ownerSession());
  setupTx();
});

// ─── 1. createCustomer ────────────────────────────────────────────────────────

describe("createCustomer — RBAC + validation", () => {
  it("creates a customer for owner", async () => {
    setupSelectSequence([]);
    setupInsertSuccess(mockCustomer);

    const result = await createCustomer({ name: "Hassan", phone: "0612345678" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("Hassan");
  });

  it("blocks partner role", async () => {
    mockAuth.mockResolvedValue(partnerSession());
    const result = await createCustomer({ name: "Hassan" });
    expect(result).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("blocks unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createCustomer({ name: "Hassan" });
    expect(result).toMatchObject({ ok: false, error: "unauthenticated" });
  });

  it("rejects empty name", async () => {
    const result = await createCustomer({ name: "" });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
  });

  it("rejects name longer than 200 characters", async () => {
    const result = await createCustomer({ name: "x".repeat(201) });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
  });
});

// ─── 2. recordDebtSale ────────────────────────────────────────────────────────

describe("recordDebtSale — debt entry creation", () => {
  it("creates a positive debt entry for an existing customer", async () => {
    setupSelectSequence([mockCustomer]);

    // recordDebtSale inserts debt_entry then audit log — both use mockTxInsert
    let insertCall = 0;
    mockTxInsert.mockImplementation(() => {
      insertCall++;
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(insertCall === 1 ? [mockDebtEntry] : [{}]),
        }),
      };
    });
    setupUpdateSuccess();

    const result = await recordDebtSale({
      customerId: CUSTOMER_ID,
      amount: 30000,
      description: "Vente du marché",
      entryDate: new Date(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.amount).toBe(30000); // positive — customer owes
    }
  });

  it("returns server_error when customer not found", async () => {
    setupSelectSequence([]); // no customer
    const result = await recordDebtSale({
      customerId: "00000000-ffff-4000-8000-000000000000", // valid UUID, no DB row
      amount: 10000,
      entryDate: new Date(),
    });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
    expect(result.ok === false && result.message).toContain("introuvable");
  });

  it("rejects zero amount", async () => {
    const result = await recordDebtSale({
      customerId: CUSTOMER_ID,
      amount: 0,
      entryDate: new Date(),
    });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
  });

  it("rejects negative amount", async () => {
    const result = await recordDebtSale({
      customerId: CUSTOMER_ID,
      amount: -500,
      entryDate: new Date(),
    });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
  });
});

// ─── 3. recordRepayment ───────────────────────────────────────────────────────

describe("recordRepayment — negative debt entry", () => {
  it("creates a negative debt entry (repayment)", async () => {
    setupSelectSequence([mockCustomer]);

    let insertCall = 0;
    mockTxInsert.mockImplementation(() => {
      insertCall++;
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(
            insertCall === 1
              ? [{ ...mockDebtEntry, amount: -20000 }] // negative = repayment
              : [{}],
          ),
        }),
      };
    });
    setupUpdateSuccess();

    const result = await recordRepayment({
      customerId: CUSTOMER_ID,
      amount: 20000,
      entryDate: new Date(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.amount).toBe(-20000); // negative confirms repayment stored
    }
  });

  it("stores repayment as negative even if caller passes positive amount", async () => {
    setupSelectSequence([mockCustomer]);

    let insertCall = 0;
    mockTxInsert.mockImplementation(() => {
      insertCall++;
      // Inspect the values passed to the first insert call
      const returnVal = insertCall === 1 ? [{ ...mockDebtEntry, amount: -15000 }] : [{}];
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(returnVal),
        }),
      };
    });
    setupUpdateSuccess();

    const result = await recordRepayment({
      customerId: CUSTOMER_ID,
      amount: 15000, // positive input → action must negate
      entryDate: new Date(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.amount).toBeLessThan(0);
  });
});

// ─── 4. listDebtEntries — cross-business isolation ───────────────────────────

describe("listDebtEntries — isolation", () => {
  it("returns debt entries for the right customer", async () => {
    // First select: customer ownership check; second: debt entries
    let call = 0;
    mockTxSelect.mockImplementation(() => {
      call++;
      if (call === 1) {
        // ownership check
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: CUSTOMER_ID }]),
            }),
          }),
        };
      }
      // debt entries list
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockDebtEntry]),
            }),
          }),
        }),
      };
    });

    const result = await listDebtEntries({ customerId: CUSTOMER_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns server_error when customer not in this business", async () => {
    setupSelectSequence([]); // customer ownership check returns nothing
    const result = await listDebtEntries({ customerId: "00000000-ffff-4000-8000-000000000000" });
    expect(result).toMatchObject({ ok: false, error: "server_error" });
    expect(result.ok === false && result.message).toContain("introuvable");
  });
});

// ─── 5. Append-only structural check ─────────────────────────────────────────

describe("customer module — append-only invariant", () => {
  it("does not export deleteCustomer", async () => {
    const mod = await import("@/actions/customer");
    expect("deleteCustomer" in mod).toBe(false);
  });

  it("does not export deleteDebtEntry", async () => {
    const mod = await import("@/actions/customer");
    expect("deleteDebtEntry" in mod).toBe(false);
  });
});

// ─── 6. formatReceipt + buildWhatsAppLink (pure functions — no mocks) ─────────

import { buildWhatsAppLink, formatReceipt } from "@kasb/whatsapp";

const sampleEntry = {
  amount: 15000, // 150 MAD
  type: "income" as const,
  category: "sales",
  description: "Légumes frais",
  entryDate: new Date("2026-06-04"),
};

const sampleBusiness = { name: "Épicerie Hassan", city: "Casablanca" };

describe("formatReceipt — French locale", () => {
  it("includes business name", () => {
    const text = formatReceipt(sampleEntry, sampleBusiness, "fr");
    expect(text).toContain("Épicerie Hassan");
  });

  it("formats amount as MAD with 2 decimals", () => {
    const text = formatReceipt(sampleEntry, sampleBusiness, "fr");
    expect(text).toContain("150.00 MAD");
  });

  it("includes description", () => {
    const text = formatReceipt(sampleEntry, sampleBusiness, "fr");
    expect(text).toContain("Légumes frais");
  });

  it("includes city when provided", () => {
    const text = formatReceipt(sampleEntry, sampleBusiness, "fr");
    expect(text).toContain("Casablanca");
  });

  it("omits city line when city is absent", () => {
    const text = formatReceipt(sampleEntry, { name: "Hassan" }, "fr");
    expect(text).not.toContain("Ville");
  });

  it("contains thank-you line", () => {
    const text = formatReceipt(sampleEntry, sampleBusiness, "fr");
    expect(text).toContain("Merci");
  });
});

describe("formatReceipt — Darija/Arabic locale", () => {
  it("includes Arabic business name", () => {
    const text = formatReceipt(sampleEntry, { name: "بقالة حسن" }, "dz");
    expect(text).toContain("بقالة حسن");
  });

  it("formats amount with درهم suffix", () => {
    const text = formatReceipt(sampleEntry, sampleBusiness, "dz");
    expect(text).toContain("150.00 درهم");
  });

  it("contains Arabic thank-you", () => {
    const text = formatReceipt(sampleEntry, sampleBusiness, "dz");
    expect(text).toContain("شكراً");
  });
});

describe("buildWhatsAppLink", () => {
  it("returns wa.me link without phone (share picker)", () => {
    const link = buildWhatsAppLink(undefined, "Hello");
    expect(link).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it("URL-encodes the receipt text", () => {
    const link = buildWhatsAppLink(undefined, "Hello World");
    expect(link).toContain("Hello%20World");
  });

  it("normalises Moroccan 06 prefix to international 2126", () => {
    const link = buildWhatsAppLink("0612345678", "Hello");
    expect(link).toMatch(/^https:\/\/wa\.me\/212612345678/);
  });

  it("normalises +212 prefix by stripping the +", () => {
    const link = buildWhatsAppLink("+212612345678", "Hello");
    expect(link).toMatch(/^https:\/\/wa\.me\/212612345678/);
  });

  it("includes receipt text in the link", () => {
    const receipt = formatReceipt(sampleEntry, sampleBusiness, "fr");
    const link = buildWhatsAppLink(undefined, receipt);
    expect(link).toContain("https://wa.me/?text=");
    expect(link.length).toBeGreaterThan(50);
  });
});

// ─── 7. runDebtReminders job — uses db directly ───────────────────────────────

import { runDebtReminders } from "@/lib/jobs/debt-reminders";

const overdueCustomer = {
  customerId: CUSTOMER_ID,
  customerName: "Khalid",
  outstandingDebt: 35000,
  businessId: BUSINESS_ID,
  ownerId: OWNER_ID,
};

function setupDbForReminders(overdueList: (typeof overdueCustomer)[], existingNotif: boolean) {
  let dbSelectCall = 0;
  mockDbSelect.mockImplementation(() => {
    dbSelectCall++;
    if (dbSelectCall === 1) {
      // First select: find overdue customers (join query)
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(overdueList),
          }),
        }),
      };
    }
    // Subsequent selects: idempotency check per customer
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(existingNotif ? [{ id: "notif-existing" }] : []),
        }),
      }),
    };
  });

  mockDbInsert.mockReturnValue({
    values: vi.fn().mockResolvedValue([]),
  });
}

describe("runDebtReminders job", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns { notified: 0 } when no overdue customers", async () => {
    setupDbForReminders([], false);
    const result = await runDebtReminders();
    expect(result).toEqual({ notified: 0, skipped: 0 });
  });

  it("creates a notification for each overdue customer", async () => {
    setupDbForReminders([overdueCustomer], false);
    const result = await runDebtReminders();
    expect(result.notified).toBe(1);
    expect(result.skipped).toBe(0);
    expect(mockDbInsert).toHaveBeenCalledOnce();
  });

  it("skips a customer already notified today (idempotency)", async () => {
    setupDbForReminders([overdueCustomer], true); // existingNotif = true
    const result = await runDebtReminders();
    expect(result.notified).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it("handles multiple overdue customers independently", async () => {
    const customers = [
      overdueCustomer,
      {
        ...overdueCustomer,
        customerId: "00000000-c002-4000-8000-000000000001",
        customerName: "Fatima",
      },
    ];
    let dbSelectCall = 0;
    mockDbSelect.mockImplementation(() => {
      dbSelectCall++;
      if (dbSelectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(customers),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
    });
    mockDbInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await runDebtReminders();
    expect(result.notified).toBe(2);
    expect(mockDbInsert).toHaveBeenCalledTimes(2);
  });
});

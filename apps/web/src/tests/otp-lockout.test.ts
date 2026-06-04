/**
 * OTP lockout and verification tests.
 *
 * All DB and OTP-hash calls are mocked. This validates the lockout logic in
 * verifyOtpAndGetUser (MAX_ATTEMPTS = 3) without requiring a live database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock references (must exist before vi.mock factory calls)
// ---------------------------------------------------------------------------
const { mockSelect, mockLimit, mockUpdate, mockInsert, mockVerifyOtpCode } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockSelectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: mockLimit,
  };

  const mockUpdateWhere = vi.fn().mockResolvedValue([]);
  const mockUpdateChain = {
    set: vi.fn().mockReturnValue({ where: mockUpdateWhere }),
  };

  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockInsertChain = {
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue({ returning: mockReturning }),
    }),
  };

  return {
    mockSelect: vi.fn().mockReturnValue(mockSelectChain),
    mockLimit,
    mockUpdate: vi.fn().mockReturnValue(mockUpdateChain),
    mockInsert: vi.fn().mockReturnValue(mockInsertChain),
    mockVerifyOtpCode: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  gt: vi.fn(),
  count: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("@kasb/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
  otpCodes: {},
  users: {},
  businessProfiles: {},
}));

vi.mock("@/lib/otp", () => ({
  hashOtpCode: vi.fn().mockResolvedValue("$argon2id$hash"),
  verifyOtpCode: mockVerifyOtpCode,
  generateOtp: vi.fn().mockReturnValue("123456"),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are declared)
// ---------------------------------------------------------------------------
import { verifyOtpAndGetUser } from "@/lib/otp-db";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const PHONE = "+212600000001";
const VALID_CODE = "123456";

const makeOtpRecord = (overrides?: Partial<{ attempts: number; used: boolean }>) => ({
  id: "otp-1",
  phone: PHONE,
  codeHash: "$argon2id$hash",
  attempts: 0,
  used: false,
  expiresAt: new Date(Date.now() + 300_000),
  createdAt: new Date(),
  ...overrides,
});

const makeUser = () => [{ id: "user-1", role: "owner" as const }];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("verifyOtpAndGetUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default chain stubs after clearAllMocks
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: mockLimit,
    });
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
  });

  it("returns null when no active OTP record exists (expired or already used)", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const result = await verifyOtpAndGetUser(PHONE, VALID_CODE);
    expect(result).toBeNull();
  });

  it("returns null and enforces lockout after MAX_ATTEMPTS (3) failed attempts", async () => {
    mockLimit.mockResolvedValueOnce([makeOtpRecord({ attempts: 3 })]);

    const result = await verifyOtpAndGetUser(PHONE, VALID_CODE);

    expect(result).toBeNull();
    // Must NOT call verifyOtpCode — lockout is checked before hash work
    expect(mockVerifyOtpCode).not.toHaveBeenCalled();
  });

  it("returns null when code is wrong (invalid hash)", async () => {
    mockLimit.mockResolvedValueOnce([makeOtpRecord({ attempts: 0 })]);
    mockVerifyOtpCode.mockResolvedValueOnce(false);

    const result = await verifyOtpAndGetUser(PHONE, "000000");

    expect(result).toBeNull();
    expect(mockVerifyOtpCode).toHaveBeenCalledOnce();
  });

  it("lockout at exactly 3 attempts (boundary: attempt 2 is last allowed verify)", async () => {
    // attempts = 2 → still under MAX_ATTEMPTS (3), so we reach verifyOtpCode
    mockLimit.mockResolvedValueOnce([makeOtpRecord({ attempts: 2 })]);
    mockVerifyOtpCode.mockResolvedValueOnce(false);

    const result = await verifyOtpAndGetUser(PHONE, "000000");
    expect(result).toBeNull();
    expect(mockVerifyOtpCode).toHaveBeenCalledOnce();
  });

  it("returns user payload on valid code (first-time login, no profile)", async () => {
    // First limit() call → OTP record; second → no business profile
    mockLimit.mockResolvedValueOnce([makeOtpRecord()]).mockResolvedValueOnce([]);
    mockVerifyOtpCode.mockResolvedValueOnce(true);
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(makeUser()),
        }),
      }),
    });

    const result = await verifyOtpAndGetUser(PHONE, VALID_CODE);

    expect(result).toEqual({ id: "user-1", role: "owner", businessId: undefined });
  });

  it("returns user payload with businessId when profile exists", async () => {
    mockLimit.mockResolvedValueOnce([makeOtpRecord()]).mockResolvedValueOnce([{ id: "biz-1" }]);
    mockVerifyOtpCode.mockResolvedValueOnce(true);
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(makeUser()),
        }),
      }),
    });

    const result = await verifyOtpAndGetUser(PHONE, VALID_CODE);

    expect(result).toEqual({ id: "user-1", role: "owner", businessId: "biz-1" });
  });
});

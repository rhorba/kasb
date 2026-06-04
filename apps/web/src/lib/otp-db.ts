import type { Role } from "@kasb/core";
import { businessProfiles, db, otpCodes, users } from "@kasb/db";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { hashOtpCode, verifyOtpCode } from "./otp";

const MAX_ATTEMPTS = 3;
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3; // max OTP sends per phone per hour

/** True if this phone may request another OTP (under the hourly rate limit). */
export async function checkRateLimit(phone: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const [row] = await db
    .select({ n: count() })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, windowStart)));

  return (row?.n ?? 0) < RATE_LIMIT_MAX;
}

/** Hash the OTP and persist it; supersedes all previous unused codes for this phone. */
export async function storeOtp(phone: string, code: string): Promise<void> {
  const codeHash = await hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Invalidate any still-active codes — one active OTP per phone at a time
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(and(eq(otpCodes.phone, phone), eq(otpCodes.used, false)));

  await db.insert(otpCodes).values({ phone, codeHash, expiresAt });
}

type AuthUser = { id: string; role: Role; businessId: string | undefined };

/**
 * Verifies the OTP code against the stored Argon2id hash.
 *
 * Security properties:
 * - Attempt counter incremented BEFORE hash verification (prevents timing attacks)
 * - Locked after MAX_ATTEMPTS regardless of timing
 * - Expired and used codes are rejected before any work is done
 *
 * On success: upserts the user (phone-login creates account on first use)
 *             and returns the session payload.
 * On failure: returns null. The OTP code is never logged.
 */
export async function verifyOtpAndGetUser(phone: string, code: string): Promise<AuthUser | null> {
  const now = new Date();

  const [record] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), eq(otpCodes.used, false), gt(otpCodes.expiresAt, now)))
    .orderBy(sql`${otpCodes.createdAt} DESC`)
    .limit(1);

  if (!record) return null; // expired or already used
  if (record.attempts >= MAX_ATTEMPTS) return null; // brute-force lockout

  // Increment before verifying — prevents racing attempts after the last one
  await db
    .update(otpCodes)
    .set({ attempts: record.attempts + 1 })
    .where(eq(otpCodes.id, record.id));

  const valid = await verifyOtpCode(code, record.codeHash);
  if (!valid) return null;

  // Mark used so it cannot be replayed
  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, record.id));

  // Upsert user — first-time phone login provisions the account
  const [user] = await db
    .insert(users)
    .values({
      phone,
      name: phone, // placeholder; replaced during profile setup (S0-09)
      role: "owner",
      language: "dz",
      isActive: true,
      phoneVerified: true,
    })
    .onConflictDoUpdate({
      target: users.phone,
      set: { phoneVerified: true },
    })
    .returning({ id: users.id, role: users.role });

  if (!user) return null;

  // Include businessId in the JWT if the user already has a profile
  const [profile] = await db
    .select({ id: businessProfiles.id })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, user.id))
    .limit(1);

  return {
    id: user.id,
    role: user.role as Role,
    businessId: profile?.id,
  };
}

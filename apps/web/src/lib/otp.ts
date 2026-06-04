import { randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

// Argon2id — defaults are Argon2id in @node-rs/argon2; override memory/time for OTP use
// (OTPs are short-lived; we trade a bit of memory for throughput)
const ARGON2_OPTIONS = {
  memoryCost: 4096, // 4 MiB
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

/**
 * Returns a 6-digit OTP string.
 * Development: always "123456" for easy testing.
 * Production:  cryptographically random via `randomInt`.
 */
export function generateOtp(): string {
  if (process.env.NODE_ENV !== "production") return "123456";
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Argon2id hash of the plaintext OTP code. */
export function hashOtpCode(code: string): Promise<string> {
  return hash(code, ARGON2_OPTIONS);
}

/** Constant-time Argon2id verification. */
export function verifyOtpCode(code: string, storedHash: string): Promise<boolean> {
  return verify(storedHash, code);
}

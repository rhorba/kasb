"use server";

import { generateOtp } from "@/lib/otp";
import { checkRateLimit, storeOtp } from "@/lib/otp-db";
import { phoneSchema } from "@kasb/core";
import { InfobipOtpService, MockOtpService } from "@kasb/notifications";

function getOtpService() {
  return process.env.NODE_ENV === "production" ? new InfobipOtpService() : new MockOtpService();
}

export type RequestOtpState =
  | { status: "idle" }
  | { status: "sent"; phone: string }
  | { status: "error"; code: "invalid_phone" | "rate_limited" | "send_failed" };

/**
 * Step 1 of phone-OTP login: generate + store + send the code.
 * Called from the phone-entry form (S0-09 wires the UI).
 * Never returns the plaintext OTP to the client.
 */
export async function requestOtp(
  _prev: RequestOtpState,
  formData: FormData,
): Promise<RequestOtpState> {
  const raw = formData.get("phone");
  const parsed = phoneSchema.safeParse(raw);

  if (!parsed.success) {
    return { status: "error", code: "invalid_phone" };
  }

  const phone = parsed.data;

  const allowed = await checkRateLimit(phone);
  if (!allowed) {
    return { status: "error", code: "rate_limited" };
  }

  const code = generateOtp();
  await storeOtp(phone, code);

  try {
    const svc = getOtpService();
    await svc.sendOtp(phone, code);
  } catch {
    return { status: "error", code: "send_failed" };
  }

  return { status: "sent", phone };
}

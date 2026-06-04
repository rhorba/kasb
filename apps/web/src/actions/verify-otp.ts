"use server";

import { signIn } from "@/auth";
import { LOCALES, otpSchema, phoneSchema } from "@kasb/core";
import { AuthError } from "next-auth";
import { z } from "zod";

export type VerifyOtpState =
  | { status: "idle" }
  | { status: "error"; code: "invalid_otp" | "invalid_input" | "server_error" };

const schema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
  locale: z.enum(LOCALES).default("dz"),
});

/**
 * Step 2 of phone-OTP login: verify code and sign in.
 * On success: throws NEXT_REDIRECT (signIn's internal mechanism) — the caller
 * must rethrow non-AuthError exceptions so Next.js can perform the navigation.
 * On failure: returns an error state for the form.
 */
export async function verifyOtp(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const parsed = schema.safeParse({
    phone: formData.get("phone"),
    otp: formData.get("otp"),
    locale: formData.get("locale"),
  });

  if (!parsed.success) {
    return { status: "error", code: "invalid_input" };
  }

  const { phone, otp, locale } = parsed.data;

  try {
    await signIn("credentials", {
      phone,
      otp,
      redirectTo: `/${locale}/home`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", code: "invalid_otp" };
    }
    // Rethrow NEXT_REDIRECT — Auth.js throws this on successful sign-in to
    // perform the navigation. Swallowing it would silently kill the redirect.
    throw error;
  }

  return { status: "idle" };
}

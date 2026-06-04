"use client";

import { type RequestOtpState, requestOtp } from "@/actions/request-otp";
import { type VerifyOtpState, verifyOtp } from "@/actions/verify-otp";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useCallback, useEffect, useState } from "react";

export default function SignInPage() {
  const [sentPhone, setSentPhone] = useState<string | null>(null);

  const handlePhoneSent = useCallback((phone: string) => {
    setSentPhone(phone);
  }, []);

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <span className="text-6xl font-bold text-saffron-500">كسب</span>
      </div>

      {sentPhone !== null ? (
        <OtpStep phone={sentPhone} onBack={() => setSentPhone(null)} />
      ) : (
        <PhoneStep onSuccess={handlePhoneSent} />
      )}
    </div>
  );
}

function PhoneStep({ onSuccess }: { onSuccess: (phone: string) => void }) {
  const t = useTranslations("auth");
  const [state, action, isPending] = useActionState<RequestOtpState, FormData>(requestOtp, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "sent") {
      onSuccess(state.phone);
    }
  }, [state, onSuccess]);

  return (
    <form action={action} className="space-y-5">
      <p className="text-center text-gray-500">{t("subtitle")}</p>

      <div className="space-y-1">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          {t("phoneLabel")}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder={t("phonePlaceholder")}
          autoComplete="tel"
          dir="ltr"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-500/20"
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm text-expense" role="alert">
          {state.code === "invalid_phone" && t("errors.invalid_phone")}
          {state.code === "rate_limited" && t("errors.rate_limited")}
          {state.code === "send_failed" && t("errors.send_failed")}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-14 w-full items-center justify-center rounded-xl bg-saffron-500 text-lg font-bold text-white disabled:opacity-60 active:scale-95"
      >
        {isPending ? "…" : t("sendOtp")}
      </button>
    </form>
  );
}

function OtpStep({ phone, onBack }: { phone: string; onBack: () => void }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, isPending] = useActionState<VerifyOtpState, FormData>(verifyOtp, {
    status: "idle",
  });

  return (
    <form action={action} className="space-y-5">
      <div className="text-center">
        <p className="text-lg font-semibold">{t("otpTitle")}</p>
        <p className="mt-1 text-sm text-gray-500">{t("otpSubtitle", { phone })}</p>
      </div>

      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="locale" value={locale} />

      <div className="space-y-1">
        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
          {t("otpLabel")}
        </label>
        <input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={t("otpPlaceholder")}
          autoComplete="one-time-code"
          dir="ltr"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-500/20"
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm text-expense" role="alert">
          {state.code === "invalid_otp" && t("errors.invalid_otp")}
          {state.code === "invalid_input" && t("errors.invalid_input")}
          {state.code === "server_error" && t("errors.server_error")}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-14 w-full items-center justify-center rounded-xl bg-saffron-500 text-lg font-bold text-white disabled:opacity-60 active:scale-95"
      >
        {isPending ? "…" : t("verifyOtp")}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="flex h-12 w-full items-center justify-center text-sm text-gray-500 underline"
      >
        {t("resendOtp")}
      </button>
    </form>
  );
}

"use client";

import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useTranslations } from "next-intl";

export function PushToggle() {
  const { permission, subscribed, loading, requestAndSubscribe, unsubscribe } =
    usePushNotifications();
  const t = useTranslations("notifications");

  if (permission === "unsupported") return null;

  if (permission === "denied") {
    return <p className="text-xs text-gray-400">{t("blocked")}</p>;
  }

  if (permission === "granted" && subscribed) {
    return (
      <button
        type="button"
        onClick={unsubscribe}
        disabled={loading}
        className="flex h-14 w-full items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 text-sm text-gray-600 shadow-sm active:bg-gray-50"
      >
        <span>{t("enabled")}</span>
        <span className="text-xs text-gray-400">{t("disable")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={requestAndSubscribe}
      disabled={loading}
      className="flex h-14 w-full items-center justify-between rounded-2xl border border-kasb-200 bg-kasb-50 px-4 text-sm font-semibold text-kasb-700 active:bg-kasb-100"
    >
      <span>{t("enable")}</span>
      <span className="text-kasb-400">→</span>
    </button>
  );
}

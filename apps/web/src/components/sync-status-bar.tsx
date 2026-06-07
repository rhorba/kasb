"use client";

import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSyncEngine } from "@/hooks/use-sync-engine";
import { useTranslations } from "next-intl";

type Props = { businessId: string | undefined };

export default function SyncStatusBar({ businessId }: Props) {
  const isOnline = useNetworkStatus();
  const { syncState, pendingCount } = useSyncEngine(businessId);
  const t = useTranslations("sync");

  if (isOnline && syncState === "idle" && pendingCount === 0) return null;
  if (isOnline && syncState === "synced") return null;

  if (!isOnline) {
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-white">
        <span className="h-2 w-2 rounded-full bg-white opacity-80" />
        {t("offline")}
        {pendingCount > 0 && (
          <span className="rounded-full bg-white/20 px-2 py-0.5">
            {t("pending", { count: pendingCount })}
          </span>
        )}
      </div>
    );
  }

  if (syncState === "syncing") {
    return (
      <div className="flex items-center justify-center gap-2 bg-kasb-500 px-4 py-1.5 text-xs font-medium text-white">
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        {t("syncing")}
      </div>
    );
  }

  if (syncState === "error") {
    return (
      <div className="flex items-center justify-center gap-2 bg-red-500 px-4 py-1.5 text-xs font-medium text-white">
        <span className="h-2 w-2 rounded-full bg-white opacity-80" />
        {t("error")}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-medium text-white">
        <span className="h-2 w-2 rounded-full bg-white opacity-80" />
        {t("pendingEntries", { count: pendingCount })}
      </div>
    );
  }

  return null;
}

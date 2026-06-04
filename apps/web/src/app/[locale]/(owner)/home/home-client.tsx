"use client";

import type { CashEntrySummary, CashEntryWithMeta } from "@/actions/cash-entry";
import EntrySheet from "@/components/entry-sheet";
import { Link } from "@/i18n/navigation";
import { formatMAD } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  summary: CashEntrySummary;
  recentEntries: CashEntryWithMeta[];
  businessId?: string | undefined;
};

export default function HomeClient({ summary, recentEntries, businessId }: Props) {
  const t = useTranslations("home");
  const tc = useTranslations("cashbook");
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<"income" | "expense">("income");

  function openSheet(type: "income" | "expense") {
    setSheetType(type);
    setSheetOpen(true);
  }

  const netPositive = summary.net >= 0;

  return (
    <>
      {/* Today balance card */}
      <div className="rounded-2xl bg-kasb-500 p-4 text-white shadow-md">
        <p className="text-sm opacity-75">{t("todayBalance")}</p>
        <p
          className={`mt-1 text-4xl font-bold tabular-nums ${netPositive ? "text-green-200" : "text-red-200"}`}
        >
          {netPositive ? "+" : ""}
          {formatMAD(summary.net)}
        </p>
        <div className="mt-2 flex gap-4 text-sm opacity-80">
          <span>
            {t("income")}:{" "}
            <span className="font-semibold text-green-200">{formatMAD(summary.income)}</span>
          </span>
          <span>
            {t("expense")}:{" "}
            <span className="font-semibold text-red-200">{formatMAD(summary.expense)}</span>
          </span>
        </div>
      </div>

      {/* Hero buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => openSheet("income")}
          className="flex h-[72px] flex-1 items-center justify-center rounded-2xl bg-income text-xl font-bold text-white shadow-md active:scale-95"
        >
          {t("addIncome")}
        </button>
        <button
          type="button"
          onClick={() => openSheet("expense")}
          className="flex h-[72px] flex-1 items-center justify-center rounded-2xl bg-expense text-xl font-bold text-white shadow-md active:scale-95"
        >
          {t("addExpense")}
        </button>
      </div>

      {/* Recent entries */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{t("recentEntries")}</p>
          <Link href="/cashbook" className="text-sm font-medium text-kasb-500">
            {t("seeAll")} →
          </Link>
        </div>

        {recentEntries.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl bg-gray-50 py-10 text-center text-gray-400">
            <p className="text-sm">{t("noEntries")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {recentEntries.map((entry, i) => {
              const isIncome = entry.type === "income";
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < recentEntries.length - 1 ? "border-b border-gray-50" : ""
                  } ${entry.isCorrected ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xl ${isIncome ? "text-income" : "text-expense"}`}>
                      {isIncome ? "●" : "●"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {tc(`categories.${entry.category}`)}
                        {entry.isCorrected && (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
                            {tc("correction.badge")}
                          </span>
                        )}
                        {entry.correctsId && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600">
                            {tc("correction.isCorrection")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {entry.entryDate.toLocaleTimeString("fr-MA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-base font-semibold tabular-nums ${isIncome ? "text-income" : "text-expense"}`}
                  >
                    {isIncome ? "+" : "−"}
                    {formatMAD(entry.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EntrySheet
        open={sheetOpen}
        defaultType={sheetType}
        businessId={businessId}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}

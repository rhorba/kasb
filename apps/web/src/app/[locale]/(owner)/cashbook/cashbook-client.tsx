"use client";

import {
  type CashEntrySummary,
  type CashEntryWithMeta,
  type ChartDay,
  type Period,
  getCashEntryChartData,
  getCashEntrySummary,
  listCashEntries,
} from "@/actions/cash-entry";
import EntrySheet from "@/components/entry-sheet";
import RevenueChart from "@/components/revenue-chart";
import { formatMAD } from "@/lib/utils";
import { buildWhatsAppLink, formatReceipt } from "@kasb/whatsapp";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

type Props = {
  initialSummary: CashEntrySummary;
  initialEntries: CashEntryWithMeta[];
  initialChart: ChartDay[];
  businessName: string;
  businessCity?: string | undefined;
};

// Group entries by calendar date string
function groupByDate(entries: CashEntryWithMeta[]): Map<string, CashEntryWithMeta[]> {
  const map = new Map<string, CashEntryWithMeta[]>();
  for (const e of entries) {
    const key = new Date(e.entryDate).toLocaleDateString("fr-MA", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(e);
  }
  return map;
}

export default function CashbookClient({
  initialSummary,
  initialEntries,
  initialChart,
  businessName,
  businessCity,
}: Props) {
  const t = useTranslations("cashbook");
  const tc = useTranslations("common");
  const router = useRouter();

  const [period, setPeriod] = useState<Period>("month");
  const [summary, setSummary] = useState(initialSummary);
  const [entries, setEntries] = useState(initialEntries);
  const [chart, setChart] = useState(initialChart);
  const [isPending, startTransition] = useTransition();

  // Entry sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<"income" | "expense">("income");

  // Correction sheet state
  const [correcting, setCorrecting] = useState<CashEntryWithMeta | null>(null);
  const [detailEntry, setDetailEntry] = useState<CashEntryWithMeta | null>(null);

  const loadPeriod = useCallback((p: Period) => {
    setPeriod(p);
    startTransition(async () => {
      const [s, e, c] = await Promise.all([
        getCashEntrySummary({ period: p }),
        listCashEntries({ period: p, limit: 100 }),
        p === "month" || p === "all"
          ? getCashEntryChartData({ days: 30 })
          : Promise.resolve({ ok: true as const, data: [] as ChartDay[] }),
      ]);
      if (s.ok) setSummary(s.data);
      if (e.ok) setEntries(e.data);
      if (c.ok) setChart(c.data);
    });
  }, []);

  const handleSuccess = useCallback(() => {
    router.refresh();
    loadPeriod(period);
  }, [router, loadPeriod, period]);

  const grouped = groupByDate(entries);
  const PERIODS: Period[] = ["today", "week", "month"];
  const periodLabel: Record<Period, string> = {
    today: t("today"),
    week: t("week"),
    month: t("month"),
    all: t("month"),
  };

  return (
    <>
      {/* Period tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => loadPeriod(p)}
            className={`h-10 flex-1 rounded-lg text-sm font-medium transition-colors ${
              period === p ? "bg-white text-kasb-600 shadow" : "text-gray-500"
            }`}
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      {/* Summary card */}
      <div
        className={`rounded-2xl p-4 text-white shadow-sm transition-opacity ${
          isPending ? "opacity-60" : ""
        } bg-kasb-500`}
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs opacity-75">{t("income")}</p>
            <p className="mt-1 text-lg font-bold text-green-200">{formatMAD(summary.income)}</p>
          </div>
          <div>
            <p className="text-xs opacity-75">{t("expense")}</p>
            <p className="mt-1 text-lg font-bold text-red-200">{formatMAD(summary.expense)}</p>
          </div>
          <div>
            <p className="text-xs opacity-75">{t("net")}</p>
            <p
              className={`mt-1 text-lg font-bold ${summary.net >= 0 ? "text-green-200" : "text-red-200"}`}
            >
              {summary.net >= 0 ? "+" : ""}
              {formatMAD(summary.net)}
            </p>
          </div>
        </div>
      </div>

      {/* Bar chart (month view only) */}
      {(period === "month" || period === "all") && chart.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <RevenueChart data={chart} />
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-400">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-kasb-500" />
              {t("income")}
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-indigo-800" />
              {t("expense")}
            </span>
          </div>
        </div>
      )}

      {/* New entry FAB */}
      <button
        type="button"
        onClick={() => {
          setSheetType("income");
          setSheetOpen(true);
        }}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-kasb-500 text-2xl text-white shadow-lg active:scale-95"
        aria-label={t("newEntry")}
      >
        +
      </button>

      {/* Entries list */}
      {entries.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl bg-gray-50 py-12 text-center text-gray-400">
          <p className="text-sm">{t("noEntries")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([dateLabel, dayEntries]) => (
            <div key={dateLabel}>
              <p className="mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                {dateLabel}
              </p>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {dayEntries.map((entry, i) => {
                  const isIncome = entry.type === "income";
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setDetailEntry(entry)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-right ${
                        i < dayEntries.length - 1 ? "border-b border-gray-50" : ""
                      } ${entry.isCorrected ? "opacity-40" : ""} active:bg-gray-50`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2 w-2 rounded-full ${isIncome ? "bg-income" : "bg-expense"}`}
                        />
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-800">
                            {t(`categories.${entry.category}`)}
                            {entry.isCorrected && (
                              <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
                                {t("correction.badge")}
                              </span>
                            )}
                            {entry.correctsId && (
                              <span className="mr-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600">
                                {t("correction.isCorrection")}
                              </span>
                            )}
                          </p>
                          {entry.description && (
                            <p className="text-xs text-gray-400">{entry.description}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-base font-semibold tabular-nums ${isIncome ? "text-income" : "text-expense"}`}
                      >
                        {isIncome ? "+" : "−"}
                        {formatMAD(entry.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entry detail sheet (S2-07 correction CTA) */}
      {detailEntry && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setDetailEntry(null)}
            onKeyDown={(e) => e.key === "Escape" && setDetailEntry(null)}
            role="button"
            tabIndex={-1}
            aria-label={tc("cancel")}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-6 shadow-2xl">
            <div className="mb-1 flex justify-center">
              <div className="h-1.5 w-10 rounded-full bg-gray-300" />
            </div>
            <div className="mt-3 rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {t(`categories.${detailEntry.category}`)}
                </span>
                <span
                  className={`text-xl font-bold ${detailEntry.type === "income" ? "text-income" : "text-expense"}`}
                >
                  {detailEntry.type === "income" ? "+" : "−"}
                  {formatMAD(detailEntry.amount)}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(detailEntry.entryDate).toLocaleDateString("fr-MA", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {detailEntry.description && (
                <p className="mt-2 text-sm text-gray-600">{detailEntry.description}</p>
              )}
            </div>

            {/* WhatsApp share — income entries only (sharing a sale receipt) */}
            {detailEntry.type === "income" && businessName && (
              <a
                href={buildWhatsAppLink(
                  undefined,
                  formatReceipt(
                    {
                      amount: detailEntry.amount,
                      type: detailEntry.type,
                      category: detailEntry.category,
                      description: detailEntry.description,
                      entryDate: new Date(detailEntry.entryDate),
                    },
                    { name: businessName, city: businessCity },
                    "fr",
                  ),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-green-500 text-base font-semibold text-white active:bg-green-600"
              >
                <span>📲</span>
                {t("shareWhatsApp")}
              </a>
            )}

            {!detailEntry.isCorrected && !detailEntry.correctsId && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setCorrecting(detailEntry);
                    setDetailEntry(null);
                    setSheetOpen(true);
                  }}
                  className="mt-3 flex h-14 w-full items-center justify-center rounded-xl border-2 border-kasb-200 text-base font-semibold text-kasb-600 active:bg-kasb-50"
                >
                  {t("correction.cta")}
                </button>
                <p className="mt-2 text-center text-xs text-gray-400">{t("correction.note")}</p>
              </>
            )}
          </div>
        </>
      )}

      {/* Entry / correction sheet */}
      <EntrySheet
        open={sheetOpen}
        defaultType={sheetType}
        {...(correcting
          ? {
              correcting: {
                entryId: correcting.id,
                type: correcting.type,
                amountCentimes: correcting.amount,
                category: correcting.category,
                description: correcting.description,
              },
            }
          : {})}
        onClose={() => {
          setSheetOpen(false);
          setCorrecting(null);
        }}
        onSuccess={handleSuccess}
      />
    </>
  );
}

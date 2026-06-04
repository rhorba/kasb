"use client";

import type { CustomerWithMeta } from "@/actions/customer";
import DebtEntrySheet from "@/components/debt-entry-sheet";
import { Link } from "@/i18n/navigation";
import { formatMAD } from "@/lib/utils";
import type { SelectDebtEntry } from "@kasb/db";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  customer: CustomerWithMeta;
  debtEntries: SelectDebtEntry[];
};

export default function CustomerDetailClient({ customer, debtEntries }: Props) {
  const t = useTranslations("customers");
  const router = useRouter();
  const [sheet, setSheet] = useState<"sale" | "repayment" | null>(null);

  const hasDebt = customer.outstandingDebt > 0;

  return (
    <>
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/customers"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{customer.name}</h1>
          {customer.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
        </div>
      </div>

      {/* Outstanding debt card */}
      <div
        className={`rounded-2xl p-4 shadow-md ${hasDebt ? "bg-expense" : "bg-income"} text-white`}
      >
        <p className="text-sm opacity-75">{t("outstandingDebt")}</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">
          {formatMAD(customer.outstandingDebt)}
        </p>
        {!hasDebt && <p className="mt-1 text-sm opacity-80">{t("settled")}</p>}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setSheet("sale")}
          className="flex h-[64px] flex-1 items-center justify-center rounded-2xl bg-expense text-base font-bold text-white shadow-md active:scale-95"
        >
          {t("recordSale")}
        </button>
        <button
          type="button"
          onClick={() => setSheet("repayment")}
          className="flex h-[64px] flex-1 items-center justify-center rounded-2xl bg-income text-base font-bold text-white shadow-md active:scale-95"
        >
          {t("recordRepayment")}
        </button>
      </div>

      {/* Debt history */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-500">{t("history")}</p>
        {debtEntries.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl bg-gray-50 py-8 text-sm text-gray-400">
            {t("noEntries")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {debtEntries.map((entry, i) => {
              const isRepayment = entry.amount < 0;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < debtEntries.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {isRepayment ? t("repaymentLabel") : t("saleLabel")}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-gray-400">{entry.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {entry.entryDate.toLocaleDateString("fr-MA")}
                    </p>
                  </div>
                  <span
                    className={`text-base font-bold tabular-nums ${
                      isRepayment ? "text-income" : "text-expense"
                    }`}
                  >
                    {isRepayment ? "−" : "+"}
                    {formatMAD(Math.abs(entry.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sheet && (
        <DebtEntrySheet
          customerId={customer.id}
          mode={sheet}
          open={sheet !== null}
          onClose={() => setSheet(null)}
          onSuccess={() => {
            setSheet(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

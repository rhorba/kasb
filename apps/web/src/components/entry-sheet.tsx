"use client";

import { correctCashEntry, createCashEntry } from "@/actions/cash-entry";
import { formatMAD, parseMADToCentimes } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const INCOME_CATEGORIES = ["sales", "other_income"] as const;
const EXPENSE_CATEGORIES = [
  "stock_purchase",
  "rent",
  "transport",
  "staff",
  "loan_repayment",
  "equipment",
  "utilities",
  "other_expense",
] as const;

type EntryType = "income" | "expense";

type Props = {
  open: boolean;
  defaultType?: EntryType;
  /** If set, pre-fills the form for correcting an existing entry */
  correcting?: {
    entryId: string;
    type: EntryType;
    amountCentimes: number;
    category: string;
    description?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
};

export default function EntrySheet({
  open,
  defaultType = "income",
  correcting,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("cashbook");
  const tc = useTranslations("common");

  const [type, setType] = useState<EntryType>(correcting?.type ?? defaultType);
  const [amountStr, setAmountStr] = useState(
    correcting ? String(correcting.amountCentimes / 100) : "",
  );
  const [category, setCategory] = useState(
    correcting?.category ?? (defaultType === "income" ? "sales" : "stock_purchase"),
  );
  const [description, setDescription] = useState(correcting?.description ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Reset when sheet opens with a new default type or new correction
  useEffect(() => {
    if (!open) return;
    setType(correcting?.type ?? defaultType);
    setAmountStr(correcting ? String(correcting.amountCentimes / 100) : "");
    setCategory(correcting?.category ?? (defaultType === "income" ? "sales" : "stock_purchase"));
    setDescription(correcting?.description ?? "");
    setStatus("idle");
    setErrorMsg("");
  }, [open, defaultType, correcting]);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const centimes = parseMADToCentimes(amountStr);

  function handleNumpad(key: string) {
    if (key === "⌫") {
      setAmountStr((s) => s.slice(0, -1));
      return;
    }
    if (key === "." && amountStr.includes(".")) return;
    if (amountStr === "0" && key !== ".") {
      setAmountStr(key);
      return;
    }
    // Limit to 2 decimal places
    const dotIdx = amountStr.indexOf(".");
    if (dotIdx !== -1 && amountStr.length - dotIdx > 2) return;
    setAmountStr((s) => s + key);
  }

  const handleSubmit = useCallback(async () => {
    if (centimes <= 0) return;
    setStatus("saving");
    setErrorMsg("");

    const payload = {
      type,
      amount: centimes,
      category: category as never,
      description: description || undefined,
      entryDate: new Date(),
      source: "manual" as const,
    };

    const result = correcting
      ? await correctCashEntry({ entryId: correcting.entryId, ...payload })
      : await createCashEntry(payload);

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.message ?? t("saved"));
      return;
    }

    setStatus("saved");
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 600);
  }, [centimes, type, category, description, correcting, t, onSuccess, onClose]);

  if (!open) return null;

  const isIncome = type === "income";
  const confirmColor = isIncome ? "bg-income" : "bg-expense";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label={tc("cancel")}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          {/* Title */}
          <h2 className="mb-3 text-center text-base font-semibold text-gray-700">
            {correcting ? t("correction.title") : t("newEntry")}
          </h2>

          {/* Income / Expense toggle */}
          {!correcting && (
            <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  setCategory("sales");
                }}
                className={`h-12 flex-1 rounded-lg text-base font-semibold transition-colors ${
                  isIncome ? "bg-income text-white shadow" : "text-gray-500"
                }`}
              >
                {t("income")} +
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  setCategory("stock_purchase");
                }}
                className={`h-12 flex-1 rounded-lg text-base font-semibold transition-colors ${
                  !isIncome ? "bg-expense text-white shadow" : "text-gray-500"
                }`}
              >
                {t("expense")} −
              </button>
            </div>
          )}

          {/* Amount display */}
          <div className="mb-3 text-center">
            <span
              className={`text-5xl font-bold tabular-nums ${isIncome ? "text-income" : "text-expense"}`}
            >
              {amountStr ? formatMAD(centimes) : "0 MAD"}
            </span>
          </div>

          {/* Category chips */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                  category === cat
                    ? isIncome
                      ? "bg-income text-white"
                      : "bg-expense text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {t(`categories.${cat}`)}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleNumpad(k)}
                className="flex h-16 items-center justify-center rounded-xl bg-gray-100 text-2xl font-semibold text-gray-800 active:bg-gray-200"
              >
                {k}
              </button>
            ))}
          </div>

          {/* Note (optional) */}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("description")}
            maxLength={200}
            className="mb-3 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700 placeholder-gray-400 focus:border-kasb-300 focus:outline-none"
          />

          {/* Error */}
          {status === "error" && (
            <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
          )}

          {/* Correction warning */}
          {correcting && (
            <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {t("correction.note")}
            </p>
          )}

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={centimes <= 0 || status === "saving"}
            className={`flex h-16 w-full items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md transition-opacity disabled:opacity-50 active:scale-95 ${confirmColor}`}
          >
            {status === "saved"
              ? t("saved")
              : status === "saving"
                ? tc("loading")
                : centimes > 0
                  ? t("confirmEntry", { amount: formatMAD(centimes) })
                  : t("confirmEntry", { amount: "0 MAD" })}
          </button>
        </div>
      </div>
    </>
  );
}

"use client";

import { recordDebtSale, recordRepayment } from "@/actions/customer";
import { formatMAD, parseMADToCentimes } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Props = {
  customerId: string;
  mode: "sale" | "repayment";
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DebtEntrySheet({ customerId, mode, open, onClose, onSuccess }: Props) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");

  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmountStr("");
    setDescription("");
    setStatus("idle");
    setErrorMsg("");
  }, [open]);

  const centimes = parseMADToCentimes(amountStr);
  const isSale = mode === "sale";
  const accentColor = isSale ? "bg-expense" : "bg-income";

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
    const dotIdx = amountStr.indexOf(".");
    if (dotIdx !== -1 && amountStr.length - dotIdx > 2) return;
    setAmountStr((s) => s + key);
  }

  const handleSubmit = useCallback(async () => {
    if (centimes <= 0) return;
    setStatus("saving");
    setErrorMsg("");

    const payload = {
      customerId,
      amount: centimes,
      description: description || undefined,
      entryDate: new Date(),
    };

    const result = isSale ? await recordDebtSale(payload) : await recordRepayment(payload);

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.message ?? tc("error"));
      return;
    }

    setStatus("saved");
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 600);
  }, [centimes, customerId, description, isSale, tc, onSuccess, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label={tc("cancel")}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="px-4 pb-6">
          <h2 className="mb-3 text-center text-base font-semibold text-gray-700">
            {isSale ? t("recordSale") : t("recordRepayment")}
          </h2>

          {/* Amount display */}
          <div className="mb-3 text-center">
            <span
              className={`text-5xl font-bold tabular-nums ${isSale ? "text-expense" : "text-income"}`}
            >
              {amountStr ? formatMAD(centimes) : "0 MAD"}
            </span>
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

          {/* Note */}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("notePlaceholder")}
            maxLength={200}
            className="mb-3 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700 placeholder-gray-400 focus:border-kasb-300 focus:outline-none"
          />

          {status === "error" && (
            <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={centimes <= 0 || status === "saving"}
            className={`flex h-16 w-full items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md transition-opacity disabled:opacity-50 active:scale-95 ${accentColor}`}
          >
            {status === "saved"
              ? "✓"
              : status === "saving"
                ? tc("loading")
                : centimes > 0
                  ? `${isSale ? t("confirmSale") : t("confirmRepayment")} — ${formatMAD(centimes)}`
                  : isSale
                    ? t("confirmSale")
                    : t("confirmRepayment")}
          </button>
        </div>
      </div>
    </>
  );
}

"use client";

import { createStockItem } from "@/actions/stock";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddStockItemSheet({ open, onClose, onSuccess }: Props) {
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pièce");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [currentStock, setCurrentStock] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setUnit("pièce");
    setPurchasePrice("");
    setSellingPrice("");
    setCurrentStock("0");
    setLowStockThreshold("5");
    setStatus("idle");
    setErrorMsg("");
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;
    setStatus("saving");
    const result = await createStockItem({
      name: name.trim(),
      unit: unit.trim() || "pièce",
      purchasePrice: Math.round(Number.parseFloat(purchasePrice || "0") * 100),
      sellingPrice: Math.round(Number.parseFloat(sellingPrice || "0") * 100),
      currentStock: Number.parseInt(currentStock, 10) || 0,
      lowStockThreshold: Number.parseInt(lowStockThreshold, 10) || 0,
    });
    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.message ?? tc("error"));
      return;
    }
    onSuccess();
  }, [name, unit, purchasePrice, sellingPrice, currentStock, lowStockThreshold, tc, onSuccess]);

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
        <div className="max-h-[80vh] overflow-y-auto px-4 pb-8">
          <h2 className="mb-4 text-center text-base font-semibold text-gray-700">{t("addItem")}</h2>

          {[
            { label: t("itemName"), value: name, set: setName, type: "text", ph: t("itemNamePh") },
            { label: t("unit"), value: unit, set: setUnit, type: "text", ph: "pièce, kg, litre…" },
            {
              label: t("purchasePrice"),
              value: purchasePrice,
              set: setPurchasePrice,
              type: "number",
              ph: "0.00",
            },
            {
              label: t("sellingPrice"),
              value: sellingPrice,
              set: setSellingPrice,
              type: "number",
              ph: "0.00",
            },
            {
              label: t("currentStock"),
              value: currentStock,
              set: setCurrentStock,
              type: "number",
              ph: "0",
            },
            {
              label: t("lowStockThreshold"),
              value: lowStockThreshold,
              set: setLowStockThreshold,
              type: "number",
              ph: "5",
            },
          ].map(({ label, value, set, type, ph }) => {
            const inputId = `stock-field-${label.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <div key={label} className="mb-3">
                <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-gray-500">
                  {label}
                </label>
                <input
                  id={inputId}
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={ph}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-kasb-300 focus:outline-none"
                />
              </div>
            );
          })}

          {status === "error" && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || status === "saving"}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-kasb-500 text-base font-bold text-white shadow-md disabled:opacity-50 active:scale-95"
          >
            {status === "saving" ? tc("loading") : t("saveItem")}
          </button>
        </div>
      </div>
    </>
  );
}

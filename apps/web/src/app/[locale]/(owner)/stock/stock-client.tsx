"use client";

import { recordStockSale } from "@/actions/stock";
import AddStockItemSheet from "@/components/add-stock-item-sheet";
import { formatMAD } from "@/lib/utils";
import type { SelectStockItem } from "@kasb/db";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { items: SelectStockItem[] };

export default function StockClient({ items }: Props) {
  const t = useTranslations("stock");
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const lowStockItems = items.filter(
    (i) => i.lowStockThreshold > 0 && i.currentStock <= i.lowStockThreshold,
  );

  async function handleSell(itemId: string) {
    const quantity = Number.parseInt(qty, 10);
    if (!quantity || quantity <= 0) return;
    setSaving(true);
    setError("");
    const result = await recordStockSale({ itemId, quantity });
    setSaving(false);
    if (!result.ok) {
      setError(result.message ?? "Erreur");
      return;
    }
    setSellingId(null);
    setQty("1");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-kasb-600">{t("title")}</h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex h-12 items-center gap-2 rounded-xl bg-kasb-500 px-4 text-sm font-semibold text-white shadow-md active:scale-95"
        >
          + {t("addItem")}
        </button>
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-700">
            ⚠ {t("lowStockAlert", { count: lowStockItems.length })}
          </p>
          <ul className="mt-1 list-disc pl-4">
            {lowStockItems.map((item) => (
              <li key={item.id} className="text-xs text-amber-600">
                {item.name} — {item.currentStock} {item.unit} {t("remaining")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Item list */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 py-12 text-center">
          <p className="text-2xl">📦</p>
          <p className="mt-2 text-sm text-gray-500">{t("noItems")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const isLow = item.lowStockThreshold > 0 && item.currentStock <= item.lowStockThreshold;
            const isSelling = sellingId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                  isLow ? "border-amber-200" : "border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatMAD(item.sellingPrice)} / {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        isLow ? "text-amber-500" : "text-gray-800"
                      }`}
                    >
                      {item.currentStock}
                    </p>
                    <p className="text-xs text-gray-400">{item.unit}</p>
                  </div>
                </div>

                {isLow && (
                  <p className="mt-1 text-xs text-amber-600">
                    ⚠ {t("lowStock", { threshold: item.lowStockThreshold })}
                  </p>
                )}

                {/* Sell action */}
                {isSelling ? (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={item.currentStock}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="h-10 w-20 rounded-xl border border-gray-200 px-3 text-center text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSell(item.id)}
                      disabled={saving}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl bg-expense text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {t("confirmSell")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSellingId(null);
                        setError("");
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSellingId(item.id);
                      setQty("1");
                    }}
                    className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-semibold text-gray-600 active:bg-gray-200"
                  >
                    {t("recordSale")}
                  </button>
                )}
                {error && isSelling && <p className="mt-1 text-xs text-red-500">{error}</p>}
              </div>
            );
          })}
        </div>
      )}

      <AddStockItemSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

"use client";

import { createCustomer } from "@/actions/customer";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddCustomerSheet({ open, onClose, onSuccess }: Props) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setStatus("idle");
    setErrorMsg("");
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;
    setStatus("saving");
    setErrorMsg("");

    const result = await createCustomer({
      name: name.trim(),
      phone: phone.trim() || undefined,
    });

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.message ?? tc("error"));
      return;
    }

    setStatus("saved");
    setTimeout(() => onSuccess(), 500);
  }, [name, phone, tc, onSuccess]);

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
        <div className="px-4 pb-8">
          <h2 className="mb-4 text-center text-base font-semibold text-gray-700">
            {t("addCustomer")}
          </h2>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={200}
            className="mb-3 h-14 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-700 placeholder-gray-400 focus:border-kasb-300 focus:outline-none"
          />

          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            maxLength={20}
            className="mb-3 h-14 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-700 placeholder-gray-400 focus:border-kasb-300 focus:outline-none"
          />

          {status === "error" && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || status === "saving"}
            className="flex h-16 w-full items-center justify-center rounded-2xl bg-kasb-500 text-lg font-bold text-white shadow-md transition-opacity disabled:opacity-50 active:scale-95"
          >
            {status === "saving" ? tc("loading") : status === "saved" ? "✓" : t("saveCustomer")}
          </button>
        </div>
      </div>
    </>
  );
}

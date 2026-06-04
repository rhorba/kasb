"use client";

import { createProfile, updateProfile } from "@/actions/business-profile";
import type { SelectBusinessProfile } from "@kasb/db";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORIES = [
  "commerce",
  "services",
  "artisanat",
  "construction",
  "food",
  "beauty",
  "other",
] as const;

type Props = { existing: SelectBusinessProfile | null };

export default function ProfileForm({ existing }: Props) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState(existing?.category ?? "commerce");
  const [city, setCity] = useState(existing?.city ?? "");
  const [neighborhood, setNeighborhood] = useState(existing?.neighborhood ?? "");
  const [hasFixedPremises, setHasFixedPremises] = useState(existing?.hasFixedPremises ?? false);
  const [isAE, setIsAE] = useState(existing?.isAutoEntrepreneur ?? false);
  const [rnaNumber, setRnaNumber] = useState(existing?.rnaNumber ?? "");

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");

    const payload = {
      name,
      category,
      city,
      ...(neighborhood && { neighborhood }),
      hasFixedPremises,
      isAutoEntrepreneur: isAE,
      ...(isAE && rnaNumber && { rnaNumber }),
    };

    const result = existing ? await updateProfile(payload) : await createProfile(payload);

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.message ?? t("errors.save"));
      return;
    }

    setStatus("saved");
    // Reload so the server component reflects the new profile
    router.refresh();
  }

  const isCreating = !existing;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {isCreating && <p className="text-sm text-gray-500">{t("createSubtitle")}</p>}

      {/* Business name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          {t("businessName")}
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={200}
          className="h-12 rounded-xl border border-gray-300 px-4 text-base focus:border-kasb-500 focus:outline-none focus:ring-2 focus:ring-kasb-200"
        />
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium text-gray-700">
          {t("category")}
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-base focus:border-kasb-500 focus:outline-none focus:ring-2 focus:ring-kasb-200"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {t(`categories.${cat}`)}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      <div className="flex flex-col gap-1">
        <label htmlFor="city" className="text-sm font-medium text-gray-700">
          {t("city")}
        </label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
          minLength={1}
          maxLength={100}
          className="h-12 rounded-xl border border-gray-300 px-4 text-base focus:border-kasb-500 focus:outline-none focus:ring-2 focus:ring-kasb-200"
        />
      </div>

      {/* Neighborhood (optional) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="neighborhood" className="text-sm font-medium text-gray-700">
          {t("neighborhood")}
        </label>
        <input
          id="neighborhood"
          type="text"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          maxLength={200}
          className="h-12 rounded-xl border border-gray-300 px-4 text-base focus:border-kasb-500 focus:outline-none focus:ring-2 focus:ring-kasb-200"
        />
      </div>

      {/* Has fixed premises toggle */}
      <button
        type="button"
        onClick={() => setHasFixedPremises((v) => !v)}
        className={`flex h-14 w-full items-center justify-between rounded-xl border px-4 text-base font-medium transition-colors ${
          hasFixedPremises
            ? "border-kasb-500 bg-kasb-50 text-kasb-700"
            : "border-gray-300 bg-white text-gray-700"
        }`}
      >
        <span>{t("hasFixedPremises")}</span>
        <span
          className={`h-6 w-11 rounded-full transition-colors ${
            hasFixedPremises ? "bg-kasb-500" : "bg-gray-300"
          }`}
        />
      </button>

      {/* Auto-entrepreneur toggle */}
      <button
        type="button"
        onClick={() => setIsAE((v) => !v)}
        className={`flex h-14 w-full items-center justify-between rounded-xl border px-4 text-base font-medium transition-colors ${
          isAE
            ? "border-kasb-500 bg-kasb-50 text-kasb-700"
            : "border-gray-300 bg-white text-gray-700"
        }`}
      >
        <span>{t("isAE")}</span>
        <span
          className={`h-6 w-11 rounded-full transition-colors ${
            isAE ? "bg-kasb-500" : "bg-gray-300"
          }`}
        />
      </button>

      {/* RNA number — only shown if AE */}
      {isAE && (
        <div className="flex flex-col gap-1">
          <label htmlFor="rna" className="text-sm font-medium text-gray-700">
            {t("rnaNumber")}
          </label>
          <input
            id="rna"
            type="text"
            value={rnaNumber}
            onChange={(e) => setRnaNumber(e.target.value)}
            maxLength={50}
            className="h-12 rounded-xl border border-gray-300 px-4 text-base focus:border-kasb-500 focus:outline-none focus:ring-2 focus:ring-kasb-200"
          />
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "saving"}
        className="flex h-14 w-full items-center justify-center rounded-xl bg-kasb-500 text-base font-semibold text-white shadow-sm transition-opacity disabled:opacity-60 active:scale-95"
      >
        {status === "saving" ? tc("loading") : status === "saved" ? t("saved") : t("saveProfile")}
      </button>
    </form>
  );
}

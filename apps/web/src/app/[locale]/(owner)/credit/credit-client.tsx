"use client";

import { submitCreditApplication } from "@/actions/credit";
import { formatMAD } from "@/lib/utils";
import type { CreditScoreResult } from "@kasb/credit";
import type { SelectCreditApplication, SelectCreditScore } from "@kasb/db";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ─── Types passed from page ───────────────────────────────────────────────────

type Partner = {
  id: string;
  name: string;
  logoUrl: string;
  minScore: number;
  cities: string[];
  active: boolean;
  contactPhone: string;
  websiteUrl?: string | null;
  products: Array<{
    id: string;
    name: string;
    minAmount: number;
    maxAmount: number;
    maxDurationMonths: number;
    description: string;
  }>;
};

type Props = {
  score: SelectCreditScore | null;
  preview: CreditScoreResult | null;
  partners: Partner[];
  applications: SelectCreditApplication[];
};

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg width="160" height="160" className="-rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-gray-800">{score}</span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
  );
}

// ─── Component bar ────────────────────────────────────────────────────────────

function ComponentBar({
  label,
  value,
  max,
  explanation,
}: { label: string; value: number; max: number; explanation: string }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 70 ? "bg-income" : pct >= 40 ? "bg-amber-400" : "bg-expense";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="tabular-nums text-gray-500">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{explanation}</p>
    </div>
  );
}

// ─── Application status badge ─────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700",
  reviewing: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreditClient({ score, preview, partners, applications }: Props) {
  const t = useTranslations("credit");
  const tc = useTranslations("common");
  const router = useRouter();
  const [applying, setApplying] = useState<Partner | null>(null);
  const [requestedAmount, setRequestedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const displayScore = score?.score ?? preview?.score ?? null;
  const components = score?.components ?? preview?.components ?? null;
  const monthsOfData = score?.monthsOfData ?? preview?.monthsOfData ?? 0;

  async function handleApply() {
    if (!applying) return;
    const centimes = Math.round(Number.parseFloat(requestedAmount.replace(",", ".")) * 100);
    if (!centimes || centimes <= 0) return;

    setSubmitting(true);
    setSubmitError("");

    const result = await submitCreditApplication({
      partnerId: applying.id,
      requestedAmount: centimes,
      consentGiven: true,
    });

    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.message ?? tc("error"));
      return;
    }
    setApplying(null);
    setRequestedAmount("");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-xl font-bold text-kasb-600">{t("title")}</h1>

      {/* No data state */}
      {displayScore === null && (
        <div className="rounded-2xl bg-gray-50 p-6 text-center">
          <p className="text-2xl">📊</p>
          <p className="mt-2 text-sm font-medium text-gray-700">{t("noScore")}</p>
          <p className="mt-1 text-xs text-gray-400">{t("noScoreHint")}</p>
        </div>
      )}

      {/* Score ring + summary */}
      {displayScore !== null && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-sm">
          <ScoreRing score={displayScore} />
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">
              {displayScore >= 70 ? t("eligible") : t("notEligible")}
            </p>
            <p className="text-xs text-gray-400">{t("monthsOfData", { months: monthsOfData })}</p>
            {preview && !score && (
              <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-600">
                {t("previewNote")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Component breakdown */}
      {components && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">{t("breakdown")}</p>
          <div className="flex flex-col gap-3">
            <ComponentBar
              label={t("components.revenueConsistency")}
              value={components.revenueConsistency}
              max={30}
              explanation={t("components.revenueConsistencyHint")}
            />
            <ComponentBar
              label={t("components.expenseControl")}
              value={components.expenseControl}
              max={25}
              explanation={t("components.expenseControlHint")}
            />
            <ComponentBar
              label={t("components.growthTrend")}
              value={components.growthTrend}
              max={20}
              explanation={t("components.growthTrendHint")}
            />
            <ComponentBar
              label={t("components.debtRecoveryRate")}
              value={components.debtRecoveryRate}
              max={15}
              explanation={t("components.debtRecoveryHint")}
            />
            <ComponentBar
              label={t("components.dataRichness")}
              value={components.dataRichness}
              max={10}
              explanation={t("components.dataRichnessHint")}
            />
          </div>
        </div>
      )}

      {/* Microfinance partner cards (S5-07) */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">{t("partners")}</p>
        {partners.length === 0 ? (
          <p className="text-xs text-gray-400">{t("noPartners")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {partners.map((partner) => {
              const eligible = displayScore !== null && displayScore >= partner.minScore;
              const maxProduct = partner.products.reduce(
                (best, p) => (p.maxAmount > (best?.maxAmount ?? 0) ? p : best),
                partner.products[0],
              );
              return (
                <div
                  key={partner.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kasb-50 text-sm font-bold text-kasb-600">
                        {partner.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{partner.name}</p>
                        <p className="text-xs text-gray-400">
                          {t("minScore")}: {partner.minScore}/100
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        eligible ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {eligible ? t("eligibleBadge") : t("notEligibleBadge")}
                    </span>
                  </div>
                  {maxProduct && (
                    <div className="border-t border-gray-50 px-4 pb-3">
                      <p className="mt-2 text-xs text-gray-500">
                        {formatMAD(maxProduct.minAmount)} – {formatMAD(maxProduct.maxAmount)} ·{" "}
                        {maxProduct.maxDurationMonths} {t("months")}
                      </p>
                    </div>
                  )}
                  {eligible && (
                    <div className="border-t border-gray-50 px-4 pb-3">
                      <button
                        type="button"
                        onClick={() => setApplying(partner)}
                        className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-kasb-500 text-sm font-semibold text-white active:scale-95"
                      >
                        {t("apply")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My applications (S5-09) */}
      {applications.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">{t("myApplications")}</p>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {applications.map((app, i) => (
              <div
                key={app.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < applications.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {formatMAD(app.requestedAmount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(app.submittedAt).toLocaleDateString("fr-MA")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[app.status] ?? STATUS_STYLE.submitted}`}
                >
                  {t(`applicationStatus.${app.status}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Application sheet */}
      {applying && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setApplying(null)}
            onKeyDown={(e) => e.key === "Escape" && setApplying(null)}
            role="button"
            tabIndex={-1}
            aria-label={tc("cancel")}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-gray-300" />
            </div>
            <div className="px-4 pb-8">
              <h2 className="mb-1 text-center text-base font-semibold text-gray-700">
                {t("applyTo")} {applying.name}
              </h2>
              <p className="mb-4 text-center text-xs text-gray-400">{t("consentNote")}</p>

              <input
                type="number"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                placeholder={t("amountPlaceholder")}
                className="mb-3 h-14 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-700 placeholder-gray-400 focus:border-kasb-300 focus:outline-none"
              />

              {submitError && (
                <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                  {submitError}
                </p>
              )}

              <button
                type="button"
                onClick={handleApply}
                disabled={submitting || !requestedAmount}
                className="flex h-16 w-full items-center justify-center rounded-2xl bg-kasb-500 text-lg font-bold text-white shadow-md disabled:opacity-50 active:scale-95"
              >
                {submitting ? tc("loading") : t("confirmApply")}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

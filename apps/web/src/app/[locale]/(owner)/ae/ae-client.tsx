"use client";

import { completeAERegistration, updateAEStep } from "@/actions/ae";
import type { AEReadiness } from "@/actions/ae";
import { formatMAD } from "@/lib/utils";
import type { SelectAEProgress } from "@kasb/db";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  progress: SelectAEProgress | null;
  readiness: AEReadiness | null;
};

const STEP_ICONS: Record<string, string> = {
  quiz: "✅",
  simulation: "💰",
  registration: "📋",
  declaration: "📅",
  complete: "🎉",
};

export default function AEClient({ progress, readiness }: Props) {
  const t = useTranslations("ae");
  const router = useRouter();
  const [rnaNumber, setRnaNumber] = useState(progress?.rnaNumber ?? "");
  const [saving, setSaving] = useState(false);

  const steps = progress?.steps ?? [];
  const completedCount = steps.filter((s) => s.status === "done").length;
  const totalSteps = steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const isCompleted = !!progress?.completedAt;

  async function markStep(stepId: string, status: "done" | "skipped" | "in_progress") {
    setSaving(true);
    await updateAEStep({ stepId, status });
    setSaving(false);
    router.refresh();
  }

  async function handleComplete() {
    setSaving(true);
    await completeAERegistration({ rnaNumber: rnaNumber || undefined });
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      <h1 className="text-xl font-bold text-kasb-600">{t("title")}</h1>
      <p className="text-sm text-gray-500">{t("subtitle")}</p>

      {/* Progress bar */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">{t("progress")}</span>
          <span className="font-bold text-kasb-600">{progressPct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-kasb-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {isCompleted && (
          <p className="mt-2 text-center text-sm font-semibold text-income">{t("completed")} 🎉</p>
        )}
      </div>

      {/* Income simulation (step 2 context) */}
      {readiness && readiness.avgMonthlyRevenueCentimes > 0 && (
        <div className="rounded-2xl bg-kasb-50 p-4">
          <p className="text-sm font-semibold text-kasb-700">{t("simulation.title")}</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500">{t("simulation.monthlyRevenue")}</p>
              <p className="mt-1 text-lg font-bold text-gray-800">
                {formatMAD(readiness.avgMonthlyRevenueCentimes)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500">
                {t("simulation.annualTax", { rate: readiness.cpuRatePct })}
              </p>
              <p className="mt-1 text-lg font-bold text-expense">
                {formatMAD(readiness.cpuTaxCentimes)}
              </p>
            </div>
          </div>
          {!readiness.isReady && (
            <p className="mt-2 text-xs text-amber-600">{t("simulation.needMoreData")}</p>
          )}
        </div>
      )}

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const isDone = step.status === "done";
          const isSkipped = step.status === "skipped";
          const isActive = !isDone && !isSkipped && steps[i - 1]?.status === "done";

          return (
            <div
              key={step.id}
              className={`rounded-2xl border p-4 ${
                isDone
                  ? "border-income bg-green-50"
                  : isActive
                    ? "border-kasb-300 bg-white shadow-md"
                    : "border-gray-100 bg-white opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{isDone ? "✅" : (STEP_ICONS[step.id] ?? "○")}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                    {isDone && step.completedAt && (
                      <p className="text-xs text-gray-400">
                        {new Date(step.completedAt).toLocaleDateString("fr-MA")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step content */}
                {step.id === "registration" && !isDone && isActive && (
                  <a
                    href="https://www.rn.ae.gov.ma"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-kasb-500 px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => markStep(step.id, "in_progress")}
                  >
                    {t("openRNAE")}
                  </a>
                )}

                {(isActive || isDone) && step.id !== "complete" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => markStep(step.id, isDone ? "skipped" : "done")}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                      isDone ? "bg-gray-100 text-gray-500" : "bg-kasb-500 text-white"
                    }`}
                  >
                    {isDone ? t("undo") : t("markDone")}
                  </button>
                )}
              </div>

              {/* Declaration rate hint */}
              {step.id === "declaration" && isActive && (
                <div className="mt-3 rounded-xl bg-kasb-50 p-3 text-xs text-kasb-700">
                  {readiness?.cpuRatePct === 1
                    ? t("declaration.servicesRate")
                    : t("declaration.commerceRate")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete registration */}
      {completedCount === totalSteps - 1 && !isCompleted && (
        <div className="rounded-2xl border border-kasb-200 bg-white p-4 shadow-md">
          <p className="mb-2 text-sm font-semibold text-gray-700">{t("rnaLabel")}</p>
          <input
            type="text"
            value={rnaNumber}
            onChange={(e) => setRnaNumber(e.target.value)}
            placeholder={t("rnaPlaceholder")}
            className="mb-3 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-kasb-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-income text-base font-bold text-white shadow-md disabled:opacity-50 active:scale-95"
          >
            {saving ? "..." : t("complete")}
          </button>
        </div>
      )}
    </>
  );
}

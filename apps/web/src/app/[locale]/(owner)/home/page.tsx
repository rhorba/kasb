import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Hero actions — Sprint 2: these open the entry form instead of navigating */}
      <div className="flex gap-3 pt-4">
        <Link
          href="/cashbook"
          className="flex h-16 flex-1 items-center justify-center rounded-2xl bg-income text-xl font-bold text-white shadow-md active:scale-95"
        >
          {t("addIncome")}
        </Link>
        <Link
          href="/cashbook"
          className="flex h-16 flex-1 items-center justify-center rounded-2xl bg-expense text-xl font-bold text-white shadow-md active:scale-95"
        >
          {t("addExpense")}
        </Link>
      </div>

      {/* Today's summary — Sprint 2 fills with real data */}
      <div className="rounded-2xl bg-kasb-500 p-4 text-white">
        <p className="text-sm opacity-75">{t("todaySummary")}</p>
        <div className="mt-2 flex justify-between text-lg font-semibold">
          <span>
            {t("income")}: <span className="text-green-300">—</span>
          </span>
          <span>
            {t("expense")}: <span className="text-red-300">—</span>
          </span>
        </div>
      </div>

      {/* Empty state */}
      <div className="flex items-center justify-center rounded-2xl bg-gray-50 py-12 text-center text-gray-400">
        <p>{t("noEntries")}</p>
      </div>
    </div>
  );
}

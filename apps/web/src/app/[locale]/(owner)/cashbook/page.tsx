import { getMyProfile } from "@/actions/business-profile";
import { getCashEntryChartData, getCashEntrySummary, listCashEntries } from "@/actions/cash-entry";
import { getTranslations } from "next-intl/server";
import CashbookClient from "./cashbook-client";

export default async function CashbookPage() {
  const t = await getTranslations("cashbook");

  const [summaryResult, entriesResult, chartResult, profileResult] = await Promise.all([
    getCashEntrySummary({ period: "month" }),
    listCashEntries({ period: "month", limit: 100 }),
    getCashEntryChartData({ days: 30 }),
    getMyProfile(),
  ]);

  const initialSummary = summaryResult.ok ? summaryResult.data : { income: 0, expense: 0, net: 0 };
  const initialEntries = entriesResult.ok ? entriesResult.data : [];
  const initialChart = chartResult.ok ? chartResult.data : [];
  const profile = profileResult.ok ? profileResult.data : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-kasb-500">{t("title")}</h1>
      <CashbookClient
        initialSummary={initialSummary}
        initialEntries={initialEntries}
        initialChart={initialChart}
        businessName={profile?.name ?? ""}
        businessCity={profile?.city ?? undefined}
      />
    </div>
  );
}

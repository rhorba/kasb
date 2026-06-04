import { getCashEntrySummary, listCashEntries } from "@/actions/cash-entry";
import { auth } from "@/auth";
import HomeClient from "./home-client";

export default async function HomePage() {
  const [session, summaryResult, entriesResult] = await Promise.all([
    auth(),
    getCashEntrySummary({ period: "today" }),
    listCashEntries({ period: "today", limit: 5 }),
  ]);

  const summary = summaryResult.ok ? summaryResult.data : { income: 0, expense: 0, net: 0 };
  const recentEntries = entriesResult.ok ? entriesResult.data : [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <HomeClient
        summary={summary}
        recentEntries={recentEntries}
        businessId={session?.businessId ?? undefined}
      />
    </div>
  );
}

import { getAdminKPIs } from "@/actions/admin";
import AdminClient from "./admin-client";

export default async function AdminDashboardPage() {
  const result = await getAdminKPIs();

  const kpis = result.ok
    ? result.data
    : {
        dau: 0,
        mau: 0,
        totalBusinesses: 0,
        entriesToday: 0,
        avgEntriesPerDay30d: 0,
        scoresComputed: 0,
        creditApps: { total: 0, submitted: 0, reviewing: 0, approved: 0, rejected: 0 },
        formalizationRate: 0,
        aeRegistered: 0,
      };

  return <AdminClient kpis={kpis} />;
}

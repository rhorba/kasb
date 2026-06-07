"use server";

import { withAction } from "@/lib/action";
import {
  aeRegistrationProgress,
  businessProfiles,
  cashEntries,
  creditApplications,
  creditScores,
  db,
} from "@kasb/db";
import { count, countDistinct, gte, sql } from "drizzle-orm";

export type AdminKPIs = {
  dau: number; // distinct business owners active today
  mau: number; // distinct business owners active last 30 days
  totalBusinesses: number;
  entriesToday: number;
  avgEntriesPerDay30d: number; // rounded
  scoresComputed: number;
  creditApps: {
    total: number;
    submitted: number;
    reviewing: number;
    approved: number;
    rejected: number;
  };
  formalizationRate: number; // % businesses with AE status
  aeRegistered: number; // businesses that completed AE registration
};

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const getAdminKPIs = withAction(["admin"], async () => {
  const today = todayStart();
  const thirtyDaysAgo = daysAgo(30);

  const [
    dauResult,
    mauResult,
    totalBizResult,
    entriesTodayResult,
    entries30dResult,
    scoresResult,
    appsResult,
    aeBizResult,
    aeCompletedResult,
  ] = await Promise.all([
    // DAU — distinct owners who created an entry today
    db
      .select({ count: countDistinct(cashEntries.businessId) })
      .from(cashEntries)
      .where(gte(cashEntries.createdAt, today)),

    // MAU — distinct owners who created an entry in last 30 days
    db
      .select({ count: countDistinct(cashEntries.businessId) })
      .from(cashEntries)
      .where(gte(cashEntries.createdAt, thirtyDaysAgo)),

    // Total businesses
    db
      .select({ count: count() })
      .from(businessProfiles),

    // Entries created today
    db
      .select({ count: count() })
      .from(cashEntries)
      .where(gte(cashEntries.createdAt, today)),

    // Entries last 30 days
    db
      .select({ count: count() })
      .from(cashEntries)
      .where(gte(cashEntries.createdAt, thirtyDaysAgo)),

    // Credit scores total
    db
      .select({ count: count() })
      .from(creditScores),

    // Credit applications by status
    db
      .select({
        total: count(),
        submitted: sql<number>`COUNT(*) FILTER (WHERE ${creditApplications.status} = 'submitted')`,
        reviewing: sql<number>`COUNT(*) FILTER (WHERE ${creditApplications.status} = 'reviewing')`,
        approved: sql<number>`COUNT(*) FILTER (WHERE ${creditApplications.status} = 'approved')`,
        rejected: sql<number>`COUNT(*) FILTER (WHERE ${creditApplications.status} = 'rejected')`,
      })
      .from(creditApplications),

    // Businesses with AE status (profile flag)
    db
      .select({ count: count() })
      .from(businessProfiles)
      .where(sql`${businessProfiles.isAutoEntrepreneur} = true`),

    // AE registration actually completed
    db
      .select({ count: count() })
      .from(aeRegistrationProgress)
      .where(sql`${aeRegistrationProgress.completedAt} IS NOT NULL`),
  ]);

  const totalBiz = totalBizResult[0]?.count ?? 0;
  const aeBiz = aeBizResult[0]?.count ?? 0;
  const apps = appsResult[0];

  return {
    dau: dauResult[0]?.count ?? 0,
    mau: mauResult[0]?.count ?? 0,
    totalBusinesses: totalBiz,
    entriesToday: entriesTodayResult[0]?.count ?? 0,
    avgEntriesPerDay30d: Math.round((entries30dResult[0]?.count ?? 0) / 30),
    scoresComputed: scoresResult[0]?.count ?? 0,
    creditApps: {
      total: Number(apps?.total ?? 0),
      submitted: Number(apps?.submitted ?? 0),
      reviewing: Number(apps?.reviewing ?? 0),
      approved: Number(apps?.approved ?? 0),
      rejected: Number(apps?.rejected ?? 0),
    },
    formalizationRate: totalBiz > 0 ? Math.round((aeBiz / totalBiz) * 100) : 0,
    aeRegistered: aeCompletedResult[0]?.count ?? 0,
  } satisfies AdminKPIs;
});

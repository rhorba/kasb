import { auth } from "@/auth";
import { PushSetup } from "@/components/push-setup";
import SyncStatusBar from "@/components/sync-status-bar";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import BottomNav from "./bottom-nav";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);

  if (!session?.userId) {
    redirect(`/${locale}/signin`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PushSetup />
      <SyncStatusBar businessId={session.businessId ?? undefined} />
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}

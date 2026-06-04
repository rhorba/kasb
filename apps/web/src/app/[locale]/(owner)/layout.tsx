import { auth } from "@/auth";
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
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}

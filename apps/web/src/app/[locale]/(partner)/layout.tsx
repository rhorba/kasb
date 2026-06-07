import { auth, signOut } from "@/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);

  if (!session?.userId || (session.role !== "partner" && session.role !== "admin")) {
    redirect(`/${locale}/signin`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-saffron-500">كسب</span>
          <span className="rounded bg-kasb-50 px-2 py-0.5 text-xs font-medium text-kasb-600">
            Espace Partenaire
          </span>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: `/${locale}/signin` });
          }}
        >
          <button
            type="submit"
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
            style={{ minHeight: "unset" }}
          >
            Déconnexion
          </button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

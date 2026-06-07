import { auth, signOut } from "@/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);

  if (!session?.userId || session.role !== "admin") {
    redirect(`/${locale}/signin`);
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(10% 0.04 265)" }}>
      {/* Top bar */}
      <header
        className="flex h-14 items-center justify-between border-b px-6"
        style={{
          background: "oklch(13% 0.05 265)",
          borderColor: "oklch(20% 0.06 265)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: "oklch(68% 0.16 68)" }}
          >
            كسب
          </span>
          <span
            className="rounded px-2 py-0.5 text-xs font-mono font-medium tracking-widest uppercase"
            style={{
              background: "oklch(20% 0.06 265)",
              color: "oklch(55% 0.08 265)",
            }}
          >
            ADMIN
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
            className="text-xs font-medium transition-colors"
            style={{ color: "oklch(50% 0.06 265)", minHeight: "unset" }}
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}

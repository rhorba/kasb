"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname(); // locale-stripped: "/home", "/customers", …

  const tabs = [
    { segment: "home", label: t("cashbook"), icon: "📒" },
    { segment: "customers", label: t("customers"), icon: "👥" },
    { segment: "credit", label: t("credit"), icon: "⭐" },
    { segment: "profile", label: t("profile"), icon: "👤" },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center border-t border-gray-200 bg-white shadow-lg">
      {tabs.map((tab) => {
        const href = `/${tab.segment}` as const;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.segment}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ${
              isActive ? "text-saffron-500" : "text-gray-500 hover:text-kasb-500"
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

import { useTranslations } from "next-intl";

// Sprint 5: credit score dashboard + microfinance marketplace

export default function CreditPage() {
  const t = useTranslations("credit");
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-kasb-500">{t("title")}</h1>
      <p className="mt-2 text-gray-400">Sprint 5 →</p>
    </div>
  );
}

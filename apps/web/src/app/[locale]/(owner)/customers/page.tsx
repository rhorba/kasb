import { useTranslations } from "next-intl";

// Sprint 4: customer debt book — add client, record credit sale, record payment

export default function CustomersPage() {
  const t = useTranslations("nav");
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-kasb-500">{t("customers")}</h1>
      <p className="mt-2 text-gray-400">Sprint 4 →</p>
    </div>
  );
}

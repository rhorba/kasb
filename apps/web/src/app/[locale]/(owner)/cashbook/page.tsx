import { useTranslations } from "next-intl";

// Sprint 2: manual cash entry form + entry list + summaries
// Sprint 3: voice entry + OCR receipt photo

export default function CashbookPage() {
  const t = useTranslations("cashbook");
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-kasb-500">{t("title")}</h1>
      <p className="mt-2 text-gray-400">Sprint 2 →</p>
    </div>
  );
}

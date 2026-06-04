import {
  getLatestScore,
  getScorePreview,
  listMyApplications,
  listPartners,
} from "@/actions/credit";
import CreditClient from "./credit-client";

export default async function CreditPage() {
  const [scoreResult, partnersResult, applicationsResult] = await Promise.all([
    getLatestScore(),
    listPartners(),
    listMyApplications(),
  ]);

  // If no stored score yet, compute a live preview without persisting
  const previewResult = scoreResult.ok && scoreResult.data ? null : await getScorePreview();

  const score = scoreResult.ok ? scoreResult.data : null;
  const preview = previewResult?.ok ? previewResult.data : null;
  const partners = partnersResult.ok ? partnersResult.data : [];
  const applications = applicationsResult.ok ? applicationsResult.data : [];

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <CreditClient
        score={score}
        preview={preview}
        partners={partners}
        applications={applications}
      />
    </div>
  );
}

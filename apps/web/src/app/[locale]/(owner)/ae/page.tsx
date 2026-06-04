import { getAEProgress, getAEReadiness } from "@/actions/ae";
import AEClient from "./ae-client";

export default async function AEPage() {
  const [progressResult, readinessResult] = await Promise.all([getAEProgress(), getAEReadiness()]);

  const progress = progressResult.ok ? progressResult.data : null;
  const readiness = readinessResult.ok ? readinessResult.data : null;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <AEClient progress={progress} readiness={readiness} />
    </div>
  );
}

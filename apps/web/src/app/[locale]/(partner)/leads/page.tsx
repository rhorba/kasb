import { listMyLeads } from "@/actions/partner";
import PartnerClient from "./partner-client";

export default async function PartnerLeadsPage() {
  const result = await listMyLeads();
  const leads = result.ok ? result.data : [];
  return <PartnerClient leads={leads} />;
}

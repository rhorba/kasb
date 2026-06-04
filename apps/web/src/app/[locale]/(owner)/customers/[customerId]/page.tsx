import { listCustomers, listDebtEntries } from "@/actions/customer";
import { notFound } from "next/navigation";
import CustomerDetailClient from "./customer-detail-client";

type Props = { params: Promise<{ customerId: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { customerId } = await params;

  const [customersResult, entriesResult] = await Promise.all([
    listCustomers({}),
    listDebtEntries({ customerId, limit: 100 }),
  ]);

  const customer = customersResult.ok
    ? customersResult.data.find((c) => c.id === customerId)
    : undefined;

  if (!customer) notFound();

  const debtEntries = entriesResult.ok ? entriesResult.data : [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <CustomerDetailClient customer={customer} debtEntries={debtEntries} />
    </div>
  );
}

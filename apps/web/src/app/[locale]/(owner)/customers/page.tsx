import { listCustomers } from "@/actions/customer";
import CustomersClient from "./customers-client";

export default async function CustomersPage() {
  const customersResult = await listCustomers({});
  const customerList = customersResult.ok ? customersResult.data : [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <CustomersClient customers={customerList} />
    </div>
  );
}

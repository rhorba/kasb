import { listStockItems } from "@/actions/stock";
import StockClient from "./stock-client";

export default async function StockPage() {
  const result = await listStockItems();
  const items = result.ok ? result.data : [];

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <StockClient items={items} />
    </div>
  );
}

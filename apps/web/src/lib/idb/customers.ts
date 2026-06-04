import { getDB } from "./db";
import type { LocalCustomer } from "./schema";

export async function cacheCustomers(customers: LocalCustomer[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("customers", "readwrite");
  await Promise.all(customers.map((c) => tx.store.put(c)));
  await tx.done;
}

export async function getLocalCustomers(businessId: string): Promise<LocalCustomer[]> {
  const db = await getDB();
  return db.getAllFromIndex("customers", "by_businessId", businessId);
}

export async function getLocalCustomer(id: string): Promise<LocalCustomer | undefined> {
  const db = await getDB();
  return db.get("customers", id);
}

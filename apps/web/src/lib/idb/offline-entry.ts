import type { EntryCategory, EntrySource, EntryType } from "@kasb/core";
import { saveLocalEntry } from "./entries";
import { enqueue } from "./queue";
import type { LocalCashEntry } from "./schema";

export interface OfflineEntryInput {
  businessId: string;
  type: EntryType;
  amount: number; // integer centimes
  category: EntryCategory;
  description?: string | undefined;
  entryDate: Date;
  source: EntrySource;
}

export async function createOfflineEntry(input: OfflineEntryInput): Promise<LocalCashEntry> {
  const offlineId = crypto.randomUUID();
  const now = new Date().toISOString();

  const entry: LocalCashEntry = {
    offlineId,
    businessId: input.businessId,
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description,
    entryDate: input.entryDate.toISOString(),
    source: input.source,
    syncStatus: "pending",
    createdAt: now,
  };

  await saveLocalEntry(entry);
  await enqueue("create", "cash_entry", offlineId, {
    offlineId,
    type: entry.type,
    amount: entry.amount,
    category: entry.category,
    description: entry.description,
    entryDate: entry.entryDate,
    source: entry.source,
  });

  return entry;
}

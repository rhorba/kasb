"use client";

import { isIDBAvailable } from "@/lib/idb/db";
import { markEntryError, markEntrySynced } from "@/lib/idb/entries";
import { dequeue, getAllQueued, incrementRetry } from "@/lib/idb/queue";
import { getLastSync, setLastSync } from "@/lib/idb/sync-meta";
import { useCallback, useEffect, useRef, useState } from "react";

export type SyncState = "idle" | "syncing" | "synced" | "error";

const MAX_RETRIES = 3;

export function useSyncEngine(businessId: string | undefined) {
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const isSyncing = useRef(false);

  const sync = useCallback(async () => {
    if (!businessId || !isIDBAvailable() || isSyncing.current) return;

    const queued = await getAllQueued();
    if (queued.length === 0) {
      setSyncState("idle");
      setPendingCount(0);
      return;
    }

    setPendingCount(queued.length);
    isSyncing.current = true;
    setSyncState("syncing");

    try {
      const lastSyncAt = await getLastSync(businessId);

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: queued
            .filter((q) => q.entity === "cash_entry" && q.retries < MAX_RETRIES)
            .map((q) => ({ ...JSON.parse(q.payload), _queueId: q.id })),
          lastSyncAt: lastSyncAt?.toISOString() ?? null,
        }),
      });

      if (!res.ok) {
        // Increment retries for all items
        await Promise.all(queued.map((q) => q.id != null && incrementRetry(q.id)));
        setSyncState("error");
        return;
      }

      const { created, errors } = (await res.json()) as {
        created: Array<{ offlineId: string; queueId: number }>;
        errors: Array<{ offlineId: string; queueId: number; message: string }>;
      };

      // Mark successful entries
      await Promise.all([
        ...created.map(async ({ offlineId, queueId }) => {
          await markEntrySynced(offlineId);
          await dequeue(queueId);
        }),
        ...errors.map(async ({ offlineId, queueId, message }) => {
          await markEntryError(offlineId, message);
          await dequeue(queueId);
        }),
      ]);

      await setLastSync(businessId, new Date());
      setSyncState("synced");
      setPendingCount(0);
    } catch {
      setSyncState("error");
    } finally {
      isSyncing.current = false;
    }
  }, [businessId]);

  // Sync on mount and whenever we come online
  useEffect(() => {
    if (!businessId) return;

    sync();

    const handleOnline = () => sync();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [businessId, sync]);

  return { syncState, pendingCount, sync };
}

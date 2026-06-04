"use server";

import { withAction } from "@/lib/action";
import type { ActionContext } from "@/lib/action";
import { createStockItemSchema } from "@kasb/core";
import { auditLogs, businessProfiles, stockItems } from "@kasb/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

async function requireBusinessId(ctx: ActionContext): Promise<string> {
  if (ctx.session.businessId) return ctx.session.businessId;
  const [profile] = await ctx.tx
    .select({ id: businessProfiles.id })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, ctx.session.userId))
    .limit(1);
  if (!profile) throw new Error("Profil manquant");
  return profile.id;
}

// ─── listStockItems ───────────────────────────────────────────────────────────

export const listStockItems = withAction(["owner", "admin"], async (ctx) => {
  const businessId = await requireBusinessId(ctx);
  return ctx.tx
    .select()
    .from(stockItems)
    .where(eq(stockItems.businessId, businessId))
    .orderBy(desc(stockItems.updatedAt));
});

// ─── createStockItem ──────────────────────────────────────────────────────────

export const createStockItem = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const data = createStockItemSchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  const [item] = await ctx.tx
    .insert(stockItems)
    .values({ ...data, businessId })
    .returning();

  if (!item) throw new Error("Insert returned no rows");

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "stock_items",
    entityId: item.id,
    action: "create",
    after: item,
  });

  return item;
});

// ─── updateStockItem ──────────────────────────────────────────────────────────

const updateStockSchema = createStockItemSchema.partial().extend({
  itemId: z.string().uuid(),
});

export const updateStockItem = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const { itemId, ...updates } = updateStockSchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  const [existing] = await ctx.tx
    .select()
    .from(stockItems)
    .where(and(eq(stockItems.id, itemId), eq(stockItems.businessId, businessId)))
    .limit(1);

  if (!existing) throw new Error("Article introuvable");

  const [updated] = await ctx.tx
    .update(stockItems)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(stockItems.id, itemId))
    .returning();

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "stock_items",
    entityId: itemId,
    action: "update",
    before: existing,
    after: updated,
  });

  return updated;
});

// ─── recordStockSale ─────────────────────────────────────────────────────────
// Deducts quantity from currentStock. Prevents going below 0.

const saleSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().positive("La quantité doit être supérieure à 0"),
});

export const recordStockSale = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const { itemId, quantity } = saleSchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  const [existing] = await ctx.tx
    .select()
    .from(stockItems)
    .where(and(eq(stockItems.id, itemId), eq(stockItems.businessId, businessId)))
    .limit(1);

  if (!existing) throw new Error("Article introuvable");
  if (existing.currentStock < quantity) {
    throw new Error(`Stock insuffisant (disponible: ${existing.currentStock})`);
  }

  const [updated] = await ctx.tx
    .update(stockItems)
    .set({
      currentStock: sql`${stockItems.currentStock} - ${quantity}`,
      updatedAt: new Date(),
    })
    .where(eq(stockItems.id, itemId))
    .returning();

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "stock_items",
    entityId: itemId,
    action: "update",
    before: { currentStock: existing.currentStock },
    after: { currentStock: updated?.currentStock },
  });

  return updated;
});

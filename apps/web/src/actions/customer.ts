"use server";

import { withAction } from "@/lib/action";
import type { ActionContext } from "@/lib/action";
import { createCustomerSchema, moneySchema } from "@kasb/core";
import { type SelectCustomer, auditLogs, businessProfiles, customers, debtEntries } from "@kasb/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// ─── Business ID resolver (same pattern as cash-entry) ───────────────────────

async function requireBusinessId(ctx: ActionContext): Promise<string> {
  if (ctx.session.businessId) return ctx.session.businessId;
  const [profile] = await ctx.tx
    .select({ id: businessProfiles.id })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, ctx.session.userId))
    .limit(1);
  if (!profile) throw new Error("Profil manquant — créez votre profil d'abord");
  return profile.id;
}

// ─── createCustomer ───────────────────────────────────────────────────────────

export const createCustomer = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const data = createCustomerSchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  const [customer] = await ctx.tx
    .insert(customers)
    .values({ ...data, businessId })
    .returning();

  if (!customer) throw new Error("Insert returned no rows");

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "customers",
    entityId: customer.id,
    action: "create",
    after: customer,
  });

  return customer;
});

// ─── listCustomers ────────────────────────────────────────────────────────────

export type CustomerWithMeta = SelectCustomer;

const listCustomersInputSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
});

export const listCustomers = withAction(
  ["owner", "admin"],
  async (ctx, rawInput: unknown): Promise<CustomerWithMeta[]> => {
    const { limit } = listCustomersInputSchema.parse(rawInput ?? {});
    const businessId = await requireBusinessId(ctx);

    return ctx.tx
      .select()
      .from(customers)
      .where(eq(customers.businessId, businessId))
      .orderBy(desc(customers.lastTransactionAt))
      .limit(limit);
  },
);

// ─── listDebtEntries ──────────────────────────────────────────────────────────

const listDebtInputSchema = z.object({
  customerId: z.string().uuid(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listDebtEntries = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const { customerId, limit } = listDebtInputSchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  // Verify the customer belongs to this business
  const [customer] = await ctx.tx
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
    .limit(1);

  if (!customer) throw new Error("Client introuvable");

  return ctx.tx
    .select()
    .from(debtEntries)
    .where(and(eq(debtEntries.customerId, customerId), eq(debtEntries.businessId, businessId)))
    .orderBy(desc(debtEntries.entryDate))
    .limit(limit);
});

// ─── recordDebtSale ───────────────────────────────────────────────────────────
// Creates a positive debt_entry (customer owes money) and updates outstandingDebt.

const debtSaleInputSchema = z.object({
  customerId: z.string().uuid(),
  amount: moneySchema.pipe(z.number().positive("Le montant doit être supérieur à 0")),
  description: z.string().max(500).optional(),
  entryDate: z.date(),
});

export const recordDebtSale = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const { customerId, amount, description, entryDate } = debtSaleInputSchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  // Verify the customer belongs to this business
  const [customer] = await ctx.tx
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
    .limit(1);

  if (!customer) throw new Error("Client introuvable");

  // Append-only: insert the debt entry (positive = customer owes)
  const [entry] = await ctx.tx
    .insert(debtEntries)
    .values({ customerId, businessId, amount, description, entryDate })
    .returning();

  if (!entry) throw new Error("Insert returned no rows");

  // Update customer's outstanding debt and last transaction timestamp
  await ctx.tx
    .update(customers)
    .set({
      outstandingDebt: sql`${customers.outstandingDebt} + ${amount}`,
      lastTransactionAt: new Date(),
    })
    .where(eq(customers.id, customerId));

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "debt_entries",
    entityId: entry.id,
    action: "create",
    after: entry,
  });

  return entry;
});

// ─── recordRepayment ──────────────────────────────────────────────────────────
// Creates a negative debt_entry (customer paying back) and reduces outstandingDebt.

const repaymentInputSchema = z.object({
  customerId: z.string().uuid(),
  amount: moneySchema.pipe(z.number().positive("Le montant doit être supérieur à 0")),
  description: z.string().max(500).optional(),
  entryDate: z.date(),
});

export const recordRepayment = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const { customerId, amount, description, entryDate } = repaymentInputSchema.parse(rawInput);
  const businessId = await requireBusinessId(ctx);

  const [customer] = await ctx.tx
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
    .limit(1);

  if (!customer) throw new Error("Client introuvable");

  // Negative amount = repayment
  const repaymentAmount = -Math.abs(amount);

  const [entry] = await ctx.tx
    .insert(debtEntries)
    .values({ customerId, businessId, amount: repaymentAmount, description, entryDate })
    .returning();

  if (!entry) throw new Error("Insert returned no rows");

  await ctx.tx
    .update(customers)
    .set({
      outstandingDebt: sql`${customers.outstandingDebt} + ${repaymentAmount}`,
      lastTransactionAt: new Date(),
    })
    .where(eq(customers.id, customerId));

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "debt_entries",
    entityId: entry.id,
    action: "create",
    after: entry,
  });

  return entry;
});

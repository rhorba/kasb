"use server";

import { withAction } from "@/lib/action";
import { businessProfiles, creditApplications, db } from "@kasb/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

export type PartnerLead = {
  id: string;
  status: string;
  requestedAmount: number;
  scoreAtApplication: number;
  submittedAt: Date;
  updatedAt: Date;
  businessName: string;
  // ownerPhone intentionally excluded — PII; partners contact through Kasb, not directly
  businessCity: string;
};

export const listMyLeads = withAction(["admin", "partner"], async (ctx): Promise<PartnerLead[]> => {
  // Admin sees all; partner sees only their org's applications
  const isAdmin = ctx.session.role === "admin";
  const orgId = ctx.session.partnerOrgId;

  if (!isAdmin && !orgId) return [];

  const rows = await db
    .select({
      id: creditApplications.id,
      status: creditApplications.status,
      requestedAmount: creditApplications.requestedAmount,
      scoreAtApplication: creditApplications.scoreAtApplication,
      submittedAt: creditApplications.submittedAt,
      updatedAt: creditApplications.updatedAt,
      businessName: businessProfiles.name,
      businessCity: businessProfiles.city,
      // phone excluded — PII; partners do not receive owner contact details
    })
    .from(creditApplications)
    .innerJoin(businessProfiles, eq(creditApplications.businessId, businessProfiles.id))
    .where(isAdmin ? undefined : eq(creditApplications.partnerId, orgId as string))
    .orderBy(desc(creditApplications.submittedAt));

  return rows;
});

const updateStatusSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(["reviewing", "approved", "rejected", "withdrawn"]),
});

export const updateApplicationStatus = withAction(
  ["admin", "partner"],
  async (ctx, rawInput: unknown) => {
    const { applicationId, status } = updateStatusSchema.parse(rawInput);
    const isAdmin = ctx.session.role === "admin";
    const orgId = ctx.session.partnerOrgId;

    // Load application to verify ownership
    const [app] = await db
      .select({ id: creditApplications.id, partnerId: creditApplications.partnerId })
      .from(creditApplications)
      .where(eq(creditApplications.id, applicationId))
      .limit(1);

    if (!app) throw new Error("Demande introuvable");
    if (!isAdmin && app.partnerId !== orgId) {
      throw new Error("Accès non autorisé");
    }

    const [updated] = await db
      .update(creditApplications)
      .set({ status, updatedAt: new Date() })
      .where(eq(creditApplications.id, applicationId))
      .returning();

    return updated;
  },
);

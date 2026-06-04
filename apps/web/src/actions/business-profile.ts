"use server";

import { withAction } from "@/lib/action";
import { createBusinessProfileSchema } from "@kasb/core";
import { auditLogs, businessProfiles } from "@kasb/db";
import { eq } from "drizzle-orm";

/**
 * Returns the current user's business profile, or null if not yet created.
 */
export const getMyProfile = withAction(["owner", "admin"], async (ctx) => {
  const [profile] = await ctx.tx
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, ctx.session.userId))
    .limit(1);
  return profile ?? null;
});

/**
 * Creates a business profile for the current user (onboarding step).
 * Fails if the user already has a profile.
 */
export const createProfile = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const data = createBusinessProfileSchema.parse(rawInput);

  const [profile] = await ctx.tx
    .insert(businessProfiles)
    .values({ ...data, userId: ctx.session.userId })
    .returning();

  if (!profile) throw new Error("Profile insert returned no rows");

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "business_profiles",
    entityId: profile.id,
    action: "create",
    after: profile,
  });

  return profile;
});

/**
 * Updates the current user's business profile.
 * Uses userId (not businessId) as the lookup key — RLS enforces ownership.
 */
export const updateProfile = withAction(["owner", "admin"], async (ctx, rawInput: unknown) => {
  const data = createBusinessProfileSchema.partial().parse(rawInput);

  // Fetch before-state for the audit log
  const [before] = await ctx.tx
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, ctx.session.userId))
    .limit(1);

  if (!before) throw new Error("No profile found for this user");

  const [updated] = await ctx.tx
    .update(businessProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(businessProfiles.userId, ctx.session.userId))
    .returning();

  if (!updated) throw new Error("Profile update returned no rows");

  await ctx.tx.insert(auditLogs).values({
    actorUserId: ctx.session.userId,
    entity: "business_profiles",
    entityId: updated.id,
    action: "update",
    before,
    after: updated,
  });

  return updated;
});

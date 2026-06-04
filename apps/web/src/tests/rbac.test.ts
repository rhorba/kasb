import { ForbiddenError, PERMISSIONS, can, hasRole, withRole } from "@kasb/core";
import type { KasbSession } from "@kasb/core";
import { describe, expect, it } from "vitest";

const session = (role: "owner" | "admin" | "partner"): KasbSession =>
  role !== "partner" ? { userId: "u-1", role, businessId: "b-1" } : { userId: "u-1", role };

// ---------------------------------------------------------------------------
// hasRole
// ---------------------------------------------------------------------------
describe("hasRole", () => {
  it("returns true when role is in the allowed list", () => {
    expect(hasRole(session("owner"), ["owner", "admin"])).toBe(true);
    expect(hasRole(session("admin"), ["owner", "admin"])).toBe(true);
    expect(hasRole(session("partner"), ["partner"])).toBe(true);
  });

  it("returns false when role is not in the allowed list", () => {
    expect(hasRole(session("owner"), ["admin"])).toBe(false);
    expect(hasRole(session("partner"), ["owner", "admin"])).toBe(false);
    expect(hasRole(session("admin"), ["partner"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// can — permission matrix (CLAUDE.md §7)
// ---------------------------------------------------------------------------
describe("can", () => {
  it("owner can create and read cash entries", () => {
    expect(can(session("owner"), "cashEntry", "create")).toBe(true);
    expect(can(session("owner"), "cashEntry", "read")).toBe(true);
  });

  it("partner cannot access cash entries", () => {
    expect(can(session("partner"), "cashEntry", "create")).toBe(false);
    expect(can(session("partner"), "cashEntry", "read")).toBe(false);
  });

  it("owner can read credit score but not compute or adjust", () => {
    expect(can(session("owner"), "creditScore", "read")).toBe(true);
    expect(can(session("owner"), "creditScore", "compute")).toBe(false);
    expect(can(session("owner"), "creditScore", "adjust")).toBe(false);
  });

  it("admin can compute and adjust credit scores", () => {
    expect(can(session("admin"), "creditScore", "compute")).toBe(true);
    expect(can(session("admin"), "creditScore", "adjust")).toBe(true);
  });

  it("partner can read partner dashboard", () => {
    expect(can(session("partner"), "partnerDashboard", "read")).toBe(true);
  });

  it("owner cannot read partner dashboard", () => {
    expect(can(session("owner"), "partnerDashboard", "read")).toBe(false);
  });

  it("only admin can read platform KPIs", () => {
    expect(can(session("admin"), "platformKpis", "read")).toBe(true);
    expect(can(session("owner"), "platformKpis", "read")).toBe(false);
    expect(can(session("partner"), "platformKpis", "read")).toBe(false);
  });

  it("only admin can review fraud flags", () => {
    expect(can(session("admin"), "fraudFlags", "review")).toBe(true);
    expect(can(session("owner"), "fraudFlags", "review")).toBe(false);
    expect(can(session("partner"), "fraudFlags", "review")).toBe(false);
  });

  it("returns false for unknown action on known resource", () => {
    expect(can(session("admin"), "cashEntry", "delete")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// withRole
// ---------------------------------------------------------------------------
describe("withRole", () => {
  it("calls handler and returns its result when role is allowed", async () => {
    const result = await withRole(session("owner"), ["owner", "admin"], async () => 42);
    expect(result).toBe(42);
  });

  it("throws ForbiddenError when role is not allowed", async () => {
    await expect(
      withRole(session("partner"), ["owner", "admin"], async () => "nope"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("does not call the handler when forbidden", async () => {
    let called = false;
    await withRole(session("owner"), ["admin"], async () => {
      called = true;
    }).catch(() => {});
    expect(called).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ForbiddenError
// ---------------------------------------------------------------------------
describe("ForbiddenError", () => {
  it("has name ForbiddenError and a descriptive message", () => {
    const err = new ForbiddenError("partner", "cashEntry", "create");
    expect(err.name).toBe("ForbiddenError");
    expect(err.message).toMatch(/partner/);
    expect(err.message).toMatch(/create/);
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// Permission matrix completeness — every resource has at least one allowed role
// ---------------------------------------------------------------------------
describe("PERMISSIONS completeness", () => {
  it("every resource/action has at least one allowed role", () => {
    for (const [resource, actions] of Object.entries(PERMISSIONS)) {
      for (const [action, roles] of Object.entries(actions)) {
        expect(
          (roles as string[]).length,
          `${resource}.${action} has no allowed roles`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

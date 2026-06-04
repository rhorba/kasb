import type { Role } from "./roles";

export type KasbSession = {
  userId: string;
  role: Role;
  businessId?: string;
};

// Permission matrix — CLAUDE.md §7
export const PERMISSIONS = {
  cashEntry: {
    create: ["owner", "admin"] as Role[],
    read: ["owner", "admin"] as Role[],
  },
  creditScore: {
    read: ["owner", "admin"] as Role[],
    compute: ["admin"] as Role[],
    adjust: ["admin"] as Role[],
  },
  creditApplication: {
    create: ["owner", "admin"] as Role[],
    read: ["owner", "admin"] as Role[],
  },
  aeGuide: { read: ["owner", "admin"] as Role[] },
  stock: { manage: ["owner", "admin"] as Role[] },
  customers: { manage: ["owner", "admin"] as Role[] },
  partnerDashboard: { read: ["admin", "partner"] as Role[] },
  partnerProducts: { manage: ["admin", "partner"] as Role[] },
  platformKpis: { read: ["admin"] as Role[] },
  fraudFlags: { review: ["admin"] as Role[] },
} as const;

export function hasRole(session: KasbSession, roles: Role[]): boolean {
  return roles.includes(session.role);
}

export function can(
  session: KasbSession,
  resource: keyof typeof PERMISSIONS,
  action: string,
): boolean {
  const perm = PERMISSIONS[resource] as Record<string, Role[]>;
  const allowed = perm[action];
  if (allowed === undefined) return false;
  return allowed.includes(session.role);
}

export class ForbiddenError extends Error {
  constructor(role: Role, resource: string, action: string) {
    super(`Role '${role}' cannot '${action}' on '${resource}'`);
    this.name = "ForbiddenError";
  }
}

export async function withRole<T>(
  session: KasbSession,
  allowedRoles: Role[],
  handler: () => Promise<T>,
): Promise<T> {
  if (!hasRole(session, allowedRoles)) {
    throw new ForbiddenError(session.role, "resource", "action");
  }
  return handler();
}

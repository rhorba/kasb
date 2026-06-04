import { auth } from "@/auth";
import { ForbiddenError, hasRole } from "@kasb/core";
import type { KasbSession, Role } from "@kasb/core";
import { db, withUserContext } from "@kasb/db";
import type { KasbDB } from "@kasb/db";

export type ActionContext = {
  session: KasbSession;
  tx: KasbDB;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: "unauthenticated" | "forbidden" | "server_error"; message?: string };

/**
 * Auth guard for form actions (useActionState pattern).
 * Throws on unauthenticated/unauthorized; let the caller map errors to form state.
 */
export async function requireSession(allowedRoles: Role[]): Promise<KasbSession> {
  const raw = await auth();

  if (!raw?.userId) {
    throw Object.assign(new Error("Unauthenticated"), { code: "unauthenticated" as const });
  }

  const session: KasbSession = {
    userId: raw.userId,
    role: raw.role,
    ...(raw.businessId !== undefined && { businessId: raw.businessId }),
  };

  if (!hasRole(session, allowedRoles)) {
    throw new ForbiddenError(session.role, "action", "perform");
  }

  return session;
}

/**
 * Server action factory: auth check + RLS-scoped transaction in one wrapper.
 *
 * Usage (in a 'use server' file):
 *   export const createEntry = withAction(['owner', 'admin'], async (ctx, input) => {
 *     return ctx.tx.insert(cashEntries).values({ ... });
 *   });
 */
export function withAction<TArgs extends unknown[], TResult>(
  allowedRoles: Role[],
  fn: (ctx: ActionContext, ...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<ActionResult<TResult>> {
  return async (...args: TArgs): Promise<ActionResult<TResult>> => {
    // Resolve session first; map auth errors to ActionResult without throwing
    const authResult = await requireSession(allowedRoles).then(
      (session) => ({ ok: true as const, session }),
      (err: unknown) => ({ ok: false as const, err }),
    );

    if (!authResult.ok) {
      const { err } = authResult;
      if (err instanceof ForbiddenError) {
        return { ok: false, error: "forbidden", message: err.message };
      }
      return { ok: false, error: "unauthenticated" };
    }

    const { session } = authResult;

    try {
      const data = await withUserContext(db, session.userId, session.role, (tx) =>
        fn({ session, tx }, ...args),
      );
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: "server_error",
        message: err instanceof Error ? err.message : "Unknown error",
      };
    }
  };
}

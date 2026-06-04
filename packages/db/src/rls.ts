import type { Role } from "@kasb/core";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

type KasbDB = PostgresJsDatabase<typeof schema>;

/**
 * Wraps a database operation in a transaction that sets the RLS context.
 *
 * Every query inside `fn` runs with PostgreSQL's `app.current_user` and
 * `app.current_role` session variables set — the RLS policies in rls.sql
 * read these to enforce row-level isolation.
 *
 * The `SET LOCAL` semantics of `set_config(..., true)` mean the variables
 * are automatically cleared when the transaction ends.
 *
 * Usage:
 *   const entries = await withUserContext(db, session.userId, session.role, (tx) =>
 *     tx.select().from(cashEntries).where(eq(cashEntries.businessId, businessId))
 *   );
 */
export async function withUserContext<T>(
  db: KasbDB,
  userId: string,
  role: Role,
  fn: (tx: KasbDB) => Promise<T>,
  partnerOrgId?: string,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user', ${userId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_role', ${role}, true)`);
    // Set partner context for partner-role users (used by credit_applications RLS)
    await tx.execute(sql`SELECT set_config('app.current_partner', ${partnerOrgId ?? ""}, true)`);
    return fn(tx as unknown as KasbDB);
  });
}

import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Reuse the same connection pool across Next.js hot reloads in development
const g = globalThis as unknown as { _kasb_pg?: ReturnType<typeof postgres> };

// biome-ignore lint/style/noNonNullAssertion: DATABASE_URL must be set at runtime
const pg = g._kasb_pg ?? postgres(process.env.DATABASE_URL!, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  g._kasb_pg = pg;
}

export const db = drizzle(pg, { schema });

export type KasbDB = PostgresJsDatabase<typeof schema>;

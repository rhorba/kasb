// S0-04: schema + client
export * from "./schema";
export { db } from "./client";
export type { KasbDB } from "./client";

// S0-05: RLS helper
export { withUserContext } from "./rls";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: DATABASE_URL must be set before running migrations
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});

import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Only measure coverage of testable logic — exclude UI, config, generated files
      include: ["src/actions/**/*.ts", "src/lib/**/*.ts"],
      exclude: [
        "src/tests/**",
        "src/lib/idb/db.ts", // browser-only IndexedDB factory
        "src/lib/idb/schema.ts", // pure TypeScript types/interfaces — no executable JS
        "src/lib/idb/index.ts", // re-exports only
        "src/lib/voice/**", // Web Speech API — browser-only
        "src/lib/ocr/**", // OCR — browser-only
        "src/**/*.d.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@kasb/core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@kasb/db": resolve(__dirname, "../../packages/db/src/index.ts"),
      "@kasb/cashbook": resolve(__dirname, "../../packages/cashbook/src/index.ts"),
      "@kasb/credit": resolve(__dirname, "../../packages/credit/src/index.ts"),
      "@kasb/inventory": resolve(__dirname, "../../packages/inventory/src/index.ts"),
      "@kasb/whatsapp": resolve(__dirname, "../../packages/whatsapp/src/index.ts"),
      "@kasb/notifications": resolve(__dirname, "../../packages/notifications/src/index.ts"),
    },
  },
});

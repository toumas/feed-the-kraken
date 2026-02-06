import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.test.tsx", "**/*.test.ts"],
    setupFiles: ["./vitest.setup.tsx"],
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "party/**/*.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/types.ts",
        "app/i18n/**",
      ],
      thresholds: {
        autoUpdate: true,
        lines: 59.89,
        functions: 60.48,
        branches: 55.32,
        statements: 58.63,
      },
    },
  },
});
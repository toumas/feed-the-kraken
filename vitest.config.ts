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
        lines: 51.59,
        functions: 51.31,
        branches: 47.58,
        statements: 50.63,
      },
    },
  },
});
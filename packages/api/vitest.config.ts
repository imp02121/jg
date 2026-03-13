import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/types/**"],
    },
  },
  resolve: {
    alias: {
      "@history-gauntlet/shared": "../../shared/src/index.ts",
    },
  },
});

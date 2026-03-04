import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e"],
    setupFiles: ["./tests/setup.ts"],
    env: {
      BETTER_AUTH_SECRET: "test-secret-do-not-use-in-production",
      BETTER_AUTH_URL: "http://localhost:3000",
      DATABASE_PATH: "./data/test.db",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

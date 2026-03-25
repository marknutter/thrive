import { defineConfig } from "drizzle-kit";

const isPg = process.env.DATABASE_URL?.startsWith("postgres");

export default defineConfig({
  schema: isPg ? "./lib/schema.pg.ts" : "./lib/schema.sqlite.ts",
  out: "./drizzle",
  dialect: isPg ? "postgresql" : "sqlite",
  dbCredentials: isPg
    ? { url: process.env.DATABASE_URL! }
    : { url: process.env.DATABASE_PATH || "./data/thrive.db" },
  // Exclude Better Auth tables — they manage their own schema.
  tablesFilter: ["!user", "!session", "!account", "!verification", "!twoFactor"],
});

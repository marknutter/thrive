import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { runMigrations } from "./migrate";

let db: InstanceType<typeof Database> | null = null;

export function getDb(): InstanceType<typeof Database> {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || "./data/sprintbook.db";
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run any pending app migrations automatically on startup.
  // Better Auth manages its own tables (user, session, account, etc.)
  runMigrations(db);

  return db;
}

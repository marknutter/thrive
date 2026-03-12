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
  // WAL mode doesn't work reliably through Docker bind mounts on macOS.
  // Use DELETE journal mode in dev, WAL in prod (which uses a Docker volume).
  db.pragma(process.env.NODE_ENV === "production" ? "journal_mode = WAL" : "journal_mode = DELETE");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  // Initialize Better Auth schema (idempotent — safe on every startup).
  db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER NOT NULL DEFAULT 0,
      name TEXT,
      image TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      twoFactorEnabled INTEGER NOT NULL DEFAULT 0,
      plan TEXT DEFAULT 'free',
      stripeCustomerId TEXT,
      stripeSubscriptionId TEXT,
      subscriptionStatus TEXT DEFAULT 'inactive'
    );
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expiresAt INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      accessToken TEXT,
      refreshToken TEXT,
      idToken TEXT,
      expiresAt INTEGER,
      password TEXT,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
      accessTokenExpiresAt INTEGER,
      refreshTokenExpiresAt INTEGER,
      scope TEXT,
      UNIQUE(providerId, accountId)
    );
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER,
      updatedAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS twoFactor (
      id TEXT PRIMARY KEY,
      secret TEXT NOT NULL,
      backupCodes TEXT NOT NULL,
      userId TEXT NOT NULL UNIQUE REFERENCES user(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
    CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
    CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
    CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
  `);

  // Run any pending app-specific migrations (migrations/*.sql).
  runMigrations(db);

  return db;
}

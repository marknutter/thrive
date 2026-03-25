/**
 * Better Auth schema bootstrap for SQLite.
 *
 * Creates the Better Auth tables if they don't exist.
 * This is idempotent and runs on every SQLite startup.
 *
 * Generated via: npx @better-auth/cli generate --config lib/auth.ts
 */

import Database from "better-sqlite3";

const SCHEMA_DDL = `
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
`;

/**
 * Create the Better Auth schema tables in the given SQLite database.
 * Uses better-sqlite3's multi-statement execution method.
 */
export function bootstrapBetterAuthTables(db: InstanceType<typeof Database>): void {
  db.exec(SCHEMA_DDL);
}

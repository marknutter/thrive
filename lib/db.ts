/**
 * Database access — dual-dialect (SQLite / PostgreSQL).
 *
 * Exports:
 *   getDb()    — Drizzle ORM instance (primary access for all CRUD).
 *                Returns BetterSQLite3Database when dialect is sqlite,
 *                or NodePgDatabase when dialect is pg.
 *   getRawDb() — Raw database interface for dialect-specific operations.
 *                For SQLite, the `.native` property gives the better-sqlite3 instance.
 *
 * Backward compatibility:
 *   `getDb()` previously returned a raw better-sqlite3 instance. It now returns
 *   a Drizzle ORM instance. Existing call sites that use raw SQL should switch
 *   to `getRawDb()` or `getSqliteNative()` from `./db-raw-sqlite`.
 */

import Database from "better-sqlite3";
import { drizzle as drizzleSqlite, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { getDialect } from "./db-dialect";
import { runMigrations } from "./migrate";
import { bootstrapBetterAuthTables } from "./db-bootstrap";
import crypto from "crypto";
import path from "path";
import fs from "fs";

// Re-export schema based on dialect
import * as sqliteSchema from "./schema.sqlite";

// Re-export raw db for convenience
export { getRawDb } from "./db-raw";

type DrizzleDb = BetterSQLite3Database<typeof sqliteSchema>;

let _drizzleDb: DrizzleDb | null = null;
let _rawSqliteDb: InstanceType<typeof Database> | null = null;

/**
 * Get the Drizzle ORM database instance.
 * This is the primary database access method for all standard CRUD operations.
 *
 * NOTE: This previously returned a raw better-sqlite3 instance. Callers using
 * raw SQL should migrate to `getRawDb()` from `@/lib/db-raw`.
 */
export function getDb(): DrizzleDb {
  if (_drizzleDb) return _drizzleDb;

  const dialect = getDialect();

  if (dialect === "pg") {
    // PostgreSQL path — lazy-load to avoid importing pg when using SQLite
    const { drizzle: drizzlePg } = require("drizzle-orm/node-postgres");
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const pgSchema = require("./schema.pg");
    _drizzleDb = drizzlePg(pool, { schema: pgSchema }) as unknown as DrizzleDb;
    return _drizzleDb;
  }

  // SQLite path
  const raw = initSqliteDb();
  _drizzleDb = drizzleSqlite(raw, { schema: sqliteSchema });
  return _drizzleDb;
}

/**
 * Get the raw better-sqlite3 instance directly.
 * Use this for FTS5, PRAGMA, sqlite_master, and other SQLite-specific queries
 * that Drizzle cannot express. Only works when dialect is "sqlite".
 */
export function getSqliteDb(): InstanceType<typeof Database> {
  if (getDialect() !== "sqlite") {
    throw new Error("getSqliteDb() is only available when using SQLite dialect.");
  }
  return initSqliteDb();
}

function initSqliteDb(): InstanceType<typeof Database> {
  if (_rawSqliteDb) return _rawSqliteDb;

  const dbPath = process.env.DATABASE_PATH || "./data/thrive.db";
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _rawSqliteDb = new Database(dbPath);
  // WAL mode doesn't work reliably through Docker bind mounts on macOS.
  // Use DELETE journal mode in dev, WAL in prod (which uses a Docker volume).
  _rawSqliteDb.pragma(process.env.NODE_ENV === "production" ? "journal_mode = WAL" : "journal_mode = DELETE");
  _rawSqliteDb.pragma("busy_timeout = 5000");
  _rawSqliteDb.pragma("foreign_keys = ON");

  // Initialize Better Auth schema (idempotent — safe on every startup).
  bootstrapBetterAuthTables(_rawSqliteDb);

  // Run any pending app-specific migrations (migrations/*.sql).
  runMigrations(_rawSqliteDb);

  // Seed default admin user (admin@example.com / password) if not already present.
  seedDefaultAdmin(_rawSqliteDb);

  return _rawSqliteDb;
}

function seedDefaultAdmin(db: InstanceType<typeof Database>): void {
  // Uses Node crypto.scryptSync matching Better Auth's scrypt params (N=16384, r=16, p=1, dkLen=64).
  const existingAdmin = db.prepare("SELECT id FROM user WHERE email = 'admin@example.com'").get();
  if (!existingAdmin) {
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const salt = crypto.randomBytes(16).toString("hex");
    const key = crypto.scryptSync("password", salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 });
    const passwordHash = `${salt}:${key.toString("hex")}`;

    db.prepare(
      `INSERT INTO user (id, email, emailVerified, name, createdAt, updatedAt, plan, subscriptionStatus, isAdmin)
       VALUES (?, 'admin@example.com', 1, 'Admin', ?, ?, 'free', 'inactive', 1)`
    ).run(userId, now, now);

    db.prepare(
      `INSERT INTO account (id, accountId, providerId, userId, password)
       VALUES (?, ?, 'credential', ?, ?)`
    ).run(accountId, userId, userId, passwordHash);
  }
}

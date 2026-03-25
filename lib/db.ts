/**
 * Database access — dual-dialect (SQLite / PostgreSQL).
 *
 * Exports:
 *   getDb()      — Drizzle ORM instance (primary access for all CRUD).
 *   getRawDb()   — Raw better-sqlite3 instance (SQLite only).
 *   getPgPool()  — Raw pg Pool instance (PG only).
 *
 * The consumer-facing DB type is BetterSQLite3Database (the canonical type).
 * When running PG, the instance is cast to this type — at runtime, Drizzle
 * generates correct dialect SQL regardless of the schema object types.
 */

import Database from "better-sqlite3";
import { drizzle as drizzleSqlite, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { runMigrations } from "./migrate";
import { isPg } from "./db-dialect";
import { bootstrapBetterAuthTables } from "./db-bootstrap";
import * as sqliteSchema from "./schema.sqlite";

/**
 * The consumer-facing DB type. SQLite is the canonical type.
 * When running PG, the instance is cast to this type — at runtime, Drizzle
 * generates correct dialect SQL regardless of the schema object types.
 */
export type AppDatabase = BetterSQLite3Database<typeof sqliteSchema>;

let rawDb: InstanceType<typeof Database> | null = null;
let drizzleDb: AppDatabase | null = null;
let pgPool: unknown = null;

/**
 * Get the raw better-sqlite3 instance.
 * Use this for FTS5, PRAGMA, sqlite_master, and other SQLite-specific queries
 * that Drizzle cannot express.
 *
 * Throws if running against PostgreSQL — use getRawAdapter() instead.
 */
export function getRawDb(): InstanceType<typeof Database> {
  if (isPg()) {
    throw new Error("getRawDb() is not available when using PostgreSQL. Use getRawAdapter() instead.");
  }
  return initSqliteDb();
}

/**
 * Get the Drizzle ORM database instance.
 * This is the primary database access method for all standard CRUD operations.
 * Works for both SQLite and PostgreSQL.
 */
export function getDb(): AppDatabase {
  if (drizzleDb) return drizzleDb;

  if (isPg()) {
    return initPgDb();
  } else {
    const raw = initSqliteDb();
    drizzleDb = drizzleSqlite(raw, { schema: sqliteSchema });
    return drizzleDb;
  }
}

/**
 * Get the PG pool instance (for raw PG queries).
 * Returns null if not using PostgreSQL.
 */
export function getPgPool(): unknown {
  return pgPool;
}

// ─── SQLite initialization ──────────────────────────────────────────────────

function initSqliteDb(): InstanceType<typeof Database> {
  if (rawDb) return rawDb;

  const dbPath = process.env.DATABASE_PATH || "./data/thrive.db";
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  rawDb = new Database(dbPath);
  // WAL mode doesn't work reliably through Docker bind mounts on macOS.
  // Use DELETE journal mode in dev, WAL in prod (which uses a Docker volume).
  rawDb.pragma(process.env.NODE_ENV === "production" ? "journal_mode = WAL" : "journal_mode = DELETE");
  rawDb.pragma("busy_timeout = 5000");
  rawDb.pragma("foreign_keys = ON");

  // Initialize Better Auth schema (idempotent — safe on every startup).
  bootstrapBetterAuthTables(rawDb);

  // Run any pending app-specific migrations (migrations/*.sql).
  runMigrations(rawDb);

  // Register built-in job handlers (always — so processJobs works from any entry point).
  // Lazy import to avoid circular dependency at module load time.
  const { registerBuiltinJobs, startBuiltinCrons } = require("@/jobs/index");
  registerBuiltinJobs();

  // Start in-process cron scheduler only when explicitly enabled
  // (avoids running during build or in serverless environments).
  if (process.env.ENABLE_CRON === "true") {
    startBuiltinCrons();
  }

  // Bootstrap admin users from ADMIN_EMAILS env var
  bootstrapAdminUsers(rawDb);

  // Seed default admin user
  seedDefaultAdmin(rawDb);

  return rawDb;
}

function bootstrapAdminUsers(db: InstanceType<typeof Database>): void {
  const adminEmails = process.env.ADMIN_EMAILS;
  if (adminEmails) {
    const emails = adminEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const stmt = db.prepare("UPDATE user SET isAdmin = 1 WHERE LOWER(email) = ? AND isAdmin = 0");
    for (const email of emails) {
      stmt.run(email);
    }
  }
}

function seedDefaultAdmin(db: InstanceType<typeof Database>): void {
  // Seed default admin user (admin@example.com / password) if not already present.
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

// ─── PostgreSQL initialization ──────────────────────────────────────────────

function initPgDb(): AppDatabase {
  if (drizzleDb) return drizzleDb;

  // Dynamic imports for PG — these packages are optional for SQLite-only installs
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzlePg } = require("drizzle-orm/node-postgres");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pgSchema = require("./schema.pg");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pgPool = pool;

  drizzleDb = drizzlePg(pool, { schema: pgSchema }) as unknown as AppDatabase;

  // Register built-in job handlers
  const { registerBuiltinJobs, startBuiltinCrons } = require("@/jobs/index");
  registerBuiltinJobs();

  if (process.env.ENABLE_CRON === "true") {
    startBuiltinCrons();
  }

  return drizzleDb;
}

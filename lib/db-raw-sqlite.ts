/**
 * Raw SQLite database access via better-sqlite3.
 *
 * This module is only imported when the dialect is "sqlite".
 * It provides the RawDb interface plus direct access to the
 * underlying better-sqlite3 instance for SQLite-specific operations
 * (FTS5, PRAGMA, etc.).
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { RawDb } from "./db-raw";

let _sqliteDb: InstanceType<typeof Database> | null = null;

export interface SqliteRawDb extends RawDb {
  /** The underlying better-sqlite3 instance for SQLite-specific operations. */
  native: InstanceType<typeof Database>;
}

export function getSqliteNative(): InstanceType<typeof Database> {
  if (_sqliteDb) return _sqliteDb;
  createSqliteRawDb();
  return _sqliteDb!;
}

export function createSqliteRawDb(): SqliteRawDb {
  if (_sqliteDb) {
    return wrapSqlite(_sqliteDb);
  }

  const dbPath = process.env.DATABASE_PATH || "./data/thrive.db";
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _sqliteDb = new Database(dbPath);
  // WAL mode doesn't work reliably through Docker bind mounts on macOS.
  // Use DELETE journal mode in dev, WAL in prod (which uses a Docker volume).
  _sqliteDb.pragma(process.env.NODE_ENV === "production" ? "journal_mode = WAL" : "journal_mode = DELETE");
  _sqliteDb.pragma("busy_timeout = 5000");
  _sqliteDb.pragma("foreign_keys = ON");

  return wrapSqlite(_sqliteDb);
}

function wrapSqlite(db: InstanceType<typeof Database>): SqliteRawDb {
  return {
    native: db,
    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
      const stmt = db.prepare(sql);
      return (params ? stmt.all(...params) : stmt.all()) as T[];
    },
    run(sql: string, params?: unknown[]): void {
      const stmt = db.prepare(sql);
      if (params) {
        stmt.run(...params);
      } else {
        stmt.run();
      }
    },
    runDDL(sql: string): void {
      db.exec(sql);
    },
  };
}

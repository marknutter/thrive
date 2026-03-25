/**
 * Raw database access — dialect-aware router.
 *
 * Provides `getRawDb()` and `rawQuery()` / `rawRun()` that work
 * against either SQLite or PostgreSQL depending on DATABASE_URL.
 *
 * For SQLite, returns the underlying better-sqlite3 instance.
 * For PostgreSQL, returns a pg Pool wrapper.
 */

import { getDialect } from "./db-dialect";

export type RawQueryResult = Record<string, unknown>[];

export interface RawDb {
  /** Run a read query and return rows. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
  /** Run a write statement (INSERT/UPDATE/DELETE). */
  run(sql: string, params?: unknown[]): void;
  /** Run raw SQL (e.g., CREATE TABLE). No params. */
  runDDL(sql: string): void;
}

let _rawDb: RawDb | null = null;

/**
 * Get the raw database interface.
 * For SQLite, this also exposes the underlying better-sqlite3 instance via `.native`.
 */
export function getRawDb(): RawDb {
  if (_rawDb) return _rawDb;

  if (getDialect() === "sqlite") {
    const { createSqliteRawDb } = require("./db-raw-sqlite");
    _rawDb = createSqliteRawDb();
  } else {
    const { createPgRawDb } = require("./db-raw-pg");
    _rawDb = createPgRawDb();
  }

  return _rawDb!;
}

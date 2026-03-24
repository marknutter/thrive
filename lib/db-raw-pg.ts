/**
 * Raw PostgreSQL database access via pg Pool.
 *
 * This module is only imported when the dialect is "pg" (DATABASE_URL is set).
 * It provides the RawDb interface for direct SQL queries against PostgreSQL.
 *
 * NOTE: PostgreSQL queries are async, but the RawDb interface is sync
 * to maintain compatibility with the SQLite path. For PG, most raw queries
 * should go through Drizzle instead.
 */

import type { RawDb } from "./db-raw";

let _pool: import("pg").Pool | null = null;

function getPool(): import("pg").Pool {
  if (_pool) return _pool;
  // Dynamic import to avoid requiring pg when using SQLite
  const { Pool } = require("pg");
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  return _pool!;
}

export function createPgRawDb(): RawDb {
  return {
    query<T = Record<string, unknown>>(_sql: string, _params?: unknown[]): T[] {
      // For PG raw queries, we provide a synchronous-looking API that
      // cannot actually work synchronously with PostgreSQL.
      // This is a fallback — prefer using Drizzle for PG queries.
      throw new Error(
        "Raw synchronous queries are not supported with PostgreSQL. " +
        "Use Drizzle ORM or call getPgPool().query() directly for async PG queries."
      );
    },
    run(_sql: string, _params?: unknown[]): void {
      throw new Error(
        "Raw synchronous run is not supported with PostgreSQL. " +
        "Use Drizzle ORM or call getPgPool().query() directly for async PG queries."
      );
    },
    runDDL(_sql: string): void {
      throw new Error(
        "Raw synchronous runDDL is not supported with PostgreSQL. " +
        "Use Drizzle ORM migrations instead."
      );
    },
  };
}

/**
 * Get the underlying pg Pool for async queries.
 * Use this when you need direct PG access outside of Drizzle.
 */
export function getPgPool(): import("pg").Pool {
  return getPool();
}

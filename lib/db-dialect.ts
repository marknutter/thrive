/**
 * Database dialect detection.
 *
 * Reads DATABASE_URL to decide between SQLite and PostgreSQL.
 * If DATABASE_URL is set and starts with "postgres", use PG; otherwise SQLite.
 */

export type Dialect = "sqlite" | "pg";

let _dialect: Dialect | null = null;

export function getDialect(): Dialect {
  if (_dialect) return _dialect;
  const url = process.env.DATABASE_URL;
  _dialect = url && url.startsWith("postgres") ? "pg" : "sqlite";
  return _dialect;
}

export function isPg(): boolean {
  return getDialect() === "pg";
}

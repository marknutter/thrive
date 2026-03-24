/**
 * Database dialect detection.
 *
 * Reads DATABASE_URL to decide between PostgreSQL and SQLite.
 * Every other db-related module imports this to branch on dialect.
 */

export type DbDialect = "sqlite" | "pg";

let _dialect: DbDialect | null = null;

export function getDialect(): DbDialect {
  if (_dialect) return _dialect;

  const url = process.env.DATABASE_URL;
  if (url && (url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
    _dialect = "pg";
  } else {
    _dialect = "sqlite";
  }

  return _dialect;
}

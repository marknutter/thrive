/**
 * Dialect-agnostic database helper utilities.
 *
 * These helpers let application code work identically across SQLite and
 * PostgreSQL without caring which dialect is active.
 */

import { getDialect } from "./db-dialect";
import { sql } from "drizzle-orm";

/**
 * Returns a Drizzle SQL expression for "now as unix epoch seconds",
 * appropriate for the current dialect.
 *
 *   SQLite:  (unixepoch())
 *   PG:      extract(epoch from now())::integer
 */
export function nowEpoch() {
  return getDialect() === "sqlite"
    ? sql`(unixepoch())`
    : sql`extract(epoch from now())::integer`;
}

/**
 * Returns a Drizzle SQL expression for CURRENT_TIMESTAMP,
 * appropriate for the current dialect.
 *
 *   SQLite:  CURRENT_TIMESTAMP
 *   PG:      now()
 */
export function nowTimestamp() {
  return getDialect() === "sqlite"
    ? sql`CURRENT_TIMESTAMP`
    : sql`now()`;
}

/**
 * Returns a SQL fragment for boolean true, appropriate for the dialect.
 *
 *   SQLite:  1
 *   PG:      true
 */
export function sqlTrue() {
  return getDialect() === "sqlite" ? sql`1` : sql`true`;
}

/**
 * Returns a SQL fragment for boolean false, appropriate for the dialect.
 *
 *   SQLite:  0
 *   PG:      false
 */
export function sqlFalse() {
  return getDialect() === "sqlite" ? sql`0` : sql`false`;
}

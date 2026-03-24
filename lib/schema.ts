/**
 * Schema barrel — re-exports the correct dialect's schema.
 *
 * For now, Thrive uses SQLite by default. When PostgreSQL support is needed,
 * this can be made dynamic based on the dialect. Drizzle config already
 * points to the correct schema file directly.
 */

export * from "./schema.sqlite";

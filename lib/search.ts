/**
 * Full-text search using SQLite FTS5.
 *
 * Usage:
 *   import { searchItems } from "@/lib/search";
 *   const results = searchItems(userId, "garden tools");
 */

import { getRawDb } from "@/lib/db";

interface SearchResult {
  id: string;
  name: string;
  description: string;
  snippet: string;
  rank: number;
}

/**
 * Search items using FTS5 for a given user.
 * Returns results with highlighted snippets.
 */
export function searchItems(
  userId: string,
  query: string,
  limit = 20,
): SearchResult[] {
  const db = getRawDb();

  if (!query.trim()) return [];

  // Escape FTS5 special characters and build search query
  const sanitized = query.replace(/['"*()]/g, "").trim();
  if (!sanitized) return [];

  // Use prefix matching for better partial word results
  const ftsQuery = sanitized
    .split(/\s+/)
    .map((term) => `"${term}"*`)
    .join(" ");

  try {
    const results = db.query<SearchResult>(
      `SELECT
        items.id,
        items.name,
        items.description,
        snippet(items_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
        rank
      FROM items_fts
      JOIN items ON items.rowid = items_fts.rowid
      WHERE items_fts MATCH ?
        AND items.user_id = ?
      ORDER BY rank
      LIMIT ?`,
      [ftsQuery, userId, limit],
    );

    return results;
  } catch {
    // If FTS query syntax is invalid, fall back to LIKE search
    const likeQuery = `%${sanitized}%`;
    return db.query<SearchResult>(
      `SELECT id, name, description, name as snippet, 0 as rank
      FROM items
      WHERE user_id = ? AND (name LIKE ? OR description LIKE ?)
      LIMIT ?`,
      [userId, likeQuery, likeQuery, limit],
    );
  }
}

/**
 * Rebuild the FTS index from the items table.
 * Useful after bulk imports or migration.
 */
export function rebuildSearchIndex(): void {
  const db = getRawDb();
  db.run("INSERT INTO items_fts(items_fts) VALUES('rebuild')");
}

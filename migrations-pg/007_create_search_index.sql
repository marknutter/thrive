-- UP
-- PostgreSQL full-text search index for items.
-- Uses GIN index on tsvector instead of SQLite FTS5.

ALTER TABLE items ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_items_search ON items USING GIN(search_vector);

-- Function to update search vector on insert/update
CREATE OR REPLACE FUNCTION items_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep search index in sync
DROP TRIGGER IF EXISTS items_search_trigger ON items;
CREATE TRIGGER items_search_trigger
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION items_search_update();

-- Backfill existing rows
UPDATE items SET search_vector = to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''));

-- DOWN
DROP TRIGGER IF EXISTS items_search_trigger ON items;
DROP FUNCTION IF EXISTS items_search_update();
DROP INDEX IF EXISTS idx_items_search;
ALTER TABLE items DROP COLUMN IF EXISTS search_vector;

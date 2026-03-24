-- UP
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  name,
  description,
  content='items',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS items_fts_insert AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, name, description) VALUES (NEW.rowid, NEW.name, NEW.description);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_delete AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, name, description) VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_update AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, name, description) VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
  INSERT INTO items_fts(rowid, name, description) VALUES (NEW.rowid, NEW.name, NEW.description);
END;

-- DOWN
DROP TRIGGER IF EXISTS items_fts_update;
DROP TRIGGER IF EXISTS items_fts_delete;
DROP TRIGGER IF EXISTS items_fts_insert;
DROP TABLE IF EXISTS items_fts;

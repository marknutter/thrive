-- Create the items table for user-owned resources.
-- Better Auth manages its own tables (user, session, account, etc.)

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);

-- DOWN

DROP INDEX IF EXISTS idx_items_user_id;
DROP TABLE IF EXISTS items;

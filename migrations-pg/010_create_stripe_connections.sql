CREATE TABLE IF NOT EXISTS stripe_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT NOT NULL DEFAULT 'read_only',
  stripe_publishable_key TEXT,
  business_name TEXT,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  UNIQUE(user_id, stripe_account_id)
);

CREATE INDEX idx_stripe_connections_user_id ON stripe_connections(user_id);

-- DOWN

DROP INDEX IF EXISTS idx_stripe_connections_user_id;
DROP TABLE IF EXISTS stripe_connections;

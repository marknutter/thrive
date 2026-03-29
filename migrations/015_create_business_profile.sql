CREATE TABLE IF NOT EXISTS business_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, field_key)
);

CREATE INDEX idx_business_profiles_user ON business_profiles(user_id);

-- DOWN

DROP INDEX IF EXISTS idx_business_profiles_user;
DROP TABLE IF EXISTS business_profiles;

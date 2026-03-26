CREATE TABLE IF NOT EXISTS onboarding_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, skipped
  notes TEXT,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, step_key)
);

CREATE INDEX idx_onboarding_user ON onboarding_progress(user_id);

-- DOWN
DROP TABLE IF EXISTS onboarding_progress;

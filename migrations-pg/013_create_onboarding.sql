CREATE TABLE IF NOT EXISTS onboarding_progress (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, skipped
  notes TEXT,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);

-- DOWN
DROP TABLE IF EXISTS onboarding_progress;

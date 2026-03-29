CREATE TABLE IF NOT EXISTS coaching_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, milestone_key)
);
CREATE INDEX idx_coaching_milestones_user ON coaching_milestones(user_id);

-- DOWN
DROP TABLE IF EXISTS coaching_milestones;

-- UP
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_userId_read ON notifications("userId", read);

-- DOWN
DROP INDEX IF EXISTS idx_notifications_userId_read;
DROP INDEX IF EXISTS idx_notifications_userId;
DROP TABLE IF EXISTS notifications;

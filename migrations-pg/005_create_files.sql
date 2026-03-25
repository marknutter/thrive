-- UP
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  "contentType" TEXT NOT NULL DEFAULT 'application/octet-stream',
  size INTEGER NOT NULL DEFAULT 0,
  "storageBackend" TEXT NOT NULL DEFAULT 'local',
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_files_userId ON files("userId");
CREATE INDEX IF NOT EXISTS idx_files_key ON files(key);

-- DOWN
DROP INDEX IF EXISTS idx_files_key;
DROP INDEX IF EXISTS idx_files_userId;
DROP TABLE IF EXISTS files;

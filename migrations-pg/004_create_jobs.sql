CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "lastError" TEXT,
  "scheduledAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  "startedAt" BIGINT,
  "completedAt" BIGINT,
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);
CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled ON jobs(status, "scheduledAt");
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);

-- DOWN
DROP INDEX IF EXISTS idx_jobs_type;
DROP INDEX IF EXISTS idx_jobs_status_scheduled;
DROP TABLE IF EXISTS jobs;

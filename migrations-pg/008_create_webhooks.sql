-- UP
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  "updatedAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_webhooks_userId ON webhooks("userId");

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  "webhookId" TEXT NOT NULL,
  event TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  "responseStatus" INTEGER,
  "responseBody" TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  "completedAt" BIGINT,
  FOREIGN KEY ("webhookId") REFERENCES webhooks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhookId ON webhook_deliveries("webhookId");
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_createdAt ON webhook_deliveries("createdAt");

-- DOWN
DROP INDEX IF EXISTS idx_webhook_deliveries_createdAt;
DROP INDEX IF EXISTS idx_webhook_deliveries_webhookId;
DROP TABLE IF EXISTS webhook_deliveries;
DROP INDEX IF EXISTS idx_webhooks_userId;
DROP TABLE IF EXISTS webhooks;

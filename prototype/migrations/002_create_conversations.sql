CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'GTM Intake Workshop',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  attachments_meta TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- DOWN
DROP INDEX IF EXISTS idx_messages_conversation_id;
DROP TABLE IF EXISTS messages;
DROP INDEX IF EXISTS idx_conversations_user_id;
DROP TABLE IF EXISTS conversations;

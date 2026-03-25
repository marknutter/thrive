-- UP
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT now()::text,
  updated_at TEXT DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT now()::text,
  UNIQUE(user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Seed default roles
INSERT INTO roles (id, name, description, permissions, is_system) VALUES
  ('role_owner', 'owner', 'Full system access', '["*"]', 1),
  ('role_admin', 'admin', 'Administrative access', '["admin:users","admin:roles","admin:settings","admin:waitlist","admin:logs","admin:analytics","admin:crm","admin:database","items:create","items:read","items:update","items:delete"]', 1),
  ('role_member', 'member', 'Standard member access', '["items:create","items:read","items:update","items:delete"]', 1)
ON CONFLICT (id) DO NOTHING;

-- Backfill: assign admin role to existing isAdmin users
INSERT INTO user_roles (user_id, role_id)
  SELECT id, 'role_admin' FROM "user" WHERE "isAdmin" = true
ON CONFLICT (user_id, role_id) DO NOTHING;

-- DOWN
DROP INDEX IF EXISTS idx_user_roles_role_id;
DROP INDEX IF EXISTS idx_user_roles_user_id;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;

/**
 * Drizzle ORM schema definitions for SQLite.
 *
 * Better Auth tables (user, session, account, verification, twoFactor) are
 * defined here as reference-only — they are excluded from drizzle-kit migrations
 * via tablesFilter in drizzle.config.ts. They exist so we can use them in
 * JOINs and get proper FK types.
 *
 * Column names match the existing DB exactly (mixed snake_case/camelCase).
 */

import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Better Auth Tables (reference-only, not managed by drizzle-kit) ─────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified").notNull().default(0),
  name: text("name"),
  image: text("image"),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  twoFactorEnabled: integer("twoFactorEnabled").notNull().default(0),
  plan: text("plan").default("free"),
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  subscriptionStatus: text("subscriptionStatus").default("inactive"),
  isAdmin: integer("isAdmin").notNull().default(0),
  disabled: integer("disabled").notNull().default(0),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [
  index("idx_session_userId").on(table.userId),
  index("idx_session_token").on(table.token),
]);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  expiresAt: integer("expiresAt"),
  password: text("password"),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt").notNull().default(sql`(unixepoch())`),
  accessTokenExpiresAt: integer("accessTokenExpiresAt"),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt"),
  scope: text("scope"),
}, (table) => [
  uniqueIndex("account_providerId_accountId_unique").on(table.providerId, table.accountId),
  index("idx_account_userId").on(table.userId),
]);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt").notNull(),
  createdAt: integer("createdAt"),
  updatedAt: integer("updatedAt"),
}, (table) => [
  index("idx_verification_identifier").on(table.identifier),
]);

export const twoFactor = sqliteTable("twoFactor", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backupCodes").notNull(),
  userId: text("userId").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
});

// ─── App Tables (managed by drizzle-kit migrations) ──────────────────────────

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => user.id),
  name: text("name").notNull(),
  description: text("description").default(""),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_items_user_id").on(table.user_id),
]);

// ─── Thrive Conversation Tables ──────────────────────────────────────────────

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => user.id),
  title: text("title").notNull().default("GTM Intake Workshop"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_conversations_user_id").on(table.user_id),
]);

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversation_id: text("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull().default(""),
  attachments_meta: text("attachments_meta"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_messages_conversation_id").on(table.conversation_id),
]);

// ─── Admin & System Tables ───────────────────────────────────────────────────

export const adminLogs = sqliteTable("admin_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  admin_id: text("admin_id").notNull().references(() => user.id),
  action: text("action").notNull(),
  target_type: text("target_type"),
  target_id: text("target_id"),
  details: text("details"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_admin_logs_admin_id").on(table.admin_id),
  index("idx_admin_logs_created_at").on(table.created_at),
]);

export const planOverrides = sqliteTable("plan_overrides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: text("user_id").notNull().unique().references(() => user.id),
  plan: text("plan").notNull().default("pro"),
  reason: text("reason"),
  granted_by: text("granted_by").notNull().references(() => user.id),
  expires_at: text("expires_at"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_plan_overrides_user_id").on(table.user_id),
]);

export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  status: text("status").default("active"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const blogPosts = sqliteTable("blog_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  status: text("status").default("draft"),
  author_id: text("author_id").references(() => user.id),
  published_at: text("published_at"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: text("payload").notNull().default("{}"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("maxAttempts").notNull().default(3),
  lastError: text("lastError"),
  scheduledAt: integer("scheduledAt").notNull().default(sql`(unixepoch())`),
  startedAt: integer("startedAt"),
  completedAt: integer("completedAt"),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_jobs_status_scheduled").on(table.status, table.scheduledAt),
  index("idx_jobs_type").on(table.type),
]);

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  filename: text("filename").notNull(),
  contentType: text("contentType").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  storageBackend: text("storageBackend").notNull().default("local"),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_files_userId").on(table.userId),
  index("idx_files_key").on(table.key),
]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull().default(""),
  read: integer("read").notNull().default(0),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_notifications_userId").on(table.userId),
  index("idx_notifications_userId_read").on(table.userId, table.read),
]);

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").notNull().default("[]"),
  active: integer("active").notNull().default(1),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt").notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_webhooks_userId").on(table.userId),
]);

export const webhookDeliveries = sqliteTable("webhook_deliveries", {
  id: text("id").primaryKey(),
  webhookId: text("webhookId").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: text("payload").notNull().default("{}"),
  responseStatus: integer("responseStatus"),
  responseBody: text("responseBody"),
  success: integer("success").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("lastError"),
  createdAt: integer("createdAt").notNull().default(sql`(unixepoch())`),
  completedAt: integer("completedAt"),
}, (table) => [
  index("idx_webhook_deliveries_webhookId").on(table.webhookId),
  index("idx_webhook_deliveries_createdAt").on(table.createdAt),
]);

export const _migrations = sqliteTable("_migrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  applied_at: text("applied_at").default(sql`CURRENT_TIMESTAMP`),
});

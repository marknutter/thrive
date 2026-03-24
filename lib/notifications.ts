/**
 * In-app notification helpers.
 *
 * Usage:
 *   import { createNotification, getUnreadCount } from "@/lib/notifications";
 *   createNotification(userId, "welcome", "Welcome!", "Thanks for signing up.");
 */

import crypto from "crypto";
import { eq, and, desc, count } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { log } from "@/lib/logger";

export type NotificationType = "info" | "success" | "warning" | "error";

/**
 * Create a notification for a user.
 */
export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message = "",
): string {
  const db = getDb();
  const id = crypto.randomUUID();
  db.insert(notifications).values({ id, userId, type, title, message }).run();
  log.info("Notification created", { id, userId, type, title });
  return id;
}

/**
 * Get notifications for a user, newest first.
 */
export function getNotifications(
  userId: string,
  limit = 50,
  offset = 0,
) {
  const db = getDb();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
}

/**
 * Get unread notification count for a user.
 */
export function getUnreadCount(userId: string): number {
  const db = getDb();
  const row = db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, 0)))
    .get();
  return row?.count ?? 0;
}

/**
 * Mark a single notification as read.
 */
export function markRead(userId: string, notificationId: string): boolean {
  const db = getDb();
  const result = db
    .update(notifications)
    .set({ read: 1 })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .run();
  return result.changes > 0;
}

/**
 * Mark all notifications as read for a user.
 */
export function markAllRead(userId: string): number {
  const db = getDb();
  const result = db
    .update(notifications)
    .set({ read: 1 })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, 0)))
    .run();
  return result.changes;
}

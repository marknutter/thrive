/**
 * Outgoing webhook system with HMAC-SHA256 signing and retry.
 *
 * Usage:
 *   import { emitEvent } from "@/lib/webhooks";
 *   emitEvent(userId, "item.created", { itemId: "123" });
 */

import crypto from "crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { webhooks, webhookDeliveries } from "@/lib/schema";
import { log } from "@/lib/logger";
import { enqueueJob } from "@/lib/jobs";

// ─── Webhook CRUD ──────────────────────────────────────────────────────────

export function createWebhook(
  userId: string,
  url: string,
  events: string[],
) {
  const db = getDb();
  const id = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString("hex");

  db.insert(webhooks).values({
    id,
    userId,
    url,
    secret,
    events: JSON.stringify(events),
  }).run();

  return db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, id))
    .get()!;
}

export function getWebhooks(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, userId))
    .orderBy(desc(webhooks.createdAt))
    .all();
}

export function getWebhook(userId: string, webhookId: string) {
  const db = getDb();
  return db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)))
    .get() ?? null;
}

export function updateWebhook(
  userId: string,
  webhookId: string,
  updates: { url?: string; events?: string[]; active?: boolean },
): boolean {
  const db = getDb();
  const set: Record<string, unknown> = {};

  if (updates.url !== undefined) set.url = updates.url;
  if (updates.events !== undefined) set.events = JSON.stringify(updates.events);
  if (updates.active !== undefined) set.active = updates.active ? 1 : 0;

  if (Object.keys(set).length === 0) return false;

  set.updatedAt = sql`unixepoch()`;

  const result = db
    .update(webhooks)
    .set(set)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)))
    .run();
  return result.changes > 0;
}

export function deleteWebhook(userId: string, webhookId: string): boolean {
  const db = getDb();
  const result = db
    .delete(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)))
    .run();
  return result.changes > 0;
}

// ─── Deliveries ─────────────────────────────────────────────────────────────

export function getDeliveries(
  webhookId: string,
  limit = 20,
) {
  const db = getDb();
  return db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit)
    .all();
}

// ─── Event emission ─────────────────────────────────────────────────────────

/**
 * Emit an event to all matching active webhooks for a user.
 * Enqueues delivery jobs for async processing.
 */
export function emitEvent(
  userId: string,
  event: string,
  payload: Record<string, unknown>,
): void {
  const db = getDb();

  const activeWebhooks = db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.userId, userId), eq(webhooks.active, 1)))
    .all();

  for (const webhook of activeWebhooks) {
    const events: string[] = JSON.parse(webhook.events);
    if (events.length > 0 && !events.includes(event) && !events.includes("*")) {
      continue;
    }

    const deliveryId = crypto.randomUUID();
    db.insert(webhookDeliveries).values({
      id: deliveryId,
      webhookId: webhook.id,
      event,
      payload: JSON.stringify(payload),
    }).run();

    enqueueJob("deliver-webhook", { deliveryId, webhookId: webhook.id });
  }
}

/**
 * Deliver a webhook. Called by the job queue.
 */
export async function deliverWebhook(jobPayload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const deliveryId = jobPayload.deliveryId as string;
  const webhookId = jobPayload.webhookId as string;

  const delivery = db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId))
    .get();

  if (!delivery) {
    log.warn("Webhook delivery not found", { deliveryId });
    return;
  }

  const webhook = db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, webhookId))
    .get();

  if (!webhook) {
    db.update(webhookDeliveries)
      .set({
        success: 0,
        lastError: "Webhook not found",
        completedAt: sql`unixepoch()`,
      })
      .where(eq(webhookDeliveries.id, deliveryId))
      .run();
    return;
  }

  const body = JSON.stringify({
    event: delivery.event,
    payload: JSON.parse(delivery.payload),
    timestamp: Math.floor(Date.now() / 1000),
    webhookId: webhook.id,
  });

  const signature = crypto
    .createHmac("sha256", webhook.secret)
    .update(body)
    .digest("hex");

  db.update(webhookDeliveries)
    .set({ attempts: sql`${webhookDeliveries.attempts} + 1` })
    .where(eq(webhookDeliveries.id, deliveryId))
    .run();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": delivery.event,
        "X-Webhook-Id": delivery.id,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await res.text().catch(() => "");

    db.update(webhookDeliveries)
      .set({
        responseStatus: res.status,
        responseBody: responseBody.slice(0, 1000),
        success: res.ok ? 1 : 0,
        completedAt: sql`unixepoch()`,
      })
      .where(eq(webhookDeliveries.id, deliveryId))
      .run();

    if (!res.ok) {
      throw new Error(`Webhook returned ${res.status}`);
    }

    log.info("Webhook delivered", { deliveryId, webhookId, status: res.status });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    db.update(webhookDeliveries)
      .set({ lastError: errorMsg })
      .where(eq(webhookDeliveries.id, deliveryId))
      .run();

    log.warn("Webhook delivery failed", { deliveryId, webhookId, error: errorMsg });
    throw err; // Let job queue handle retry
  }
}

/**
 * Send a test webhook delivery.
 */
export async function sendTestWebhook(
  userId: string,
  webhookId: string,
) {
  const db = getDb();
  const webhook = getWebhook(userId, webhookId);
  if (!webhook) throw new Error("Webhook not found");

  const deliveryId = crypto.randomUUID();
  db.insert(webhookDeliveries).values({
    id: deliveryId,
    webhookId,
    event: "test.ping",
    payload: JSON.stringify({ test: true }),
  }).run();

  await deliverWebhook({ deliveryId, webhookId });

  return db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId))
    .get()!;
}

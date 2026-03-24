/**
 * Built-in job handlers and cron schedule registration.
 *
 * Called once at DB init time to register all handlers.
 * Cron scheduling is only started when ENABLE_CRON=true.
 */

import { eq, lt, and, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { user, session as sessionTable } from "@/lib/schema";
import { log } from "@/lib/logger";
import { registerJob, enqueueJob, processJobs } from "@/lib/jobs";
import { registerCron, startCron } from "@/lib/cron";

// ─── Job Handlers ────────────────────────────────────────────────────────────

function cleanupSessions(): void {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const result = db.delete(sessionTable).where(lt(sessionTable.expiresAt, now)).run();
  log.info("Cleaned up expired sessions", { deleted: result.changes });
}

function cleanupUnverified(): void {
  const db = getDb();
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const result = db
    .delete(user)
    .where(and(eq(user.emailVerified, 0), lt(user.createdAt, sevenDaysAgo)))
    .run();
  log.info("Cleaned up unverified users", { deleted: result.changes });
}

async function syncStripeStatus(): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    log.debug("STRIPE_SECRET_KEY not set, skipping sync-stripe-status");
    return;
  }

  // Lazy import to avoid requiring stripe when not configured
  const { getStripe } = await import("@/lib/stripe");
  const stripe = getStripe();
  const db = getDb();

  const users = db
    .select({ id: user.id, stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(isNotNull(user.stripeCustomerId))
    .all();

  let updated = 0;
  for (const u of users) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: u.stripeCustomerId!,
        limit: 1,
      });

      const status =
        subscriptions.data.length > 0
          ? subscriptions.data[0].status
          : "inactive";

      db.update(user).set({ subscriptionStatus: status }).where(eq(user.id, u.id)).run();
      updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn("Failed to sync stripe status for user", {
        userId: u.id,
        error: msg,
      });
    }
  }

  log.info("Synced stripe subscription statuses", {
    total: users.length,
    updated,
  });
}

// ─── Registration ────────────────────────────────────────────────────────────

const ONE_HOUR = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * ONE_HOUR;

/**
 * Register all built-in job handlers. Always called at startup.
 */
async function handleDeliverWebhook(payload: Record<string, unknown>): Promise<void> {
  const { deliverWebhook } = await import("@/lib/webhooks");
  await deliverWebhook(payload);
}

export function registerBuiltinJobs(): void {
  registerJob("cleanup-sessions", cleanupSessions);
  registerJob("cleanup-unverified", cleanupUnverified);
  registerJob("sync-stripe-status", syncStripeStatus);
  registerJob("deliver-webhook", handleDeliverWebhook);
  log.info("Built-in job handlers registered");
}

/**
 * Register cron schedules and start the scheduler.
 * Only called when ENABLE_CRON=true.
 */
export function startBuiltinCrons(): void {
  registerCron("cleanup-sessions", TWENTY_FOUR_HOURS, async () => {
    enqueueJob("cleanup-sessions");
    await processJobs(10);
  });

  registerCron("cleanup-unverified", TWENTY_FOUR_HOURS, async () => {
    enqueueJob("cleanup-unverified");
    await processJobs(10);
  });

  registerCron("sync-stripe-status", ONE_HOUR, async () => {
    enqueueJob("sync-stripe-status");
    await processJobs(10);
  });

  startCron();
}

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getConnectionByAccountId, removeConnection, updateLastSynced } from "@/lib/stripe-connect";
import { log } from "@/lib/logger";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe Connect webhook endpoint.
 *
 * This handles events from Connected accounts (as opposed to the platform's
 * own subscription billing webhook at /api/stripe/webhook). Register this
 * endpoint in the Stripe Dashboard under "Connect webhooks" pointing to:
 *   POST /api/stripe/connect-webhook
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  if (!webhookSecret) {
    log.error("[stripe/connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log.error("[stripe/connect-webhook] Signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const connectedAccountId = event.account;
  if (!connectedAccountId) {
    // Not a Connect event — nothing to do
    log.warn("[stripe/connect-webhook] Event missing account field", { type: event.type });
    return NextResponse.json({ received: true });
  }

  // Look up the local user who owns this connected account
  const connection = getConnectionByAccountId(connectedAccountId);

  try {
    switch (event.type) {
      // ── Charges ──────────────────────────────────────────────────────
      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        log.info("[stripe/connect-webhook] Charge succeeded", {
          accountId: connectedAccountId,
          chargeId: charge.id,
          amount: charge.amount,
          currency: charge.currency,
        });
        if (connection) {
          updateLastSynced(connection.user_id, connectedAccountId);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        log.info("[stripe/connect-webhook] Charge refunded", {
          accountId: connectedAccountId,
          chargeId: charge.id,
          amountRefunded: charge.amount_refunded,
          currency: charge.currency,
        });
        if (connection) {
          updateLastSynced(connection.user_id, connectedAccountId);
        }
        break;
      }

      // ── Subscriptions ────────────────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        log.info("[stripe/connect-webhook] Subscription event", {
          accountId: connectedAccountId,
          type: event.type,
          subscriptionId: sub.id,
          status: sub.status,
        });
        if (connection) {
          updateLastSynced(connection.user_id, connectedAccountId);
        }
        break;
      }

      // ── Payouts ──────────────────────────────────────────────────────
      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        log.info("[stripe/connect-webhook] Payout paid", {
          accountId: connectedAccountId,
          payoutId: payout.id,
          amount: payout.amount,
          currency: payout.currency,
        });
        if (connection) {
          updateLastSynced(connection.user_id, connectedAccountId);
        }
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        log.warn("[stripe/connect-webhook] Payout failed", {
          accountId: connectedAccountId,
          payoutId: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          failureCode: payout.failure_code,
          failureMessage: payout.failure_message,
        });
        if (connection) {
          updateLastSynced(connection.user_id, connectedAccountId);
        }
        break;
      }

      // ── Deauthorization ──────────────────────────────────────────────
      case "account.application.deauthorized": {
        log.info("[stripe/connect-webhook] Account deauthorized", {
          accountId: connectedAccountId,
        });
        if (connection) {
          removeConnection(connection.user_id, connectedAccountId);
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge silently
        log.debug("[stripe/connect-webhook] Unhandled event type", { type: event.type });
        break;
    }
  } catch (err) {
    log.error("[stripe/connect-webhook] Error handling event", {
      type: event.type,
      accountId: connectedAccountId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

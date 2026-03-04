import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        db.prepare(`
          UPDATE user
          SET plan = 'pro',
              subscriptionStatus = 'active',
              stripeSubscriptionId = ?
          WHERE stripeCustomerId = ?
        `).run(subscriptionId, customerId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        db.prepare(`
          UPDATE user
          SET subscriptionStatus = ?
          WHERE stripeCustomerId = ?
        `).run(sub.status, customerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        db.prepare(`
          UPDATE user
          SET plan = 'free',
              subscriptionStatus = 'inactive',
              stripeSubscriptionId = NULL
          WHERE stripeCustomerId = ?
        `).run(customerId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        db.prepare(`
          UPDATE user
          SET subscriptionStatus = 'past_due'
          WHERE stripeCustomerId = ?
        `).run(customerId);
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] error handling event:', event.type, err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

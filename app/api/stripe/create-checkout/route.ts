import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRawDb as getDb } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();
  const stripe = getStripe();

  const user = db
    .prepare('SELECT id, email, stripeCustomerId FROM user WHERE id = ?')
    .get(session.user.id) as { id: string; email: string; stripeCustomerId: string | null } | undefined;

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    db.prepare('UPDATE user SET stripeCustomerId = ? WHERE id = ?').run(customerId, user.id);
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3022';
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error('[stripe/create-checkout] STRIPE_PRICE_ID is not set');
    return NextResponse.json({ error: 'Checkout not configured' }, { status: 500 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/app?upgraded=1`,
    cancel_url: `${appUrl}/app`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

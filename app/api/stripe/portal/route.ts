import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();
  const user = db
    .prepare('SELECT stripeCustomerId FROM user WHERE id = ?')
    .get(session.user.id) as { stripeCustomerId: string | null } | undefined;

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3022';

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/app`,
  });

  return NextResponse.json({ url: portalSession.url });
}

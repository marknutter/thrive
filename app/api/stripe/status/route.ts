import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRawDb as getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();
  const user = db
    .prepare('SELECT plan, subscriptionStatus FROM user WHERE id = ?')
    .get(session.user.id) as { plan: string | null; subscriptionStatus: string | null } | undefined;

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    plan: user.plan ?? 'free',
    status: user.subscriptionStatus ?? 'inactive',
  });
}

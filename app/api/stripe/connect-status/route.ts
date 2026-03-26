export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, errorResponse } from "@/lib/errors";
import { getConnection } from "@/lib/stripe-connect";
import { isDemoMode, getDemoConnectionStatus } from "@/lib/demo-data";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    if (isDemoMode()) {
      return NextResponse.json(getDemoConnectionStatus());
    }

    const connection = getConnection(session.user.id);

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      stripe_account_id: connection.stripe_account_id,
      business_name: connection.business_name,
      connected_at: connection.connected_at,
      last_synced_at: connection.last_synced_at,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

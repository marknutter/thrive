export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, errorResponse } from "@/lib/errors";
import {
  generateStateToken,
  getConnectAuthorizeUrl,
} from "@/lib/stripe-connect";
import { isDemoMode, setDemoStripeConnected } from "@/lib/demo-data";
import { completeMilestone } from "@/lib/milestones";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    if (isDemoMode()) {
      // In demo mode, skip OAuth — just mark as connected
      setDemoStripeConnected(session.user.id);
      try { completeMilestone(session.user.id, "stripe_connected"); } catch { /* ignore */ }
      const appUrl = process.env.APP_URL || process.env.BETTER_AUTH_URL || "";
      return NextResponse.redirect(`${appUrl}/app/dashboard?stripe_connected=true`);
    }

    const state = generateStateToken(session.user.id);
    const url = getConnectAuthorizeUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    return errorResponse(error);
  }
}

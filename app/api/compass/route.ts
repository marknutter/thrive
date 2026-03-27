export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import { getConnection } from "@/lib/stripe-connect";
import { generateCompass } from "@/lib/compass";
import { isDemoMode, generateDemoCompass } from "@/lib/demo-data";
import { log } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    if (isDemoMode()) {
      return NextResponse.json(generateDemoCompass());
    }

    const connection = getConnection(session.user.id);
    if (!connection) {
      throw new BadRequestError(
        "No Stripe account connected. Please connect your Stripe account first."
      );
    }

    log.info("Generating Compass for user", {
      userId: session.user.id,
      stripeAccountId: connection.stripe_account_id,
    });

    const compass = await generateCompass(connection.stripe_account_id);

    return NextResponse.json(compass);
  } catch (error) {
    return errorResponse(error);
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import {
  getConnection,
  removeConnection,
  deauthorizeAccount,
} from "@/lib/stripe-connect";
import { log as logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const connection = getConnection(session.user.id);
    if (!connection) throw new BadRequestError("No Stripe account connected");

    // Deauthorize on Stripe's side
    try {
      await deauthorizeAccount(connection.stripe_account_id);
    } catch (err) {
      logger.warn("Stripe deauthorize call failed (may already be revoked)", {
        err,
      });
    }

    // Remove from our database
    removeConnection(session.user.id, connection.stripe_account_id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

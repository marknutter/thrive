export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { log as logger } from "@/lib/logger";
import {
  validateStateToken,
  exchangeCodeForToken,
  saveConnection,
  fetchAccountInfo,
} from "@/lib/stripe-connect";
import { getRawDb } from "@/lib/db";
import { completeMilestone } from "@/lib/milestones";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || process.env.BETTER_AUTH_URL || "";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // User denied or Stripe error
  if (error) {
    logger.warn("Stripe Connect OAuth error", { error, errorDescription });
    return NextResponse.redirect(
      `${appUrl}/settings?stripe_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/settings?stripe_error=missing_params`
    );
  }

  // Validate CSRF state
  const userId = validateStateToken(state);
  if (!userId) {
    logger.warn("Stripe Connect: invalid or expired state token");
    return NextResponse.redirect(
      `${appUrl}/settings?stripe_error=invalid_state`
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenData = await exchangeCodeForToken(code);

    // Save connection
    saveConnection(userId, tokenData);

    // Fetch and store business name
    try {
      const accountInfo = await fetchAccountInfo(tokenData.stripe_user_id);
      if (accountInfo.business_name) {
        const db = getRawDb();
        db.prepare(
          "UPDATE stripe_connections SET business_name = ? WHERE user_id = ? AND stripe_account_id = ?"
        ).run(accountInfo.business_name, userId, tokenData.stripe_user_id);
      }
    } catch (err) {
      logger.warn("Failed to fetch Stripe account info", { err });
      // Non-fatal — connection is still saved
    }

    // Mark the stripe_connected milestone as complete
    try {
      completeMilestone(userId, "stripe_connected");
    } catch (err) {
      logger.warn("Failed to complete stripe_connected milestone", { err });
    }

    return NextResponse.redirect(
      `${appUrl}/settings?stripe_connected=true`
    );
  } catch (err) {
    logger.error("Stripe Connect token exchange failed", { err });
    return NextResponse.redirect(
      `${appUrl}/settings?stripe_error=token_exchange_failed`
    );
  }
}

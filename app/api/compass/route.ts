export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import { getConnection } from "@/lib/stripe-connect";
import { generateCompass, generateCompassFromText } from "@/lib/compass";
import { isDemoMode, isDemoStripeConnected, generateDemoCompass, generateDemoFinancialData } from "@/lib/demo-data";
import { log } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    if (isDemoMode()) {
      if (!isDemoStripeConnected(session.user.id)) {
        throw new BadRequestError("Connect your Stripe account first to see your Compass. Visit the Dashboard to connect.");
      }
      // If we have an Anthropic key, run real AI with demo financial data
      if (process.env.ANTHROPIC_API_KEY) {
        log.info("Demo mode: generating live AI compass from demo data");
        const demoData = generateDemoFinancialData(90);
        const s = demoData.summary;
        const fmt = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
        const summaryText = `Business: Sunrise Yoga & Wellness\nRevenue (90 days): ${fmt(s.total_revenue)}\nMRR: ${fmt(s.mrr)}\nActive Subscriptions: ${s.active_subscriptions}\nBalance: ${fmt(s.available_balance)}\nPayouts: ${fmt(s.total_payouts)}\n\nMonthly: ${demoData.monthly_revenue.map((m) => `${m.month}: ${fmt(m.amount)}`).join(", ")}`;
        const compass = await generateCompassFromText(summaryText, "demo-live-ai");
        return NextResponse.json(compass);
      }
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

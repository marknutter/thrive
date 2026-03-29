export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import { getConnection } from "@/lib/stripe-connect";
import { generateInsights, generateInsightsFromText, formatSummaryAsText } from "@/lib/insights";
import { isDemoMode, isDemoStripeConnected, generateDemoInsights, generateDemoFinancialData } from "@/lib/demo-data";
import { log } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    if (isDemoMode()) {
      if (!isDemoStripeConnected(session.user.id)) {
        throw new BadRequestError("Connect your Stripe account first to see insights. Visit the Dashboard to connect.");
      }
      // If we have an Anthropic key, run real AI with demo financial data
      if (process.env.ANTHROPIC_API_KEY) {
        log.info("Demo mode: generating live AI insights from demo data");
        const demoData = generateDemoFinancialData(90);
        const summaryText = buildDemoSummaryText(demoData);
        const insights = await generateInsightsFromText(summaryText, "demo-live-ai");
        return NextResponse.json(insights);
      }
      // No API key — return hardcoded demo insights
      return NextResponse.json(generateDemoInsights());
    }

    const connection = getConnection(session.user.id);
    if (!connection) {
      throw new BadRequestError(
        "No Stripe account connected. Please connect your Stripe account first."
      );
    }

    log.info("Generating insights for user", {
      userId: session.user.id,
      stripeAccountId: connection.stripe_account_id,
    });

    const insights = await generateInsights(connection.stripe_account_id);

    return NextResponse.json(insights);
  } catch (error) {
    return errorResponse(error);
  }
}

// Build a text summary from demo financial data (mirrors formatSummaryAsText structure)
function buildDemoSummaryText(data: ReturnType<typeof generateDemoFinancialData>): string {
  const s = data.summary;
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  const activeSubs = data.subscriptions.filter((sub) => sub.status === "active");
  const monthly = activeSubs.filter((sub) => sub.plan_interval === "month").length;
  const annual = activeSubs.filter((sub) => sub.plan_interval === "year").length;
  const fees = data.balance_transactions.filter((t) => t.type === "charge").reduce((sum, t) => sum + t.fee, 0);
  const refunds = data.balance_transactions.filter((t) => t.type === "refund").reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return `Business: Sunrise Yoga & Wellness
Period: Last 90 days

REVENUE
Total Revenue: ${fmt(s.total_revenue)}
Monthly Recurring Revenue (MRR): ${fmt(s.mrr)}
Active Subscriptions: ${s.active_subscriptions} (${monthly} monthly, ${annual} annual)

EXPENSES & FEES
Stripe Processing Fees: ${fmt(fees)}
Refunds: ${fmt(refunds)}

CASH POSITION
Available Balance: ${fmt(s.available_balance)}
Pending Balance: ${fmt(s.pending_balance)}
Total Payouts: ${fmt(s.total_payouts)}

REVENUE BREAKDOWN
${data.charges.slice(0, 20).map((c) => `- ${c.description || "Payment"}: ${fmt(c.amount)}`).join("\n")}

MONTHLY TREND
${data.monthly_revenue.map((m) => `- ${m.month}: ${fmt(m.amount)}`).join("\n")}`;
}

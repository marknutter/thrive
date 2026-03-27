export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import { getConnection } from "@/lib/stripe-connect";
import {
  fetchRevenue,
  fetchSubscriptions,
  fetchPayouts,
  fetchBalance,
} from "@/lib/stripe-connect";
import { generateForecast } from "@/lib/forecast";
import { isDemoMode, generateDemoForecast } from "@/lib/demo-data";
import { log } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    if (isDemoMode()) {
      return NextResponse.json(generateDemoForecast());
    }

    const connection = getConnection(session.user.id);
    if (!connection) {
      throw new BadRequestError(
        "No Stripe account connected. Please connect your Stripe account first."
      );
    }

    log.info("Generating forecast for user", {
      userId: session.user.id,
      stripeAccountId: connection.stripe_account_id,
    });

    // Fetch 180 days of data for better trend analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 180);

    // Also fetch last 30 days separately for current metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [charges180, subscriptions, payouts180, balance, charges30, payouts30] =
      await Promise.all([
        fetchRevenue(connection.stripe_account_id, startDate, endDate),
        fetchSubscriptions(connection.stripe_account_id),
        fetchPayouts(connection.stripe_account_id, startDate, endDate),
        fetchBalance(connection.stripe_account_id),
        fetchRevenue(connection.stripe_account_id, thirtyDaysAgo, endDate),
        fetchPayouts(connection.stripe_account_id, thirtyDaysAgo, endDate),
      ]);

    // Compute MRR from active subs
    const activeSubs = subscriptions.filter((s) => s.status === "active");
    const mrr = activeSubs.reduce((sum, s) => {
      const amount = s.plan_amount || 0;
      const interval = s.plan_interval;
      if (interval === "year") return sum + Math.round(amount / 12);
      if (interval === "week") return sum + amount * 4;
      return sum + amount;
    }, 0);

    // Monthly revenue from 180-day charges
    const successfulCharges = charges180.filter((c) => c.status === "succeeded");
    const monthlyRevenueMap = new Map<string, number>();
    for (const c of successfulCharges) {
      const d = new Date(c.created * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) || 0) + c.amount);
    }
    const monthly_revenue = Array.from(monthlyRevenueMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Last 30 day totals
    const successfulCharges30 = charges30.filter((c) => c.status === "succeeded");
    const total_revenue_last_30 = successfulCharges30.reduce((sum, c) => sum + c.amount, 0);
    const total_payouts_last_30 = payouts30
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0);

    const forecast = generateForecast({
      monthly_revenue,
      mrr,
      active_subscriptions: activeSubs.length,
      total_revenue_last_30,
      total_payouts_last_30,
      available_balance: availableBalance,
      charges: successfulCharges.map((c) => ({
        amount: c.amount,
        created: c.created,
        description: c.description,
      })),
    });

    return NextResponse.json(forecast);
  } catch (error) {
    return errorResponse(error);
  }
}

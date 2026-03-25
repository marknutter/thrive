export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import {
  getConnection,
  fetchRevenue,
  fetchSubscriptions,
  fetchPayouts,
  fetchBalance,
  updateLastSynced,
} from "@/lib/stripe-connect";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const connection = getConnection(session.user.id);
    if (!connection) throw new BadRequestError("No Stripe account connected");

    const { searchParams } = new URL(request.url);
    const days = Math.min(
      365,
      Math.max(1, parseInt(searchParams.get("days") || "30", 10))
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [charges, subscriptions, payouts, balance] = await Promise.all([
      fetchRevenue(connection.stripe_account_id, startDate, endDate),
      fetchSubscriptions(connection.stripe_account_id),
      fetchPayouts(connection.stripe_account_id, startDate, endDate),
      fetchBalance(connection.stripe_account_id),
    ]);

    // Compute summary metrics
    const successfulCharges = charges.filter((c) => c.status === "succeeded");
    const totalRevenue = successfulCharges.reduce((sum, c) => sum + c.amount, 0);
    const activeSubs = subscriptions.filter((s) => s.status === "active");
    const mrr = activeSubs.reduce((sum, s) => {
      const amount = s.plan_amount || 0;
      const interval = s.plan_interval;
      if (interval === "year") return sum + Math.round(amount / 12);
      if (interval === "week") return sum + amount * 4;
      return sum + amount; // month or default
    }, 0);

    const availableBalance = balance.available.reduce(
      (sum, b) => sum + b.amount,
      0
    );
    const pendingBalance = balance.pending.reduce(
      (sum, b) => sum + b.amount,
      0
    );
    const currency = balance.available[0]?.currency || "usd";

    const totalPayouts = payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    // Aggregate successful charges by day for the revenue chart
    const revenueByDay = new Map<string, { amount: number; count: number }>();
    for (const c of successfulCharges) {
      const date = new Date(c.created * 1000).toISOString().slice(0, 10);
      const entry = revenueByDay.get(date) || { amount: 0, count: 0 };
      entry.amount += c.amount;
      entry.count += 1;
      revenueByDay.set(date, entry);
    }

    // Fill in missing days with zero so the chart has no gaps
    const dailyRevenue: { date: string; amount: number; count: number }[] = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(endDate);
    endDay.setHours(0, 0, 0, 0);
    while (cursor <= endDay) {
      const key = cursor.toISOString().slice(0, 10);
      const entry = revenueByDay.get(key) || { amount: 0, count: 0 };
      dailyRevenue.push({ date: key, ...entry });
      cursor.setDate(cursor.getDate() + 1);
    }

    updateLastSynced(session.user.id, connection.stripe_account_id);

    return NextResponse.json({
      summary: {
        total_revenue: totalRevenue,
        mrr,
        active_subscriptions: activeSubs.length,
        total_subscriptions: subscriptions.length,
        available_balance: availableBalance,
        pending_balance: pendingBalance,
        total_payouts: totalPayouts,
        currency,
        period_days: days,
      },
      daily_revenue: dailyRevenue,
      charges: successfulCharges.slice(0, 50),
      subscriptions: activeSubs.slice(0, 50),
      payouts: payouts.slice(0, 50),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

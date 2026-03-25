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
  fetchBalanceTransactions,
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

    const [charges, subscriptions, payouts, balance, balanceTransactions] = await Promise.all([
      fetchRevenue(connection.stripe_account_id, startDate, endDate),
      fetchSubscriptions(connection.stripe_account_id),
      fetchPayouts(connection.stripe_account_id, startDate, endDate),
      fetchBalance(connection.stripe_account_id),
      fetchBalanceTransactions(connection.stripe_account_id, startDate, endDate),
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

    // Aggregate monthly revenue from successful charges
    const monthlyRevenueMap = new Map<string, number>();
    for (const c of successfulCharges) {
      const d = new Date(c.created * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) || 0) + c.amount);
    }
    const monthly_revenue = Array.from(monthlyRevenueMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

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
      charges: successfulCharges.slice(0, 50),
      subscriptions: activeSubs.slice(0, 50),
      payouts: payouts.slice(0, 50),
      balance_transactions: balanceTransactions,
      monthly_revenue,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

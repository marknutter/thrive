/**
 * Thrive Insights — AI-powered financial analysis engine.
 *
 * Fetches Stripe data for the last 90 days, builds a structured financial
 * summary, then calls Claude to produce actionable insights.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  fetchRevenue,
  fetchSubscriptions,
  fetchPayouts,
  fetchBalance,
  fetchBalanceTransactions,
  fetchCustomerCount,
  fetchAccountInfo,
} from "@/lib/stripe-connect";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Insight {
  category:
    | "revenue_trends"
    | "profit_margins"
    | "expense_alerts"
    | "client_concentration"
    | "membership_growth";
  title: string;
  body: string;
  severity: "info" | "warning" | "success" | "critical";
}

export interface InsightResult {
  summary: string;
  insights: Insight[];
  generatedAt: string;
}

export interface FinancialSummary {
  account: {
    businessName: string | null;
    email: string | null;
    country: string | null;
    defaultCurrency: string | null;
  };
  period: { startDate: string; endDate: string };
  revenue: {
    totalCharges: number;
    successfulCharges: number;
    failedCharges: number;
    refundedCharges: number;
    totalAmount: number;
    successfulAmount: number;
    refundedAmount: number;
    currency: string;
    chargesByMonth: Record<string, { count: number; amount: number }>;
  };
  fees: {
    totalFees: number;
    totalNet: number;
    feePercentage: number;
    transactionCount: number;
  };
  subscriptions: {
    active: number;
    canceled: number;
    pastDue: number;
    trialing: number;
    total: number;
    mrr: number;
    uniqueCustomers: number;
    topCustomerConcentration: number;
  };
  payouts: {
    totalAmount: number;
    count: number;
  };
  balance: {
    available: number;
    pending: number;
    currency: string;
  };
  customerCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const client = new Anthropic();

function monthKey(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ---------------------------------------------------------------------------
// Build financial summary from raw Stripe data (no AI call)
// ---------------------------------------------------------------------------

export async function buildFinancialSummary(
  stripeAccountId: string
): Promise<FinancialSummary> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  log.info("Fetching Stripe data for insights", {
    stripeAccountId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Fetch all data in parallel
  const [charges, subscriptions, payouts, balance, balanceTxns, customerCount, accountInfo] =
    await Promise.all([
      fetchRevenue(stripeAccountId, startDate, endDate),
      fetchSubscriptions(stripeAccountId),
      fetchPayouts(stripeAccountId, startDate, endDate),
      fetchBalance(stripeAccountId),
      fetchBalanceTransactions(stripeAccountId, startDate, endDate),
      fetchCustomerCount(stripeAccountId),
      fetchAccountInfo(stripeAccountId),
    ]);

  // Revenue breakdown
  const successful = charges.filter((c) => c.status === "succeeded");
  const failed = charges.filter((c) => c.status === "failed");
  const refunded = charges.filter((c) => c.status === "refunded" || (c as any).refunded);
  const currency = successful[0]?.currency || "usd";

  const chargesByMonth: Record<string, { count: number; amount: number }> = {};
  for (const c of successful) {
    const key = monthKey(c.created);
    if (!chargesByMonth[key]) chargesByMonth[key] = { count: 0, amount: 0 };
    chargesByMonth[key].count++;
    chargesByMonth[key].amount += c.amount;
  }

  // Fee analysis from balance transactions
  const totalFees = balanceTxns.reduce((sum, t) => sum + t.fee, 0);
  const totalNet = balanceTxns.reduce((sum, t) => sum + t.net, 0);
  const totalGross = balanceTxns.reduce((sum, t) => sum + t.amount, 0);

  // Subscription analysis
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const canceledSubs = subscriptions.filter((s) => s.status === "canceled");
  const pastDueSubs = subscriptions.filter((s) => s.status === "past_due");
  const trialingSubs = subscriptions.filter((s) => s.status === "trialing");

  // MRR calculation (monthly recurring revenue from active subs)
  let mrr = 0;
  for (const sub of activeSubs) {
    if (sub.plan_amount) {
      if (sub.plan_interval === "year") {
        mrr += Math.round(sub.plan_amount / 12);
      } else if (sub.plan_interval === "month") {
        mrr += sub.plan_amount;
      } else if (sub.plan_interval === "week") {
        mrr += sub.plan_amount * 4;
      }
    }
  }

  // Customer concentration (top customer share of active subscriptions)
  const customerRevenue: Record<string, number> = {};
  for (const sub of activeSubs) {
    const amt = sub.plan_amount || 0;
    customerRevenue[sub.customer] = (customerRevenue[sub.customer] || 0) + amt;
  }
  const sortedCustomers = Object.values(customerRevenue).sort((a, b) => b - a);
  const totalSubRevenue = sortedCustomers.reduce((s, v) => s + v, 0);
  const topCustomerShare =
    totalSubRevenue > 0 && sortedCustomers.length > 0
      ? sortedCustomers[0] / totalSubRevenue
      : 0;

  // Balance
  const availableBalance = balance.available.reduce((s, b) => s + b.amount, 0);
  const pendingBalance = balance.pending.reduce((s, b) => s + b.amount, 0);
  const balanceCurrency = balance.available[0]?.currency || currency;

  // Payouts
  const totalPayoutAmount = payouts.reduce((s, p) => s + p.amount, 0);

  return {
    account: {
      businessName: accountInfo.business_name,
      email: accountInfo.email || null,
      country: accountInfo.country || null,
      defaultCurrency: accountInfo.default_currency || null,
    },
    period: {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    },
    revenue: {
      totalCharges: charges.length,
      successfulCharges: successful.length,
      failedCharges: failed.length,
      refundedCharges: refunded.length,
      totalAmount: successful.reduce((s, c) => s + c.amount, 0),
      successfulAmount: successful.reduce((s, c) => s + c.amount, 0),
      refundedAmount: refunded.reduce((s, c) => s + c.amount, 0),
      currency,
      chargesByMonth,
    },
    fees: {
      totalFees,
      totalNet,
      feePercentage: totalGross > 0 ? (totalFees / totalGross) * 100 : 0,
      transactionCount: balanceTxns.length,
    },
    subscriptions: {
      active: activeSubs.length,
      canceled: canceledSubs.length,
      pastDue: pastDueSubs.length,
      trialing: trialingSubs.length,
      total: subscriptions.length,
      mrr,
      uniqueCustomers: new Set(activeSubs.map((s) => s.customer)).size,
      topCustomerConcentration: Math.round(topCustomerShare * 100),
    },
    payouts: {
      totalAmount: totalPayoutAmount,
      count: payouts.length,
    },
    balance: {
      available: availableBalance,
      pending: pendingBalance,
      currency: balanceCurrency,
    },
    customerCount,
  };
}

// ---------------------------------------------------------------------------
// Format summary as human-readable text (for chat context injection)
// ---------------------------------------------------------------------------

export function formatSummaryAsText(s: FinancialSummary): string {
  const lines: string[] = [];

  lines.push(`=== Financial Summary (${s.period.startDate} to ${s.period.endDate}) ===`);
  if (s.account.businessName) lines.push(`Business: ${s.account.businessName}`);
  lines.push("");

  lines.push("-- Revenue --");
  lines.push(`Total successful charges: ${s.revenue.successfulCharges}`);
  lines.push(`Total revenue: $${centsToDisplay(s.revenue.successfulAmount)} ${s.revenue.currency.toUpperCase()}`);
  lines.push(`Failed charges: ${s.revenue.failedCharges}`);
  lines.push(`Refunded charges: ${s.revenue.refundedCharges} ($${centsToDisplay(s.revenue.refundedAmount)})`);

  const months = Object.keys(s.revenue.chargesByMonth).sort();
  if (months.length > 0) {
    lines.push("Revenue by month:");
    for (const m of months) {
      const d = s.revenue.chargesByMonth[m];
      lines.push(`  ${m}: ${d.count} charges, $${centsToDisplay(d.amount)}`);
    }
  }
  lines.push("");

  lines.push("-- Fees & Margins --");
  lines.push(`Total Stripe fees: $${centsToDisplay(s.fees.totalFees)}`);
  lines.push(`Net after fees: $${centsToDisplay(s.fees.totalNet)}`);
  lines.push(`Fee percentage: ${s.fees.feePercentage.toFixed(2)}%`);
  lines.push("");

  lines.push("-- Subscriptions --");
  lines.push(`Active: ${s.subscriptions.active}`);
  lines.push(`Canceled: ${s.subscriptions.canceled}`);
  lines.push(`Past due: ${s.subscriptions.pastDue}`);
  lines.push(`Trialing: ${s.subscriptions.trialing}`);
  lines.push(`MRR (monthly recurring revenue): $${centsToDisplay(s.subscriptions.mrr)}`);
  lines.push(`Unique subscribing customers: ${s.subscriptions.uniqueCustomers}`);
  lines.push(`Top customer concentration: ${s.subscriptions.topCustomerConcentration}% of subscription revenue`);
  lines.push("");

  lines.push("-- Payouts --");
  lines.push(`Total payouts: ${s.payouts.count} ($${centsToDisplay(s.payouts.totalAmount)})`);
  lines.push("");

  lines.push("-- Balance --");
  lines.push(`Available: $${centsToDisplay(s.balance.available)} ${s.balance.currency.toUpperCase()}`);
  lines.push(`Pending: $${centsToDisplay(s.balance.pending)} ${s.balance.currency.toUpperCase()}`);
  lines.push("");

  lines.push(`Total customers: ${s.customerCount}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Generate AI-powered insights
// ---------------------------------------------------------------------------

const INSIGHT_PROMPT = `You are a financial analyst for small service businesses. Analyze the following Stripe financial data and produce actionable insights.

Analyze these specific categories:
1. **Revenue Trends** - Is revenue growing or shrinking month-over-month? Any seasonality patterns? Compare months available.
2. **Profit Margin Analysis** - What percentage is going to Stripe fees? Is the fee ratio healthy or concerning? How does net compare to gross?
3. **Expense Alerts** - Flag any unusual fee patterns, high refund rates (above 2%), or high failure rates that suggest payment issues.
4. **Client Concentration Risk** - If any single customer accounts for more than 30% of subscription revenue, flag this as a risk. Also flag if the customer base is very small.
5. **Membership Growth** - Analyze active vs canceled subscriptions. Is the business growing its recurring base or churning? What's the ratio of active to canceled?

Rules:
- Be specific with numbers. Reference actual dollar amounts and percentages from the data.
- Keep each insight concise (2-4 sentences).
- Only include insights where the data supports them. Do not fabricate or assume data not provided.
- If there is insufficient data for a category, include one insight noting what data is missing and why it matters.
- Use severity levels appropriately:
  - "success" for positive trends and healthy metrics
  - "info" for neutral observations and context
  - "warning" for concerning trends that need attention
  - "critical" for urgent issues requiring immediate action

Respond with ONLY valid JSON in this exact format:
{
  "summary": "A 2-3 sentence executive summary of the business's financial health.",
  "insights": [
    {
      "category": "revenue_trends|profit_margins|expense_alerts|client_concentration|membership_growth",
      "title": "Short title for the insight",
      "body": "Detailed explanation with specific numbers.",
      "severity": "info|warning|success|critical"
    }
  ]
}`;

export async function generateInsights(
  stripeAccountId: string
): Promise<InsightResult> {
  const summary = await buildFinancialSummary(stripeAccountId);
  const summaryText = formatSummaryAsText(summary);

  log.info("Generating AI insights", { stripeAccountId });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Here is the financial data for analysis:\n\n${summaryText}\n\nPlease analyze this data and provide insights.`,
      },
    ],
    system: INSIGHT_PROMPT,
  });

  // Extract text from the response
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    log.error("No text in Claude insights response");
    throw new Error("Failed to generate insights: no response text");
  }

  // Parse JSON from the response - handle potential markdown code fences
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: { summary: string; insights: Insight[] };
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    log.error("Failed to parse insights JSON", { raw: jsonText });
    throw new Error("Failed to parse insights response");
  }

  const result: InsightResult = {
    summary: parsed.summary,
    insights: parsed.insights,
    generatedAt: new Date().toISOString(),
  };

  log.info("Insights generated successfully", {
    stripeAccountId,
    insightCount: result.insights.length,
  });

  return result;
}

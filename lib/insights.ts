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
    | "profitability"
    | "payroll_ratio"
    | "expense_alerts"
    | "revenue_mix";
  title: string;
  body: string;
  severity: "info" | "warning" | "success" | "critical";
}

export interface Trend {
  area: string;
  description: string;
  direction: "up" | "down" | "flat";
}

export interface Signal {
  title: string;
  body: string;
}

export interface InsightResult {
  summary: string;
  insights: Insight[];
  trends: Trend[];
  warnings: Signal[];
  positives: Signal[];
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

const INSIGHT_PROMPT = `You are a trusted financial advisor for small service businesses — specifically fitness studios, wellness centers, and similar owner-operated businesses. You are preparing a thoughtful monthly financial review for the owner. This is not analytics or accounting — it's clear, human explanations of what's happening in their business.

Your tone should feel like a supportive advisor reviewing the business with the owner. Be specific with numbers but never alarmist. Use language like "worth watching" or "something to keep an eye on" rather than "too high" or "critical problem."

Analyze the financial data and produce a structured review with these sections:

1. **Summary** — A concise monthly highlights paragraph covering: revenue change, payroll/fee ratio, membership growth, membership churn, and cash reserves. Keep it to 3-5 short bullet-point-style sentences.

2. **Key Insight Cards** — 4-6 insights across these categories:
   - "revenue_trends" — Revenue patterns, growth, seasonality
   - "profitability" — Margins, net income trends, fee impact
   - "payroll_ratio" — Payroll costs relative to revenue (use fee data as a proxy if payroll data isn't available)
   - "expense_alerts" — Unusual expenses, refund rates, cost trends
   - "revenue_mix" — Revenue diversification, service mix, client concentration

3. **Trends** — 3-5 trend observations covering:
   - Revenue trend (direction over recent months)
   - Profit trend
   - Client/membership growth
   - Membership retention
   Each trend has an "area" name, a "description" sentence, and a "direction" (up/down/flat).

4. **Early Warning Signals** — 2-4 gentle warnings. These are NOT alarms, just things worth watching. Examples: cancellations increasing, costs rising faster than revenue, cash reserves declining. Frame supportively: "Membership cancellations have increased slightly over the past two months. This is worth keeping an eye on."

5. **Positive Signals** — 2-4 things going well. Reinforce that the system is supportive, not critical. Examples: revenue consistent, margins improving, PT revenue growing.

Rules:
- Be specific with numbers. Reference actual dollar amounts and percentages.
- Keep each insight concise (2-4 sentences).
- Only include insights where the data supports them. Do not fabricate.
- If there is insufficient data for a category, note what's missing and why it matters.
- Severity levels for insight cards:
  - "success" for positive trends and healthy metrics
  - "info" for neutral observations and context
  - "warning" for things worth watching (NOT alarming language)
  - "critical" only for truly urgent issues requiring immediate action

Respond with ONLY valid JSON in this exact format:
{
  "summary": "Monthly highlights paragraph with 3-5 short observations.",
  "insights": [
    {
      "category": "revenue_trends|profitability|payroll_ratio|expense_alerts|revenue_mix",
      "title": "Short title",
      "body": "Detailed explanation with specific numbers.",
      "severity": "info|warning|success|critical"
    }
  ],
  "trends": [
    {
      "area": "Revenue",
      "description": "Revenue has increased steadily for the last four months.",
      "direction": "up|down|flat"
    }
  ],
  "warnings": [
    {
      "title": "Short warning title",
      "body": "Supportive explanation of what to watch."
    }
  ],
  "positives": [
    {
      "title": "Short positive title",
      "body": "Explanation of what's going well."
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
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Here is the financial data for analysis:\n\n${summaryText}\n\nPlease analyze this data and provide a structured monthly financial review.`,
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

  let parsed: {
    summary: string;
    insights: Insight[];
    trends: Trend[];
    warnings: Signal[];
    positives: Signal[];
  };
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    log.error("Failed to parse insights JSON", { raw: jsonText });
    throw new Error("Failed to parse insights response");
  }

  const result: InsightResult = {
    summary: parsed.summary,
    insights: parsed.insights,
    trends: parsed.trends || [],
    warnings: parsed.warnings || [],
    positives: parsed.positives || [],
    generatedAt: new Date().toISOString(),
  };

  log.info("Insights generated successfully", {
    stripeAccountId,
    insightCount: result.insights.length,
  });

  return result;
}

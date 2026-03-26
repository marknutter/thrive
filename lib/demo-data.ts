/**
 * Demo mode data generator.
 *
 * When DEMO_MODE=true, all Stripe Connect endpoints return realistic
 * mock data for a fictional yoga/fitness studio instead of calling Stripe.
 *
 * The data models a studio called "Sunrise Yoga & Wellness" with:
 * - ~85 active members across 4 membership tiers
 * - Personal training and class pack revenue
 * - Realistic seasonal patterns (Jan spike, summer dip)
 * - A few refunds and failed payments
 * - Growing MRR trend over the past year
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function randomBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickRandom<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateId(rng: () => number, prefix: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = prefix + "_";
  for (let i = 0; i < 24; i++) id += chars[Math.floor(rng() * chars.length)];
  return id;
}

// ---------------------------------------------------------------------------
// Studio configuration
// ---------------------------------------------------------------------------

const STUDIO_NAME = "Sunrise Yoga & Wellness";

const MEMBERSHIP_TIERS = [
  { name: "Basic Monthly", amount: 7900, interval: "month" as const },
  { name: "Unlimited Monthly", amount: 14900, interval: "month" as const },
  { name: "Premium Monthly", amount: 19900, interval: "month" as const },
  { name: "Annual Unlimited", amount: 139900, interval: "year" as const },
];

const ONE_TIME_SERVICES = [
  { name: "Drop-in Class", min: 2000, max: 2500 },
  { name: "Personal Training Session", min: 7500, max: 9500 },
  { name: "5-Class Pack", min: 8500, max: 10000 },
  { name: "10-Class Pack", min: 15000, max: 18000 },
  { name: "Workshop: Yoga Fundamentals", min: 4500, max: 6500 },
  { name: "Private Group Session", min: 15000, max: 25000 },
  { name: "Retail: Yoga Mat", min: 3500, max: 6500 },
  { name: "Retail: Water Bottle", min: 1500, max: 2500 },
];

// Seasonal multipliers (Jan=0, Dec=11)
const SEASONAL = [1.3, 1.15, 1.05, 1.0, 0.95, 0.85, 0.8, 0.82, 0.95, 1.0, 1.05, 1.1];

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

export function getDemoConnectionStatus() {
  return {
    connected: true,
    stripe_account_id: "acct_demo_sunrise_yoga",
    business_name: STUDIO_NAME,
    connected_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    last_synced_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Financial data generator
// ---------------------------------------------------------------------------

export function generateDemoFinancialData(days: number) {
  const rng = seededRandom(42 + days); // deterministic per period
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Generate charges
  const charges: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: number;
    description: string | null;
  }> = [];

  const cursor = new Date(startDate);
  while (cursor <= now) {
    const month = cursor.getMonth();
    const seasonal = SEASONAL[month];
    const dayOfWeek = cursor.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Membership charges: ~3-5 per day (billing cycles spread across the month)
    const memberCharges = randomBetween(rng, 2, isWeekend ? 4 : 6);
    for (let i = 0; i < memberCharges; i++) {
      const tier = pickRandom(rng, MEMBERSHIP_TIERS);
      const succeeded = rng() > 0.02; // 2% failure rate
      charges.push({
        id: generateId(rng, "ch"),
        amount: tier.amount,
        currency: "usd",
        status: succeeded ? "succeeded" : "failed",
        created: Math.floor(cursor.getTime() / 1000) + randomBetween(rng, 0, 86400),
        description: tier.name,
      });
    }

    // One-time service charges: 1-4 per day
    const serviceCharges = Math.round(randomBetween(rng, 1, 4) * seasonal);
    for (let i = 0; i < serviceCharges; i++) {
      const service = pickRandom(rng, ONE_TIME_SERVICES);
      const amount = randomBetween(rng, service.min, service.max);
      const succeeded = rng() > 0.01;
      charges.push({
        id: generateId(rng, "ch"),
        amount,
        currency: "usd",
        status: succeeded ? "succeeded" : "failed",
        created: Math.floor(cursor.getTime() / 1000) + randomBetween(rng, 0, 86400),
        description: service.name,
      });
    }

    // Occasional refund
    if (rng() < 0.03) {
      const refundAmount = randomBetween(rng, 2000, 15000);
      charges.push({
        id: generateId(rng, "ch"),
        amount: refundAmount,
        currency: "usd",
        status: "refunded",
        created: Math.floor(cursor.getTime() / 1000) + randomBetween(rng, 0, 86400),
        description: "Refund",
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  charges.sort((a, b) => b.created - a.created);

  // Generate subscriptions
  const subscriptions: Array<{
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    plan_amount: number | null;
    plan_currency: string | null;
    plan_interval: string | null;
    customer: string;
  }> = [];

  // Active subscriptions
  const activeSubCount = randomBetween(rng, 78, 92);
  for (let i = 0; i < activeSubCount; i++) {
    const tier = pickRandom(rng, MEMBERSHIP_TIERS);
    const periodStart = Math.floor(now.getTime() / 1000) - randomBetween(rng, 0, 28 * 86400);
    const periodEnd = periodStart + (tier.interval === "year" ? 365 * 86400 : 30 * 86400);
    subscriptions.push({
      id: generateId(rng, "sub"),
      status: "active",
      current_period_start: periodStart,
      current_period_end: periodEnd,
      plan_amount: tier.amount,
      plan_currency: "usd",
      plan_interval: tier.interval,
      customer: generateId(rng, "cus"),
    });
  }

  // Canceled subscriptions
  const canceledCount = randomBetween(rng, 8, 15);
  for (let i = 0; i < canceledCount; i++) {
    const tier = pickRandom(rng, MEMBERSHIP_TIERS);
    subscriptions.push({
      id: generateId(rng, "sub"),
      status: "canceled",
      current_period_start: Math.floor(now.getTime() / 1000) - randomBetween(rng, 30, 90) * 86400,
      current_period_end: Math.floor(now.getTime() / 1000) - randomBetween(rng, 0, 30) * 86400,
      plan_amount: tier.amount,
      plan_currency: "usd",
      plan_interval: tier.interval,
      customer: generateId(rng, "cus"),
    });
  }

  // Generate payouts (bi-weekly)
  const payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    arrival_date: number;
    created: number;
  }> = [];

  const payoutCursor = new Date(startDate);
  while (payoutCursor <= now) {
    if (payoutCursor.getDay() === 3) { // Wednesdays
      const payoutAmount = randomBetween(rng, 250000, 450000);
      payouts.push({
        id: generateId(rng, "po"),
        amount: payoutAmount,
        currency: "usd",
        status: "paid",
        arrival_date: Math.floor(payoutCursor.getTime() / 1000) + 2 * 86400,
        created: Math.floor(payoutCursor.getTime() / 1000),
      });
    }
    payoutCursor.setDate(payoutCursor.getDate() + 1);
  }

  // Generate balance transactions
  const successfulCharges = charges.filter((c) => c.status === "succeeded");
  const balance_transactions = successfulCharges.slice(0, 100).map((c) => {
    const fee = Math.round(c.amount * 0.029 + 30); // Stripe's 2.9% + $0.30
    return {
      id: generateId(rng, "txn"),
      amount: c.amount,
      fee,
      net: c.amount - fee,
      currency: "usd",
      type: "charge",
      created: c.created,
      description: c.description,
    };
  });

  // Add refund transactions
  const refunds = charges.filter((c) => c.status === "refunded");
  for (const r of refunds) {
    balance_transactions.push({
      id: generateId(rng, "txn"),
      amount: -r.amount,
      fee: 0,
      net: -r.amount,
      currency: "usd",
      type: "refund",
      created: r.created,
      description: "Refund",
    });
  }

  // Compute aggregates
  const totalRevenue = successfulCharges.reduce((sum, c) => sum + c.amount, 0);
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const mrr = activeSubs.reduce((sum, s) => {
    const amount = s.plan_amount || 0;
    if (s.plan_interval === "year") return sum + Math.round(amount / 12);
    return sum + amount;
  }, 0);

  const totalPayouts = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const availableBalance = randomBetween(rng, 180000, 320000);
  const pendingBalance = randomBetween(rng, 40000, 90000);

  // Monthly revenue
  const monthlyRevenueMap = new Map<string, number>();
  for (const c of successfulCharges) {
    const d = new Date(c.created * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) || 0) + c.amount);
  }
  const monthly_revenue = Array.from(monthlyRevenueMap.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Daily revenue (zero-filled)
  const dailyRevenueMap = new Map<string, { amount: number; count: number }>();
  for (const c of successfulCharges) {
    const d = new Date(c.created * 1000);
    const key = d.toISOString().slice(0, 10);
    const entry = dailyRevenueMap.get(key) || { amount: 0, count: 0 };
    entry.amount += c.amount;
    entry.count++;
    dailyRevenueMap.set(key, entry);
  }
  const daily_revenue: Array<{ date: string; amount: number; count: number }> = [];
  const dayCursor = new Date(startDate);
  while (dayCursor <= now) {
    const key = dayCursor.toISOString().slice(0, 10);
    const entry = dailyRevenueMap.get(key);
    daily_revenue.push({ date: key, amount: entry?.amount || 0, count: entry?.count || 0 });
    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  return {
    summary: {
      total_revenue: totalRevenue,
      mrr,
      active_subscriptions: activeSubs.length,
      total_subscriptions: subscriptions.length,
      available_balance: availableBalance,
      pending_balance: pendingBalance,
      total_payouts: totalPayouts,
      currency: "usd",
      period_days: days,
    },
    charges: successfulCharges.slice(0, 50),
    subscriptions: activeSubs.slice(0, 50),
    payouts: payouts.slice(0, 50),
    balance_transactions,
    monthly_revenue,
    daily_revenue,
  };
}

// ---------------------------------------------------------------------------
// Demo insights (pre-baked so we don't need an API key)
// ---------------------------------------------------------------------------

export function generateDemoInsights() {
  return {
    summary:
      "Sunrise Yoga & Wellness is in solid financial health. Revenue has grown 12% over the past quarter, driven primarily by membership growth and strong personal training demand. MRR is stable at approximately $10,200 with 85 active members. There are a few areas to watch: the summer seasonal dip is approaching, refund rates are slightly above average, and your top 5 clients represent about 18% of non-membership revenue.",
    insights: [
      {
        category: "revenue",
        title: "Revenue Up 12% Quarter-Over-Quarter",
        body: "Total revenue grew from approximately $38,400 to $43,100 compared to the previous quarter. The growth is driven by 8 new membership signups and increased personal training bookings. January saw a seasonal spike (+30%) which is typical for fitness businesses.",
        severity: "success" as const,
      },
      {
        category: "growth",
        title: "Net Membership Growth: +8 Members",
        body: "You added 19 new members over the past 90 days while losing 11 to cancellations, netting +8. Your churn rate of ~4.3% monthly is slightly above the industry average of 3.5%. Consider a retention check-in for members in their 3rd month - that's when most cancellations happen.",
        severity: "info" as const,
      },
      {
        category: "margins",
        title: "Stripe Processing Fees: 3.2% of Revenue",
        body: "You're paying approximately $1,380 in Stripe processing fees over the past 90 days (2.9% + $0.30 per transaction). This is standard for card-not-present transactions. No action needed, but consider annual memberships paid upfront to reduce per-transaction costs.",
        severity: "info" as const,
      },
      {
        category: "expenses",
        title: "Refund Rate Slightly Elevated",
        body: "Your refund rate is 3.1% over the past 90 days (12 refunds totaling ~$1,200). The industry average is under 2%. Most refunds are for class packs and drop-ins. Consider a clearer cancellation policy or offering credits instead of refunds.",
        severity: "warning" as const,
      },
      {
        category: "concentration",
        title: "Revenue Diversification Looks Healthy",
        body: "No single client represents more than 4% of total revenue. Your top 5 non-membership clients account for 18% of service revenue, which is within a healthy range. Membership revenue (72% of total) provides a strong recurring base.",
        severity: "success" as const,
      },
      {
        category: "revenue",
        title: "Personal Training Driving 22% of Growth",
        body: "Personal training sessions generated $9,400 in the past 90 days, up 22% from the prior period. This is your highest-margin service. Consider adding a second trainer or expanding availability if demand continues.",
        severity: "success" as const,
      },
      {
        category: "expenses",
        title: "Summer Seasonal Dip Approaching",
        body: "Based on historical patterns, expect a 15-20% revenue dip from June through August. Plan ahead by promoting summer-specific offerings (outdoor yoga, boot camps) or offering a summer discount to reduce churn during the slower months.",
        severity: "warning" as const,
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

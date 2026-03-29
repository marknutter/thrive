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

/**
 * In demo mode, Stripe isn't really connected until the user clicks
 * "Connect Stripe." We track this per-user in the business_profiles table.
 */
export function isDemoStripeConnected(userId: string): boolean {
  if (!isDemoMode()) return false;
  try {
    const { getRawDb } = require("@/lib/db");
    const db = getRawDb();
    const row = db.prepare(
      "SELECT field_value FROM business_profiles WHERE user_id = ? AND field_key = 'demo_stripe_connected'"
    ).get(userId) as { field_value: string } | undefined;
    return row?.field_value === "true";
  } catch {
    return false;
  }
}

export function setDemoStripeConnected(userId: string): void {
  const { setProfileField } = require("@/lib/business-profile");
  setProfileField(userId, "demo_stripe_connected", "true");
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
      "Revenue grew 12% this quarter to $43,100, driven by 8 new memberships and strong personal training demand. Payroll-equivalent costs (processing fees) are running at 3.2% of revenue — within normal range. You've added a net +8 members this quarter with 85 active. Churn is slightly above average at 4.3% monthly — worth watching. Cash reserves are healthy with $2,400 available and $680 pending.",
    insights: [
      {
        category: "revenue_trends",
        title: "Revenue Up 12% Quarter-Over-Quarter",
        body: "Total revenue grew from approximately $38,400 to $43,100 compared to the previous quarter. The growth is driven by 8 new membership signups and increased personal training bookings. January saw a seasonal spike (+30%) which is typical for fitness businesses.",
        severity: "success" as const,
      },
      {
        category: "profitability",
        title: "Healthy Margins After Processing Fees",
        body: "After Stripe processing fees of $1,380 (3.2% of revenue), your net take-home is approximately $41,700 for the quarter. This fee ratio is standard for card-not-present transactions and leaves strong margins for operations.",
        severity: "success" as const,
      },
      {
        category: "payroll_ratio",
        title: "Processing Costs Stable Relative to Revenue",
        body: "Your processing costs have remained steady at 3.2% of revenue as the business has grown. This is a healthy sign — it means costs are scaling proportionally with income rather than outpacing it.",
        severity: "info" as const,
      },
      {
        category: "expense_alerts",
        title: "Refund Rate Slightly Above Average",
        body: "Your refund rate is 3.1% over the past 90 days (12 refunds totaling ~$1,200). The industry average is under 2%. Most refunds are for class packs and drop-ins. This is something worth watching — offering credits instead of refunds could help.",
        severity: "warning" as const,
      },
      {
        category: "revenue_mix",
        title: "Revenue Well-Diversified Across Services",
        body: "No single client represents more than 4% of total revenue. Membership revenue makes up 72% of total income, providing a strong recurring base. Personal training (22% of service revenue) is your fastest-growing segment.",
        severity: "success" as const,
      },
      {
        category: "revenue_trends",
        title: "Personal Training Driving Growth",
        body: "Personal training sessions generated $9,400 in the past 90 days, up 22% from the prior period. This is your highest-margin service. If demand continues, it may be worth considering expanding trainer availability.",
        severity: "success" as const,
      },
    ],
    trends: [
      {
        area: "Revenue",
        description:
          "Revenue has increased steadily over the past four months, growing from $12,200 in December to $15,100 in March.",
        direction: "up" as const,
      },
      {
        area: "Profit Margin",
        description:
          "Net profit margin has held steady at approximately 96.8% after processing fees, consistent with the prior quarter.",
        direction: "flat" as const,
      },
      {
        area: "Membership Growth",
        description:
          "Active memberships have grown from 77 to 85 over the quarter — a net gain of 8 members.",
        direction: "up" as const,
      },
      {
        area: "Membership Retention",
        description:
          "Monthly churn has been approximately 4.3%, slightly above the 3.5% industry average. Most cancellations happen around the 3-month mark.",
        direction: "down" as const,
      },
    ],
    warnings: [
      {
        title: "Membership Cancellations Slightly Elevated",
        body: "You've had 11 cancellations over the past 90 days, with most occurring around month 3 of membership. This is a common pattern — a personal check-in with members around the 2-month mark could help with retention.",
      },
      {
        title: "Summer Seasonal Dip Approaching",
        body: "Based on historical patterns, revenue typically dips 15-20% from June through August. Planning seasonal promotions like outdoor yoga or summer boot camps could help smooth the curve.",
      },
      {
        title: "Refund Volume Worth Monitoring",
        body: "Refunds have averaged $400/month this quarter, mostly for class packs and drop-ins. While not alarming, a clearer cancellation or credit policy could reduce this over time.",
      },
    ],
    positives: [
      {
        title: "Personal Training Revenue Growing Strongly",
        body: "PT revenue is up 22% this quarter, making it your fastest-growing revenue stream. Clients are increasingly investing in one-on-one sessions.",
      },
      {
        title: "Revenue Growth is Consistent",
        body: "You've seen positive month-over-month revenue growth for four consecutive months. This steady upward trend reflects a healthy, growing business.",
      },
      {
        title: "Profit Margins Remain Strong",
        body: "After all processing costs, you're retaining over 96% of revenue. Your cost structure is lean and well-managed.",
      },
      {
        title: "Client Base is Well-Diversified",
        body: "No single client accounts for more than 4% of revenue, and your top 5 clients represent only 18% of service income. This means your business isn't dependent on any one customer.",
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Demo forecast (pre-baked so we don't need Stripe data)
// ---------------------------------------------------------------------------

export function generateDemoForecast() {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() + 1);

  const revenue_forecast = [];
  const cash_flow_forecast = [];
  let runningCash = 248000; // $2,480 starting cash

  for (let i = 0; i < 12; i++) {
    const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    // Growing revenue with seasonal dip in summer
    const baseRevenue = 3210000 + i * 120000; // ~$32,100 growing $1,200/mo
    const seasonalFactor = [1.0, 0.98, 0.95, 0.90, 0.85, 0.82, 0.85, 0.92, 0.98, 1.02, 1.05, 1.08][i];
    const projected = Math.round(baseRevenue * seasonalFactor);
    const low = Math.round(projected * 0.85);
    const high = Math.round(projected * 1.15);

    revenue_forecast.push({ month: monthStr, projected, low, high });

    const cashIn = projected;
    const cashOut = Math.round(projected * 0.62); // ~62% expense ratio
    runningCash = runningCash + cashIn - cashOut;
    cash_flow_forecast.push({ month: monthStr, cash_in: cashIn, cash_out: cashOut, ending_cash: runningCash });
  }

  return {
    snapshot: {
      revenue_trend: "Revenue expected to grow 4-6% based on current membership trends",
      cash_outlook: "Cash reserves cover about 3.2 months of expenses — a healthy buffer",
      payroll_projection: "Payroll estimated at 46% of revenue — within a healthy range",
      margin_projection: "Profit margin at 38% — strong and sustainable",
    },
    revenue_forecast,
    cash_flow_forecast,
    hiring_impact: {
      current_payroll_ratio: 46,
      with_one_hire: 52.3,
      sustainable: true,
      explanation: "Hiring another coach may be sustainable if membership growth continues at the current pace.",
    },
    tax_estimate: {
      projected_annual_profit: 14640000, // $146,400
      estimated_tax: 4392000, // $43,920
      quarterly_payment: 1098000, // $10,980
      explanation: "Based on current profit levels, estimated taxes may be approximately $43,920 this year, or about $10,980 per quarter.",
    },
  };
}

// ---------------------------------------------------------------------------
// Demo compass (pre-baked so we don't need an API key)
// ---------------------------------------------------------------------------

export function generateDemoCompass() {
  const now = new Date();
  const month = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return {
    month,
    priorities: [
      {
        title: "Improve membership retention",
        why: "Membership cancellations increased slightly this month, and retaining members is often the most efficient way to grow revenue. Your churn rate of 4.3% is above the 3.5% industry average, and most cancellations happen around the 3-month mark.",
        actions: [
          "Reach out to members who haven't attended in the last two weeks",
          "Offer a member appreciation event or special class",
          "Review your onboarding experience for new members",
          "Consider a personal check-in with members at the 2-month mark",
        ],
      },
      {
        title: "Monitor payroll as it approaches 50% of revenue",
        why: "Payroll costs are trending slightly upward relative to revenue. While still within a healthy range, keeping an eye on scheduling efficiency can help maintain strong margins as the business grows.",
        actions: [
          "Review class schedules to ensure instructor hours match peak demand",
          "Track instructor-to-member ratios for each class time",
          "Consider cross-training staff to cover multiple roles",
        ],
      },
      {
        title: "Continue promoting personal training packages",
        why: "Personal training revenue grew 22% this quarter, making it your fastest-growing and highest-margin service. This momentum is worth building on.",
        actions: [
          "Feature PT success stories in your marketing",
          "Offer an introductory PT session for new members",
          "Consider expanding trainer availability during peak hours",
        ],
      },
      {
        title: "Prepare for the summer seasonal dip",
        why: "Historical patterns show revenue typically dips 15-20% from June through August. Planning ahead can help smooth the curve and maintain cash flow.",
        actions: [
          "Plan seasonal promotions like outdoor yoga or summer boot camps",
          "Create summer-specific membership packages",
          "Build cash reserves now to cover the slower months",
        ],
      },
    ],
    goals: [
      {
        label: "Monthly Revenue",
        current: "$32,000",
        target: "$40,000",
        progress: 80,
      },
      {
        label: "Profit Margin",
        current: "17%",
        target: "22%",
        progress: 77,
      },
      {
        label: "Active Members",
        current: "145",
        target: "180",
        progress: 81,
      },
      {
        label: "Monthly Churn Rate",
        current: "4.3%",
        target: "3.0%",
        progress: 70,
      },
    ],
    opportunities: [
      {
        title: "Strong demand for evening classes",
        body: "Evening classes are near capacity, suggesting potential demand for additional sessions. Adding one or two more evening time slots could capture members who currently can't find availability.",
      },
      {
        title: "High demand for personal training",
        body: "Personal training sessions are consistently booked out, with a 22% revenue increase this quarter. Expanding trainer availability or adding a new trainer could unlock significant additional revenue.",
      },
      {
        title: "Membership growth potential in corporate wellness",
        body: "Several nearby businesses have expressed interest in group rates. A corporate wellness program could bring in 15-25 new members with lower acquisition costs than individual marketing.",
      },
    ],
    risks: [
      {
        title: "Payroll ratio rising",
        body: "Payroll costs are trending slightly upward relative to revenue. Keeping an eye on scheduling efficiency may help maintain strong margins. This isn't urgent, but worth monitoring monthly.",
      },
      {
        title: "Declining membership retention",
        body: "Monthly churn has increased from 3.5% to 4.3% over the past quarter. Most cancellations happen around the 3-month mark, suggesting the onboarding experience may need attention.",
      },
      {
        title: "Cash reserves thinning ahead of summer",
        body: "With the seasonal summer dip approaching, available cash reserves of $2,400 may feel tight. Building a small buffer over the next two months could provide peace of mind.",
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Forecast engine — pure computation, no AI calls.
 *
 * Takes financial data and generates 12-month revenue projections,
 * cash flow forecasts, hiring impact analysis, and tax estimates.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ForecastInput {
  monthly_revenue: Array<{ month: string; amount: number }>;
  mrr: number;
  active_subscriptions: number;
  total_revenue_last_30: number;
  total_payouts_last_30: number;
  available_balance: number;
  charges: Array<{ amount: number; created: number; description: string | null }>;
}

export interface ForecastResult {
  snapshot: {
    revenue_trend: string;
    cash_outlook: string;
    payroll_projection: string;
    margin_projection: string;
  };
  revenue_forecast: Array<{ month: string; projected: number; low: number; high: number }>;
  cash_flow_forecast: Array<{ month: string; cash_in: number; cash_out: number; ending_cash: number }>;
  hiring_impact: {
    current_payroll_ratio: number;
    with_one_hire: number;
    sustainable: boolean;
    explanation: string;
  };
  tax_estimate: {
    projected_annual_profit: number;
    estimated_tax: number;
    quarterly_payment: number;
    explanation: string;
  };
}

// ---------------------------------------------------------------------------
// Linear regression helper (simple least-squares)
// ---------------------------------------------------------------------------

function linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// ---------------------------------------------------------------------------
// Forecast generator
// ---------------------------------------------------------------------------

export function generateForecast(input: ForecastInput): ForecastResult {
  const {
    monthly_revenue,
    mrr,
    total_revenue_last_30,
    total_payouts_last_30,
    available_balance,
  } = input;

  // --- Revenue forecast via linear regression on monthly data ---
  const sortedMonths = [...monthly_revenue].sort((a, b) => a.month.localeCompare(b.month));
  const regressionPoints = sortedMonths.map((m, i) => ({ x: i, y: m.amount }));
  const { slope, intercept } = linearRegression(regressionPoints);

  // Base value for projections: start from the end of observed data
  const startIndex = sortedMonths.length;
  const lastObservedMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1].month : null;

  // Determine starting month for projections
  const now = new Date();
  let projectionStart: Date;
  if (lastObservedMonth) {
    const [yr, mo] = lastObservedMonth.split("-").map(Number);
    projectionStart = new Date(yr, mo); // next month after last observed
  } else {
    projectionStart = new Date(now.getFullYear(), now.getMonth() + 1);
  }

  const revenue_forecast: ForecastResult["revenue_forecast"] = [];
  for (let i = 0; i < 12; i++) {
    const futureDate = new Date(projectionStart.getFullYear(), projectionStart.getMonth() + i);
    const monthStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;
    const projected = Math.max(0, Math.round(intercept + slope * (startIndex + i)));
    const low = Math.max(0, Math.round(projected * 0.85));
    const high = Math.round(projected * 1.15);
    revenue_forecast.push({ month: monthStr, projected, low, high });
  }

  // --- Revenue trend description ---
  const monthlyGrowthRate = sortedMonths.length >= 2
    ? ((slope / (intercept + slope * (sortedMonths.length - 1))) * 100)
    : 0;
  const growthPct = Math.abs(monthlyGrowthRate);
  let revenueTrendDesc: string;
  if (monthlyGrowthRate > 1) {
    revenueTrendDesc = `Revenue expected to grow ${growthPct.toFixed(0)}-${(growthPct + 2).toFixed(0)}% per month based on current trends`;
  } else if (monthlyGrowthRate > 0) {
    revenueTrendDesc = `Revenue showing modest growth of about ${growthPct.toFixed(1)}% per month`;
  } else if (monthlyGrowthRate > -1) {
    revenueTrendDesc = "Revenue is roughly flat — holding steady at current levels";
  } else {
    revenueTrendDesc = `Revenue trending down about ${growthPct.toFixed(0)}% per month — worth keeping an eye on`;
  }

  // --- Cash flow forecast ---
  const avgMonthlyIn = total_revenue_last_30; // use last 30 days as proxy
  const avgMonthlyOut = total_payouts_last_30;
  let runningCash = available_balance;

  const cash_flow_forecast: ForecastResult["cash_flow_forecast"] = [];
  for (let i = 0; i < 12; i++) {
    const futureDate = new Date(projectionStart.getFullYear(), projectionStart.getMonth() + i);
    const monthStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;
    // Scale cash in with projected revenue growth
    const revenueGrowthFactor = revenue_forecast[i] && avgMonthlyIn > 0
      ? revenue_forecast[i].projected / avgMonthlyIn
      : 1;
    const cashIn = Math.round(avgMonthlyIn * Math.max(0.8, Math.min(1.5, revenueGrowthFactor)));
    const cashOut = avgMonthlyOut; // expenses stay roughly constant
    runningCash = runningCash + cashIn - cashOut;
    cash_flow_forecast.push({ month: monthStr, cash_in: cashIn, cash_out: cashOut, ending_cash: runningCash });
  }

  // Cash outlook
  const monthsOfExpenses = avgMonthlyOut > 0 ? (available_balance / avgMonthlyOut) : 99;
  let cashOutlook: string;
  if (monthsOfExpenses >= 3) {
    cashOutlook = `Cash reserves cover about ${monthsOfExpenses.toFixed(1)} months of expenses — a healthy buffer`;
  } else if (monthsOfExpenses >= 1) {
    cashOutlook = `Cash reserves cover about ${monthsOfExpenses.toFixed(1)} months of expenses — consider building a larger cushion`;
  } else {
    cashOutlook = "Cash reserves are thin — building up at least 3 months of expenses would help";
  }

  // --- Hiring impact ---
  const NEW_HIRE_COST = 350000; // $3,500/month in cents
  const currentPayrollEstimate = Math.round(avgMonthlyOut * 0.45); // estimate 45% of outflows is payroll
  const currentPayrollRatio = avgMonthlyIn > 0 ? (currentPayrollEstimate / avgMonthlyIn) * 100 : 0;
  const withOneHirePayroll = currentPayrollEstimate + NEW_HIRE_COST;
  const withOneHireRatio = avgMonthlyIn > 0 ? (withOneHirePayroll / avgMonthlyIn) * 100 : 0;
  const hiringSustainable = withOneHireRatio < 60;

  let hiringExplanation: string;
  if (hiringSustainable && monthlyGrowthRate > 0) {
    hiringExplanation = "Hiring another coach may be sustainable if membership growth continues at the current pace.";
  } else if (hiringSustainable) {
    hiringExplanation = "A new hire looks feasible at current revenue levels, but watch for growth to ensure long-term sustainability.";
  } else {
    hiringExplanation = "Adding a coach at current revenue levels would push payroll costs higher than ideal. Consider hiring after revenue grows further.";
  }

  // --- Payroll projection ---
  const payrollProjection = `Payroll estimated at ${currentPayrollRatio.toFixed(0)}% of revenue — ${
    currentPayrollRatio < 50 ? "within a healthy range" : "on the higher end, worth monitoring"
  }`;

  // --- Tax estimate ---
  const annualizedRevenue = avgMonthlyIn * 12;
  const annualizedExpenses = avgMonthlyOut * 12;
  const projectedAnnualProfit = annualizedRevenue - annualizedExpenses;
  const effectiveRate = 0.30; // combined self-employment + income
  const estimatedTax = Math.max(0, Math.round(projectedAnnualProfit * effectiveRate));
  const quarterlyPayment = Math.round(estimatedTax / 4);

  const formatUSD = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const taxExplanation = projectedAnnualProfit > 0
    ? `Based on current profit levels, estimated taxes may be approximately ${formatUSD(estimatedTax)} this year, or about ${formatUSD(quarterlyPayment)} per quarter.`
    : "Current expenses exceed revenue, so estimated tax obligation is minimal. Focus on growing revenue and reducing costs.";

  // --- Margin projection ---
  const profitMargin = avgMonthlyIn > 0
    ? ((avgMonthlyIn - avgMonthlyOut) / avgMonthlyIn * 100)
    : 0;
  const marginProjection = profitMargin > 20
    ? `Profit margin at ${profitMargin.toFixed(0)}% — strong and sustainable`
    : profitMargin > 0
      ? `Profit margin at ${profitMargin.toFixed(0)}% — there may be room to improve`
      : "Currently operating at a loss — prioritize revenue growth or expense reduction";

  return {
    snapshot: {
      revenue_trend: revenueTrendDesc,
      cash_outlook: cashOutlook,
      payroll_projection: payrollProjection,
      margin_projection: marginProjection,
    },
    revenue_forecast,
    cash_flow_forecast,
    hiring_impact: {
      current_payroll_ratio: Math.round(currentPayrollRatio * 10) / 10,
      with_one_hire: Math.round(withOneHireRatio * 10) / 10,
      sustainable: hiringSustainable,
      explanation: hiringExplanation,
    },
    tax_estimate: {
      projected_annual_profit: projectedAnnualProfit,
      estimated_tax: estimatedTax,
      quarterly_payment: quarterlyPayment,
      explanation: taxExplanation,
    },
  };
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Users,
  PiggyBank,
  Calculator,
  SlidersHorizontal,
  RefreshCw,
  Loader2,
  Lightbulb,
  MessageCircle,
  BarChart3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ForecastSnapshot {
  revenue_trend: string;
  cash_outlook: string;
  payroll_projection: string;
  margin_projection: string;
}

interface RevenueForecastMonth {
  month: string;
  projected: number;
  low: number;
  high: number;
}

interface CashFlowMonth {
  month: string;
  cash_in: number;
  cash_out: number;
  ending_cash: number;
}

interface HiringImpact {
  current_payroll_ratio: number;
  with_one_hire: number;
  sustainable: boolean;
  explanation: string;
}

interface TaxEstimate {
  projected_annual_profit: number;
  estimated_tax: number;
  quarterly_payment: number;
  explanation: string;
}

interface ForecastData {
  snapshot: ForecastSnapshot;
  revenue_forecast: RevenueForecastMonth[];
  cash_flow_forecast: CashFlowMonth[];
  hiring_impact: HiringImpact;
  tax_estimate: TaxEstimate;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatShortMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

const cardClass =
  "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6";

const insightClass =
  "rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20";

// ---------------------------------------------------------------------------
// Section 1 — Forecast Snapshot
// ---------------------------------------------------------------------------

function SnapshotSection({ snapshot }: { snapshot: ForecastSnapshot }) {
  const bullets = [
    { icon: TrendingUp, text: snapshot.revenue_trend },
    { icon: PiggyBank, text: snapshot.cash_outlook },
    { icon: Users, text: snapshot.payroll_projection },
    { icon: DollarSign, text: snapshot.margin_projection },
  ];

  return (
    <div className={cardClass}>
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Next 6-Month Outlook
        </h2>
      </div>
      <ul className="space-y-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-950/30">
              <b.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {b.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Revenue Forecast Chart
// ---------------------------------------------------------------------------

function RevenueChart({ data }: { data: RevenueForecastMonth[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { maxAmount, yTicks, chartWidth, chartHeight } = useMemo(() => {
    const allValues = data.flatMap((d) => [d.high, d.projected, d.low]);
    const max = Math.max(...allValues, 100);
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const niceMax = Math.ceil(max / magnitude) * magnitude;
    const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
    return {
      maxAmount: niceMax,
      yTicks: ticks,
      chartWidth: Math.max(600, data.length * 56),
      chartHeight: 280,
    };
  }, [data]);

  if (data.length === 0) return null;

  const padLeft = 80;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 36;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  // Build SVG path strings
  const getX = (i: number) => padLeft + (i / (data.length - 1)) * plotW;
  const getY = (val: number) => padTop + plotH - (val / maxAmount) * plotH;

  const projectedLine = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.projected)}`).join(" ");
  const bandTop = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.high)}`).join(" ");
  const bandBottom = [...data].reverse().map((d, i) => `L ${getX(data.length - 1 - i)} ${getY(d.low)}`).join(" ");
  const bandPath = `${bandTop} ${bandBottom} Z`;

  // Six-month revenue insight
  const sixMonthRevenue = data.length >= 6 ? data[5].projected : data[data.length - 1].projected;

  return (
    <div className={cardClass}>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Revenue Forecast
      </h2>
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[400px]"
          preserveAspectRatio="xMinYMid meet"
        >
          {/* Grid lines + Y labels */}
          {yTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={chartWidth - padRight}
                  y2={y}
                  className="stroke-zinc-200 dark:stroke-zinc-700"
                  strokeWidth={0.5}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-zinc-400 dark:fill-zinc-500"
                  fontSize={10}
                >
                  {formatCurrency(tick)}
                </text>
              </g>
            );
          })}

          {/* Confidence band */}
          <path
            d={bandPath}
            className="fill-emerald-100 dark:fill-emerald-900/30"
          />

          {/* Projected line */}
          <path
            d={projectedLine}
            fill="none"
            className="stroke-emerald-500 dark:stroke-emerald-400"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={d.month}>
              <circle
                cx={getX(i)}
                cy={getY(d.projected)}
                r={hoveredIdx === i ? 5 : 3.5}
                className="fill-emerald-500 dark:fill-emerald-400"
              />
              {/* Hit area */}
              <rect
                x={getX(i) - plotW / data.length / 2}
                y={padTop}
                width={plotW / data.length}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              />
            </g>
          ))}

          {/* X-axis month labels */}
          {data.map((d, i) => (
            <text
              key={d.month}
              x={getX(i)}
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500"
              fontSize={10}
            >
              {formatShortMonth(d.month)}
            </text>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
            style={{
              left: `${(getX(hoveredIdx) / chartWidth) * 100}%`,
              top: "8px",
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-medium">{formatMonth(data[hoveredIdx].month)}</div>
            <div>Projected: {formatCurrency(data[hoveredIdx].projected)}</div>
            <div className="text-zinc-400 dark:text-zinc-500">
              Range: {formatCurrency(data[hoveredIdx].low)} – {formatCurrency(data[hoveredIdx].high)}
            </div>
          </div>
        )}
      </div>

      {/* Insight */}
      <div className={`mt-4 ${insightClass}`}>
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            If membership growth continues at the current pace, revenue may reach approximately{" "}
            {formatCurrency(sixMonthRevenue)}/month within six months.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Cash Flow Forecast
// ---------------------------------------------------------------------------

function CashFlowSection({ data }: { data: CashFlowMonth[] }) {
  const thClass =
    "text-left py-2 px-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase";
  const thRightClass =
    "text-right py-2 px-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase";
  const rowBorder = "border-b border-zinc-100 dark:border-zinc-800";
  const headBorder = "border-b border-zinc-200 dark:border-zinc-700";

  // Check if all months have positive ending cash
  const allPositive = data.every((d) => d.ending_cash > 0);
  const minCash = Math.min(...data.map((d) => d.ending_cash));

  return (
    <div className={cardClass}>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Cash Flow Forecast
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={headBorder}>
              <th className={thClass}>Month</th>
              <th className={thRightClass}>Cash In</th>
              <th className={thRightClass}>Cash Out</th>
              <th className={thRightClass}>Ending Cash</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.month} className={rowBorder}>
                <td className="py-2.5 px-3 text-zinc-900 dark:text-zinc-100">
                  {formatMonth(m.month)}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(m.cash_in)}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(m.cash_out)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-semibold ${
                    m.ending_cash >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {m.ending_cash < 0 ? "-" : ""}
                  {formatCurrency(Math.abs(m.ending_cash))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insight */}
      <div className={`mt-4 ${insightClass}`}>
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {allPositive
              ? "At current spending levels, cash reserves are projected to remain above three months of expenses."
              : `Cash reserves may dip to ${formatCurrency(minCash)} — consider building a larger buffer before that point.`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — Hiring Impact
// ---------------------------------------------------------------------------

function HiringSection({ impact }: { impact: HiringImpact }) {
  return (
    <div className={cardClass}>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Hiring &amp; Payroll Forecast
      </h2>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          If you hire 1 additional coach
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Current Payroll Ratio</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {impact.current_payroll_ratio}%
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">With New Hire</p>
            <p className={`text-2xl font-bold ${impact.sustainable ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {impact.with_one_hire}%
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all"
              style={{ width: `${Math.min(100, impact.current_payroll_ratio)}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400">{impact.current_payroll_ratio}%</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className={`h-full rounded-full transition-all ${impact.sustainable ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-500 dark:bg-amber-400"}`}
              style={{ width: `${Math.min(100, impact.with_one_hire)}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400">{impact.with_one_hire}%</span>
        </div>
      </div>

      {/* Insight */}
      <div className={`mt-4 ${insightClass}`}>
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {impact.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — Scenario Planning
// ---------------------------------------------------------------------------

function ScenarioSection({ forecast }: { forecast: ForecastData }) {
  const [membershipGrowth, setMembershipGrowth] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [expenseChange, setExpenseChange] = useState(0);

  // Use the first projected month as the baseline
  const baseRevenue = forecast.revenue_forecast.length > 0 ? forecast.revenue_forecast[0].projected : 0;
  const baseCashIn = forecast.cash_flow_forecast.length > 0 ? forecast.cash_flow_forecast[0].cash_in : 0;
  const baseCashOut = forecast.cash_flow_forecast.length > 0 ? forecast.cash_flow_forecast[0].cash_out : 0;
  const startingCash = forecast.cash_flow_forecast.length > 0
    ? forecast.cash_flow_forecast[0].ending_cash - forecast.cash_flow_forecast[0].cash_in + forecast.cash_flow_forecast[0].cash_out
    : 0;

  const impacts = useMemo(() => {
    // Price change: convert dollar change to cents, multiply by estimated member count
    // Estimate member count from revenue / avg price
    const avgMemberPrice = baseRevenue > 0 ? Math.round(baseRevenue / 85) : 15000; // ~$150 avg
    const memberCount = baseRevenue > 0 ? Math.round(baseRevenue / avgMemberPrice) : 85;

    const revenueFromGrowth = Math.round(baseRevenue * (membershipGrowth / 100));
    const revenueFromPrice = Math.round(priceChange * 100 * memberCount); // $X per member in cents
    const newRevenue = baseRevenue + revenueFromGrowth + revenueFromPrice;
    const newExpenses = Math.round(baseCashOut * (1 + expenseChange / 100));

    const revenueChange = newRevenue - baseRevenue;
    const profitChange = revenueChange - (newExpenses - baseCashOut);
    const newProfit = newRevenue - newExpenses;
    const newMargin = newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0;

    // Cash position in 6 months
    let cash = startingCash;
    for (let i = 0; i < 6; i++) {
      cash += newRevenue - newExpenses;
    }

    return {
      revenueChange,
      profitChange,
      newMargin,
      cashIn6Months: cash,
    };
  }, [membershipGrowth, priceChange, expenseChange, baseRevenue, baseCashOut, startingCash]);

  return (
    <div className={cardClass}>
      <div className="mb-5 flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          What If?
        </h2>
      </div>

      {/* Sliders */}
      <div className="space-y-5 mb-6">
        <SliderControl
          label="Membership growth"
          value={membershipGrowth}
          min={-10}
          max={20}
          step={1}
          unit="%"
          onChange={setMembershipGrowth}
        />
        <SliderControl
          label="Price change per membership"
          value={priceChange}
          min={-20}
          max={20}
          step={1}
          unit="$"
          prefix
          onChange={setPriceChange}
        />
        <SliderControl
          label="Expense change"
          value={expenseChange}
          min={-10}
          max={15}
          step={1}
          unit="%"
          onChange={setExpenseChange}
        />
      </div>

      {/* Impact cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ImpactCard
          label="Revenue Change"
          value={`${impacts.revenueChange >= 0 ? "+" : ""}${formatCurrency(impacts.revenueChange)}/mo`}
          positive={impacts.revenueChange >= 0}
        />
        <ImpactCard
          label="Profit Change"
          value={`${impacts.profitChange >= 0 ? "+" : ""}${formatCurrency(impacts.profitChange)}/mo`}
          positive={impacts.profitChange >= 0}
        />
        <ImpactCard
          label="New Profit Margin"
          value={`${impacts.newMargin.toFixed(1)}%`}
          positive={impacts.newMargin > 20}
        />
        <ImpactCard
          label="Cash in 6 Months"
          value={formatCurrency(impacts.cashIn6Months)}
          positive={impacts.cashIn6Months > 0}
        />
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  prefix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  prefix?: boolean;
  onChange: (v: number) => void;
}) {
  const displayValue = prefix
    ? `${value >= 0 ? "+" : ""}$${value}`
    : `${value >= 0 ? "+" : ""}${value}${unit}`;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <span
          className={`text-sm font-semibold ${
            value > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : value < 0
                ? "text-red-500 dark:text-red-400"
                : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-zinc-200 dark:bg-zinc-700 accent-emerald-500 touch-manipulation"
        style={{ minHeight: "44px", padding: "18px 0" }}
      />
      <div className="mt-0.5 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>{prefix ? `$${min}` : `${min}${unit}`}</span>
        <span>{prefix ? `+$${max}` : `+${max}${unit}`}</span>
      </div>
    </div>
  );
}

function ImpactCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={`text-base font-bold sm:text-lg ${
          positive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-500 dark:text-red-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 6 — Tax Estimate
// ---------------------------------------------------------------------------

function TaxSection({ tax }: { tax: TaxEstimate }) {
  return (
    <div className={cardClass}>
      <div className="mb-4 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Tax Planning
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Projected Annual Profit
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(tax.projected_annual_profit)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Estimated Tax Obligation
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(tax.estimated_tax)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Suggested Quarterly Payment
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(tax.quarterly_payment)}
          </p>
        </div>
      </div>

      {/* Insight */}
      <div className={`mt-4 ${insightClass}`}>
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {tax.explanation}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500 italic">
        This is an estimate for planning purposes only. Consult a tax professional for
        personalized advice.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Snapshot section skeleton (4 bullets) */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-emerald-200 dark:bg-emerald-800" />
          <div className="h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 h-7 w-7 shrink-0 animate-pulse rounded-lg bg-emerald-100 dark:bg-emerald-950/30" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className={cardClass}>
        <div className="h-5 w-40 mb-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-72 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Cash flow table skeleton */}
      <div className={cardClass}>
        <div className="h-5 w-44 mb-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="space-y-0">
          {/* Table header */}
          <div className="flex items-center gap-4 py-2 border-b border-zinc-200 dark:border-zinc-700">
            <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-20 ml-auto animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-20 ml-auto animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Hiring impact skeleton */}
      <div className={cardClass}>
        <div className="h-5 w-52 mb-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-3 w-28 mb-2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div>
              <div className="h-3 w-20 mb-2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
          <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ForecastPage() {
  const router = useRouter();
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forecast");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load forecast (${res.status})`);
      }
      const json: ForecastData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/app")}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Back to chat"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Thrive Forecast
                </h1>
                <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                  Where Your Business Is Heading
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/app/insights")}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Financial Insights"
            >
              <Lightbulb className="h-5 w-5" />
            </button>
            <button
              onClick={() => router.push("/app/dashboard")}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Financial Dashboard"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <button
              onClick={fetchForecast}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {loading ? "Loading..." : "Refresh"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {loading && !data && <LoadingSkeleton />}

        {error && !loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 border-l-4 border-l-red-500 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchForecast}
              className="mt-3 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Try again
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Section 1 — Snapshot */}
            <SnapshotSection snapshot={data.snapshot} />

            {/* Section 2 — Revenue Forecast Chart */}
            <RevenueChart data={data.revenue_forecast} />

            {/* Section 3 — Cash Flow */}
            <CashFlowSection data={data.cash_flow_forecast} />

            {/* Section 4 — Hiring Impact */}
            <HiringSection impact={data.hiring_impact} />

            {/* Section 5 — Scenario Planning */}
            <ScenarioSection forecast={data} />

            {/* Section 6 — Tax Estimate */}
            <TaxSection tax={data.tax_estimate} />

            {/* Bottom — Link to chat */}
            <div className="text-center">
              <button
                onClick={() => {
                  const params = new URLSearchParams({ q: "Tell me more about my financial forecast" });
                  router.push(`/app?${params.toString()}`);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              >
                <MessageCircle className="h-4 w-4" />
                Have questions about your forecast? Ask Thrive
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

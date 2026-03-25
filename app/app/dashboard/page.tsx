"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Link2,
  Link2Off,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { Tabs, TabPanel } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectionStatus {
  connected: boolean;
  stripe_account_id?: string;
  business_name?: string;
  connected_at?: string;
  last_synced_at?: string;
}

interface FinancialSummary {
  total_revenue: number;
  mrr: number;
  active_subscriptions: number;
  total_subscriptions: number;
  available_balance: number;
  pending_balance: number;
  total_payouts: number;
  currency: string;
  period_days: number;
}

interface Charge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
}

interface Sub {
  id: string;
  status: string;
  plan_amount: number | null;
  plan_currency: string | null;
  plan_interval: string | null;
  customer: string;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
  created: number;
}

interface BalanceTransaction {
  id: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  type: string;
  created: number;
  description: string | null;
}

interface MonthlyRevenue {
  month: string;
  amount: number;
}

interface FinancialData {
  summary: FinancialSummary;
  charges: Charge[];
  subscriptions: Sub[];
  payouts: Payout[];
  balance_transactions: BalanceTransaction[];
  monthly_revenue: MonthlyRevenue[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Shared card wrapper
// ---------------------------------------------------------------------------

const cardClass =
  "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6";
const thClass =
  "text-left py-2 px-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase";
const thRightClass =
  "text-right py-2 px-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase";
const tdClass = "py-2.5 px-3 text-zinc-500 dark:text-zinc-400";
const tdMainClass = "py-2.5 px-3 text-zinc-900 dark:text-zinc-100";
const tdRightClass =
  "py-2.5 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100";
const rowBorderClass = "border-b border-zinc-100 dark:border-zinc-800";
const headBorderClass = "border-b border-zinc-200 dark:border-zinc-700";

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: "up" | "down" | null;
  subtitle?: string;
}) {
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          {label}
        </span>
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
          <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
        {trend && (
          <span
            className={`flex items-center text-xs font-medium mb-1 ${
              trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {trend === "up" ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ConnectPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 mb-6">
        <BarChart3 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Connect Your Stripe Account
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mb-8">
        Link your Stripe account to see your revenue, subscriptions, payouts,
        and financial health — all in one place. We only request read-only
        access.
      </p>
      <a
        href="/api/stripe/connect"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
      >
        <Link2 className="w-4 h-4" />
        Connect Stripe
      </a>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
        Read-only access &middot; Disconnect anytime &middot; Your data stays
        private
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab components
// ---------------------------------------------------------------------------

function RecentCharges({
  charges,
  currency,
}: {
  charges: Charge[];
  currency: string;
}) {
  if (charges.length === 0) {
    return <EmptyState message="No charges in this period." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={headBorderClass}>
            <th className={thClass}>Date</th>
            <th className={thClass}>Description</th>
            <th className={thRightClass}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((c) => (
            <tr key={c.id} className={rowBorderClass}>
              <td className={tdClass}>{formatDate(c.created)}</td>
              <td className={tdMainClass}>{c.description || "Payment"}</td>
              <td className={tdRightClass}>
                {formatCurrency(c.amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubscriptionBreakdown({
  subscriptions,
  currency,
}: {
  subscriptions: Sub[];
  currency: string;
}) {
  if (subscriptions.length === 0) {
    return <EmptyState message="No active subscriptions." />;
  }

  const monthly = subscriptions.filter((s) => s.plan_interval === "month");
  const yearly = subscriptions.filter((s) => s.plan_interval === "year");
  const weekly = subscriptions.filter((s) => s.plan_interval === "week");
  const other = subscriptions.filter(
    (s) => !["month", "year", "week"].includes(s.plan_interval || "")
  );

  const groups = [
    { label: "Monthly", subs: monthly },
    { label: "Yearly", subs: yearly },
    { label: "Weekly", subs: weekly },
    { label: "Other", subs: other },
  ].filter((g) => g.subs.length > 0);

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const total = group.subs.reduce(
          (sum, s) => sum + (s.plan_amount || 0),
          0
        );
        return (
          <div
            key={group.label}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {group.label}
              </span>
              <span className="ml-2 text-xs text-zinc-400">
                {group.subs.length} active
              </span>
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(total, currency)}
              <span className="text-xs text-zinc-400 ml-1">
                /{group.label === "Yearly" ? "yr" : group.label === "Weekly" ? "wk" : "mo"}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// P&L Tab
// ---------------------------------------------------------------------------

function ProfitAndLoss({
  charges,
  balanceTransactions,
  currency,
}: {
  charges: Charge[];
  balanceTransactions: BalanceTransaction[];
  currency: string;
}) {
  const totalRevenue = charges.reduce((sum, c) => sum + c.amount, 0);

  const totalFees = balanceTransactions
    .filter((t) => t.type === "charge" || t.type === "payment")
    .reduce((sum, t) => sum + t.fee, 0);

  const totalRefunds = balanceTransactions
    .filter((t) => t.type === "refund")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpenses = totalFees + totalRefunds;
  const netIncome = totalRevenue - totalExpenses;

  const rows = [
    { label: "Gross Revenue", amount: totalRevenue, bold: true },
    { label: "Stripe Fees", amount: -totalFees, bold: false },
    { label: "Refunds", amount: -totalRefunds, bold: false },
    { label: "Total Expenses", amount: -totalExpenses, bold: true },
    { label: "Net Income", amount: netIncome, bold: true },
  ];

  return (
    <div className={cardClass}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Profit &amp; Loss
      </h2>
      {charges.length === 0 && balanceTransactions.length === 0 ? (
        <EmptyState message="No transactions in this period." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={headBorderClass}>
                <th className={thClass}>Item</th>
                <th className={thRightClass}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={`${rowBorderClass} ${row.bold ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}`}
                >
                  <td
                    className={`py-2.5 px-3 ${
                      row.bold
                        ? "font-semibold text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-600 dark:text-zinc-400 pl-6"
                    }`}
                  >
                    {row.label}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-medium ${
                      row.amount < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {row.amount < 0 ? "(" : ""}
                    {formatCurrency(Math.abs(row.amount), currency)}
                    {row.amount < 0 ? ")" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cash Flow Tab
// ---------------------------------------------------------------------------

function CashFlow({
  charges,
  payouts,
  balanceTransactions,
  currency,
}: {
  charges: Charge[];
  payouts: Payout[];
  balanceTransactions: BalanceTransaction[];
  currency: string;
}) {
  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      { inflows: number; outflows: number }
    >();

    // Inflows: successful charges
    for (const c of charges) {
      const d = new Date(c.created * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = map.get(key) || { inflows: 0, outflows: 0 };
      entry.inflows += c.amount;
      map.set(key, entry);
    }

    // Outflows: payouts
    for (const p of payouts) {
      if (p.status !== "paid") continue;
      const d = new Date(p.created * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = map.get(key) || { inflows: 0, outflows: 0 };
      entry.outflows += p.amount;
      map.set(key, entry);
    }

    // Outflows: refunds
    for (const t of balanceTransactions) {
      if (t.type !== "refund") continue;
      const d = new Date(t.created * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = map.get(key) || { inflows: 0, outflows: 0 };
      entry.outflows += Math.abs(t.amount);
      map.set(key, entry);
    }

    return Array.from(map.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [charges, payouts, balanceTransactions]);

  const totals = monthlyData.reduce(
    (acc, m) => ({
      inflows: acc.inflows + m.inflows,
      outflows: acc.outflows + m.outflows,
    }),
    { inflows: 0, outflows: 0 }
  );

  return (
    <div className={cardClass}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Cash Flow
      </h2>
      {monthlyData.length === 0 ? (
        <EmptyState message="No cash flow data in this period." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={headBorderClass}>
                <th className={thClass}>Month</th>
                <th className={thRightClass}>Inflows</th>
                <th className={thRightClass}>Outflows</th>
                <th className={thRightClass}>Net</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m) => {
                const net = m.inflows - m.outflows;
                return (
                  <tr key={m.month} className={rowBorderClass}>
                    <td className={tdMainClass}>{formatMonth(m.month)}</td>
                    <td className={tdRightClass}>
                      {formatCurrency(m.inflows, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(m.outflows, currency)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        net >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {net < 0 ? "-" : ""}
                      {formatCurrency(Math.abs(net), currency)}
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                  Total
                </td>
                <td className={tdRightClass}>
                  {formatCurrency(totals.inflows, currency)}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(totals.outflows, currency)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-semibold ${
                    totals.inflows - totals.outflows >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {totals.inflows - totals.outflows < 0 ? "-" : ""}
                  {formatCurrency(
                    Math.abs(totals.inflows - totals.outflows),
                    currency
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue Breakdown Tab
// ---------------------------------------------------------------------------

function RevenueBreakdown({
  charges,
  currency,
}: {
  charges: Charge[];
  currency: string;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const c of charges) {
      const key = c.description || "Unspecified";
      const entry = map.get(key) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += c.amount;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([description, data]) => ({ description, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [charges]);

  const grandTotal = grouped.reduce((sum, g) => sum + g.total, 0);

  return (
    <div className={cardClass}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Revenue Breakdown
      </h2>
      {grouped.length === 0 ? (
        <EmptyState message="No revenue data in this period." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={headBorderClass}>
                <th className={thClass}>Product / Description</th>
                <th className={thRightClass}>Count</th>
                <th className={thRightClass}>Revenue</th>
                <th className={thRightClass}>Share</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => {
                const pct =
                  grandTotal > 0
                    ? ((g.total / grandTotal) * 100).toFixed(1)
                    : "0.0";
                return (
                  <tr key={g.description} className={rowBorderClass}>
                    <td className={tdMainClass}>{g.description}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-500 dark:text-zinc-400">
                      {g.count}
                    </td>
                    <td className={tdRightClass}>
                      {formatCurrency(g.total, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-500 dark:text-zinc-400">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                  Total
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                  {grouped.reduce((sum, g) => sum + g.count, 0)}
                </td>
                <td className={tdRightClass}>
                  {formatCurrency(grandTotal, currency)}
                </td>
                <td className="py-2.5 px-3 text-right text-zinc-500 dark:text-zinc-400">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const DASHBOARD_TABS = [
  { key: "overview", label: "Overview" },
  { key: "pnl", label: "P&L" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "revenue", label: "Revenue Breakdown" },
];

// ---------------------------------------------------------------------------
// Main Dashboard (wrapped in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [days, setDays] = useState(30);
  const [disconnecting, setDisconnecting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const stripeConnected = searchParams.get("stripe_connected");
  const stripeError = searchParams.get("stripe_error");

  const fetchConnection = useCallback(async () => {
    const res = await fetch("/api/stripe/connect-status");
    if (res.ok) {
      const status = await res.json();
      setConnection(status);
      return status.connected;
    }
    return false;
  }, []);

  const fetchData = useCallback(
    async (periodDays: number) => {
      setSyncing(true);
      try {
        const res = await fetch(`/api/stripe/connect-data?days=${periodDays}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } finally {
        setSyncing(false);
      }
    },
    []
  );

  useEffect(() => {
    async function init() {
      setLoading(true);
      const connected = await fetchConnection();
      if (connected) {
        await fetchData(days);
      }
      setLoading(false);
    }
    init();
  }, [fetchConnection, fetchData, days]);

  // Clear URL params after reading
  useEffect(() => {
    if (stripeConnected || stripeError) {
      router.replace("/app/dashboard", { scroll: false });
    }
  }, [stripeConnected, stripeError, router]);

  async function handleDisconnect() {
    if (!confirm("Disconnect your Stripe account? You can reconnect anytime."))
      return;
    setDisconnecting(true);
    await fetch("/api/stripe/disconnect", { method: "POST" });
    setConnection({ connected: false });
    setData(null);
    setDisconnecting(false);
  }

  async function handleRefresh() {
    await fetchData(days);
    await fetchConnection();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!connection?.connected) {
    return <ConnectPrompt />;
  }

  const s = data?.summary;
  const currency = s?.currency || "usd";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.push("/app")}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-500" />
            </button>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Financial Dashboard
            </h1>
          </div>
          {connection.business_name && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-8">
              {connection.business_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={syncing}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw
              className={`w-4 h-4 text-zinc-500 ${syncing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
            title="Disconnect Stripe"
          >
            <Link2Off className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Success/Error banners */}
      {stripeConnected && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm">
          Stripe account connected successfully!
        </div>
      )}
      {stripeError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
          Connection error: {stripeError}
        </div>
      )}

      {/* Tab Navigation */}
      <Tabs
        tabs={DASHBOARD_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Overview Tab */}
      <TabPanel active={activeTab === "overview"}>
        <div className="space-y-8">
          {/* Metric Cards */}
          {s && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Revenue"
                value={formatCurrency(s.total_revenue, currency)}
                icon={DollarSign}
                subtitle={`Last ${s.period_days} days`}
              />
              <MetricCard
                label="MRR"
                value={formatCurrency(s.mrr, currency)}
                icon={TrendingUp}
                subtitle={`${s.active_subscriptions} active subscriptions`}
              />
              <MetricCard
                label="Cash"
                value={formatCurrency(s.available_balance, currency)}
                icon={Wallet}
                subtitle={
                  s.pending_balance > 0
                    ? `${formatCurrency(s.pending_balance, currency)} pending`
                    : "Available balance"
                }
              />
              <MetricCard
                label="Payouts"
                value={formatCurrency(s.total_payouts, currency)}
                icon={CreditCard}
                subtitle={`Last ${s.period_days} days`}
              />
            </div>
          )}

          {/* Lower section: Charges + Subscriptions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`lg:col-span-2 ${cardClass}`}>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Recent Payments
              </h2>
              {data && (
                <RecentCharges charges={data.charges} currency={currency} />
              )}
            </div>
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Subscriptions
              </h2>
              {data && (
                <SubscriptionBreakdown
                  subscriptions={data.subscriptions}
                  currency={currency}
                />
              )}
            </div>
          </div>
        </div>
      </TabPanel>

      {/* P&L Tab */}
      <TabPanel active={activeTab === "pnl"}>
        {data && (
          <ProfitAndLoss
            charges={data.charges}
            balanceTransactions={data.balance_transactions}
            currency={currency}
          />
        )}
      </TabPanel>

      {/* Cash Flow Tab */}
      <TabPanel active={activeTab === "cashflow"}>
        {data && (
          <CashFlow
            charges={data.charges}
            payouts={data.payouts}
            balanceTransactions={data.balance_transactions}
            currency={currency}
          />
        )}
      </TabPanel>

      {/* Revenue Breakdown Tab */}
      <TabPanel active={activeTab === "revenue"}>
        {data && (
          <RevenueBreakdown charges={data.charges} currency={currency} />
        )}
      </TabPanel>

      {/* Last synced */}
      {connection.last_synced_at && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
          Last synced:{" "}
          {new Date(connection.last_synced_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

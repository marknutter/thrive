"use client";

import { useState, useEffect, useCallback } from "react";
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

interface FinancialData {
  summary: FinancialSummary;
  charges: Charge[];
  subscriptions: Sub[];
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
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
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

function RecentCharges({
  charges,
  currency,
}: {
  charges: Charge[];
  currency: string;
}) {
  if (charges.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
        No charges in this period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
              Date
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
              Description
            </th>
            <th className="text-right py-2 px-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {charges.map((c) => (
            <tr
              key={c.id}
              className="border-b border-zinc-100 dark:border-zinc-800"
            >
              <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">
                {formatDate(c.created)}
              </td>
              <td className="py-2.5 px-3 text-zinc-900 dark:text-zinc-100">
                {c.description || "Payment"}
              </td>
              <td className="py-2.5 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
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
    return (
      <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
        No active subscriptions.
      </div>
    );
  }

  // Group by interval
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
        {/* Recent Charges */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Recent Payments
          </h2>
          {data && (
            <RecentCharges charges={data.charges} currency={currency} />
          )}
        </div>

        {/* Subscription Breakdown */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
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

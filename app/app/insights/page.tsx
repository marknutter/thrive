"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  PieChart,
  AlertTriangle,
  Users,
  RefreshCw,
  Loader2,
  Lightbulb,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Insight {
  category: "revenue" | "margins" | "expenses" | "concentration" | "growth";
  title: string;
  body: string;
  severity: "info" | "warning" | "success" | "critical";
}

interface InsightsResponse {
  summary: string;
  insights: Insight[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const categoryIcons: Record<Insight["category"], React.ElementType> = {
  revenue: TrendingUp,
  margins: PieChart,
  expenses: AlertTriangle,
  concentration: Users,
  growth: BarChart3,
};

const categoryLabels: Record<Insight["category"], string> = {
  revenue: "Revenue",
  margins: "Margins",
  expenses: "Expenses",
  concentration: "Concentration",
  growth: "Growth",
};

const severityStyles: Record<
  Insight["severity"],
  { border: string; badge: string; badgeText: string; icon: string }
> = {
  info: {
    border: "border-l-blue-500",
    badge: "bg-blue-100 dark:bg-blue-950/40",
    badgeText: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
  },
  warning: {
    border: "border-l-amber-500",
    badge: "bg-amber-100 dark:bg-amber-950/40",
    badgeText: "text-amber-700 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
  },
  success: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-100 dark:bg-emerald-950/40",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  critical: {
    border: "border-l-red-500",
    badge: "bg-red-100 dark:bg-red-950/40",
    badgeText: "text-red-700 dark:text-red-300",
    icon: "text-red-600 dark:text-red-400",
  },
};

const cardClass =
  "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800";

// ---------------------------------------------------------------------------
// Insight Card
// ---------------------------------------------------------------------------

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = categoryIcons[insight.category];
  const styles = severityStyles[insight.severity];

  return (
    <div className={`${cardClass} border-l-4 ${styles.border} p-5`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800">
            <Icon className={`h-4 w-4 ${styles.icon}`} />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {insight.title}
            </h3>
            <span
              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge} ${styles.badgeText}`}
            >
              {categoryLabels[insight.category]}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {insight.body}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary skeleton */}
      <div className={`${cardClass} p-6`}>
        <div className="space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
      {/* Card skeletons */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`${cardClass} border-l-4 border-l-zinc-300 dark:border-l-zinc-600 p-5`}>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
              <div className="space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InsightsPage() {
  const router = useRouter();
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load insights (${res.status})`);
      }
      const json: InsightsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

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
              <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Financial Insights
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/app/dashboard")}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Financial Dashboard"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {loading ? "Generating..." : "Refresh"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {loading && !data && <LoadingSkeleton />}

        {error && !loading && (
          <div className={`${cardClass} border-l-4 border-l-red-500 p-6`}>
            <p className="font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
            <button
              onClick={fetchInsights}
              className="mt-3 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Try again
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Overall summary */}
            <div
              className={`${cardClass} border-l-4 border-l-emerald-500 p-6`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Summary
                </h2>
              </div>
              <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">
                {data.summary}
              </p>
            </div>

            {/* Insight cards grid */}
            {data.insights.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.insights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} />
                ))}
              </div>
            ) : (
              <div className={`${cardClass} p-6 text-center`}>
                <p className="text-zinc-500 dark:text-zinc-400">
                  No insights available yet. Connect your Stripe account and
                  check back later.
                </p>
              </div>
            )}

            {/* Generated at timestamp */}
            <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
              Generated{" "}
              {new Date(data.generatedAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {loading && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Refreshing...
                </span>
              )}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

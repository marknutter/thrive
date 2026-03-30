"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Compass,
  Target,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Loader2,
  MessageCircle,
  CheckCircle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Priority {
  title: string;
  why: string;
  actions: string[];
}

interface Goal {
  label: string;
  current: string;
  target: string;
  progress: number;
}

interface Signal {
  title: string;
  body: string;
}

interface CompassResponse {
  month: string;
  priorities: Priority[];
  goals: Goal[];
  opportunities: Signal[];
  risks: Signal[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const cardClass =
  "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800";

const ASK_THRIVE_QUESTIONS = [
  "Should I hire another coach?",
  "Should I raise membership prices?",
  "What should I focus on this quarter?",
];

// ---------------------------------------------------------------------------
// Section Components
// ---------------------------------------------------------------------------

function MonthlyCompassSection({ month, priorities }: { month: string; priorities: Priority[] }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="mb-3 flex items-center gap-2">
        <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Your Compass for {month.split(" ")[0]}
        </h2>
      </div>
      <ol className="space-y-2">
        {priorities.map((p, idx) => (
          <li key={idx} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white dark:bg-emerald-700">
              {idx + 1}
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {p.title}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PriorityCards({ priorities }: { priorities: Priority[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Priority Details
        </h2>
      </div>
      <div className="space-y-4">
        {priorities.map((p, idx) => (
          <div key={idx} className={`${cardClass} border-l-4 border-l-emerald-500 p-5`}>
            <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {p.title}
            </h3>
            <div className="mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Why it matters:
              </span>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {p.why}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Suggested actions:
              </span>
              <ul className="mt-1 space-y-1">
                {p.actions.map((action, aIdx) => (
                  <li key={aIdx} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategicGoalsTable({ goals }: { goals: Goal[] }) {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Strategic Goals
        </h2>
      </div>
      <div className={`${cardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:px-5">
                Goal
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:px-5">
                Current
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:px-5">
                Target
              </th>
            </tr>
          </thead>
          <tbody>
            {goals.map((goal, idx) => (
              <tr
                key={idx}
                className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/60"
              >
                <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:px-5">
                  {goal.label}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 sm:px-5">
                  {goal.current}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 sm:px-5">
                  {goal.target}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function ProgressTracking({ goals }: { goals: Goal[] }) {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Progress Tracking
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {goals.map((goal, idx) => (
          <div key={idx} className={`${cardClass} p-5`}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {goal.label}
              </h3>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {goal.progress}%
              </span>
            </div>
            <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500 dark:bg-emerald-600"
                style={{ width: `${Math.min(goal.progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>{goal.current}</span>
              <span>{goal.target}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunitySignals({ opportunities }: { opportunities: Signal[] }) {
  if (!opportunities || opportunities.length === 0) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/15">
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Growth Opportunities
        </h2>
      </div>
      <p className="mb-4 text-xs text-emerald-600/80 dark:text-emerald-400/70">
        Areas where your business has room to grow.
      </p>
      <div className="space-y-4">
        {opportunities.map((opp, idx) => (
          <div key={idx} className="flex gap-3">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {opp.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {opp.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskSignals({ risks }: { risks: Signal[] }) {
  if (!risks || risks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Areas to Watch
        </h2>
      </div>
      <p className="mb-4 text-xs text-amber-600/80 dark:text-amber-400/70">
        Not alarms — just gentle signals worth keeping an eye on.
      </p>
      <div className="space-y-4">
        {risks.map((risk, idx) => (
          <div key={idx}>
            <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {risk.title}
            </h3>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {risk.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AskThriveSection() {
  const router = useRouter();

  function handleQuestion(question: string) {
    const params = new URLSearchParams({ q: question });
    router.push(`/app?${params.toString()}`);
  }

  return (
    <div className={`${cardClass} p-6`}>
      <div className="mb-1 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Ask Thrive
        </h2>
      </div>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Compass pulls data from Insights and Forecast to answer your questions.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {ASK_THRIVE_QUESTIONS.map((question, idx) => (
          <button
            key={idx}
            onClick={() => handleQuestion(question)}
            className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm text-zinc-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 touch-manipulation"
          >
            &ldquo;{question}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Monthly compass summary skeleton */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-emerald-200 dark:bg-emerald-800" />
          <div className="h-4 w-40 animate-pulse rounded bg-emerald-200 dark:bg-emerald-800" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-emerald-200 dark:bg-emerald-800" />
              <div className="h-4 flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Priority detail cards skeleton (3 items) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`${cardClass} border-l-4 border-l-zinc-300 dark:border-l-zinc-600 p-5`}
          >
            <div className="mb-3 h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="mb-3 space-y-1.5">
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              {[1, 2].map((j) => (
                <div key={j} className="flex gap-2">
                  <div className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Goals table skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className={`${cardClass} overflow-hidden`}>
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="h-4 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Progress tracking skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`${cardClass} p-5`}>
            <div className="mb-2 flex items-center justify-between">
              <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="mb-2 h-3 w-full animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex justify-between">
              <div className="h-3 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>

      {/* Signal cards skeleton (2 columns) */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Opportunities */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/15">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-emerald-200 dark:bg-emerald-800" />
            <div className="h-4 w-36 animate-pulse rounded bg-emerald-200 dark:bg-emerald-800" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>
        {/* Risks */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-amber-200 dark:bg-amber-800" />
            <div className="h-4 w-28 animate-pulse rounded bg-amber-200 dark:bg-amber-800" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CompassPage() {
  const router = useRouter();
  const [data, setData] = useState<CompassResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompass = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem("thrive_compass");
        if (cached) {
          const parsed = JSON.parse(cached) as CompassResponse & { _cachedAt: number };
          if (Date.now() - parsed._cachedAt < 10 * 60 * 1000) {
            setData(parsed);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore */ }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compass");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to load Compass (${res.status})`
        );
      }
      const json: CompassResponse = await res.json();
      setData(json);
      try {
        sessionStorage.setItem("thrive_compass", JSON.stringify({ ...json, _cachedAt: Date.now() }));
      } catch { /* ignore */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompass(false);
  }, [fetchCompass]);

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
              <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Thrive Compass
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Your Goals and Priorities
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchCompass(true)}
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
              onClick={() => fetchCompass(true)}
              className="mt-3 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Try again
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Section 1 — Monthly Compass (top priorities list) */}
            <MonthlyCompassSection month={data.month} priorities={data.priorities} />

            {/* Section 2 — Priority Cards (expanded detail) */}
            <PriorityCards priorities={data.priorities} />

            {/* Section 3 — Strategic Goals (table) */}
            <StrategicGoalsTable goals={data.goals} />

            {/* Section 4 — Progress Tracking (visual bars) */}
            <ProgressTracking goals={data.goals} />

            {/* Section 5 — Opportunity Signals */}
            <OpportunitySignals opportunities={data.opportunities} />

            {/* Section 6 — Risk Signals */}
            <RiskSignals risks={data.risks} />

            {/* Section 7 — Ask Thrive */}
            <AskThriveSection />

            {/* Bottom — Refresh + timestamp */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => fetchCompass(true)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh Compass
              </button>
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
          </div>
        )}
      </main>
    </div>
  );
}

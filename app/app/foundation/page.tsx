"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  Circle,
  DollarSign,
  FileText,
  Loader2,
  MessageSquare,
  Printer,
  RefreshCw,
  Target,
  Wallet,
  Wrench,
} from "lucide-react";
import type { FoundationDoc } from "@/lib/foundation";

// ---------------------------------------------------------------------------
// Foundation page
// ---------------------------------------------------------------------------

export default function FoundationPage() {
  const router = useRouter();
  const [doc, setDoc] = useState<FoundationDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch("/api/foundation");
      if (!res.ok) throw new Error("Failed to load foundation document");
      const data = await res.json();
      setDoc(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/foundation", { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      setDoc(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchDoc(); }}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!doc) return null;

  const hasData =
    doc.businessSnapshot ||
    doc.revenueModel ||
    doc.costStructure ||
    doc.systems ||
    doc.goals;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Print-friendly styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-inside: avoid; }
          body { background: white !important; }
          .dark body { background: white !important; color: black !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => router.push("/app")}
          className="no-print mb-6 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Coach
        </button>

        {/* Header */}
        <div className="mb-8 print-break">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                Your Business Foundation
              </h1>
              {doc.businessSnapshot?.name && (
                <p className="mt-1 text-lg text-emerald-600 dark:text-emerald-400">
                  {doc.businessSnapshot.name}
                </p>
              )}
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Generated {new Date(doc.generatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="no-print flex gap-2">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
                Regenerate
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white transition-colors hover:bg-emerald-700"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </div>

        {!hasData && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
            <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No data yet
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Start a coaching session to build your Business Foundation.
            </p>
            <button
              onClick={() => router.push("/app")}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
            >
              <MessageSquare className="h-4 w-4" />
              Start Coaching
            </button>
          </div>
        )}

        {/* Business Snapshot */}
        {doc.businessSnapshot && (
          <SectionCard
            icon={Building2}
            title="Business Snapshot"
            className="print-break"
          >
            <FieldGrid>
              <Field label="Business Name" value={doc.businessSnapshot.name} />
              <Field label="Type" value={doc.businessSnapshot.type} />
              <Field label="Location" value={doc.businessSnapshot.location} />
              <Field label="Years in Business" value={doc.businessSnapshot.yearsInBusiness} />
              <Field label="Owner" value={doc.businessSnapshot.owner} />
            </FieldGrid>
          </SectionCard>
        )}

        {/* Revenue Model */}
        {doc.revenueModel && (
          <SectionCard
            icon={DollarSign}
            title="Revenue Model"
            className="print-break"
          >
            <FieldGrid>
              <Field label="Revenue Streams" value={doc.revenueModel.streams} />
              <Field label="Monthly Revenue" value={doc.revenueModel.monthlyRevenue} />
              <Field label="Pricing" value={doc.revenueModel.pricing} />
              <Field label="Member Count" value={doc.revenueModel.memberCount} />
            </FieldGrid>
          </SectionCard>
        )}

        {/* Cost Structure */}
        {doc.costStructure && (
          <SectionCard
            icon={Wallet}
            title="Cost Structure"
            className="print-break"
          >
            <FieldGrid>
              <Field label="Biggest Costs" value={doc.costStructure.biggestCosts} />
              <Field label="How Owner Takes Pay" value={doc.costStructure.ownerPay} />
            </FieldGrid>
          </SectionCard>
        )}

        {/* Systems & Tools */}
        {doc.systems && (
          <SectionCard
            icon={Wrench}
            title="Systems & Tools"
            className="print-break"
          >
            <FieldGrid>
              <Field label="Studio Software" value={doc.systems.studioSoftware} />
              <Field label="Payment Processor" value={doc.systems.paymentProcessor} />
              <Field label="Accounting Software" value={doc.systems.accountingSoftware} />
            </FieldGrid>
          </SectionCard>
        )}

        {/* Goals & Priorities */}
        {doc.goals && (
          <SectionCard
            icon={Target}
            title="Goals & Priorities"
            className="print-break"
          >
            <FieldGrid>
              <Field label="Primary Goal" value={doc.goals.primaryGoal} />
              <Field label="Revenue Goal" value={doc.goals.revenueGoal} />
              <Field label="Biggest Frustration" value={doc.goals.biggestFrustration} />
            </FieldGrid>
          </SectionCard>
        )}

        {/* Milestone Progress */}
        <SectionCard
          icon={Check}
          title="Milestone Progress"
          className="print-break"
        >
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {doc.milestoneProgress.completed}/{doc.milestoneProgress.total} complete
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {doc.milestoneProgress.percentage}%
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${doc.milestoneProgress.percentage}%` }}
              />
            </div>
          </div>

          {/* Milestone list */}
          <div className="space-y-2">
            {doc.milestones.map((m) => (
              <div
                key={m.key}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
              >
                {m.status === "completed" ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                )}
                <span
                  className={
                    m.status === "completed"
                      ? "text-gray-700 dark:text-gray-300"
                      : "text-gray-400 dark:text-gray-500"
                  }
                >
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Recommendations */}
        {doc.recommendations.length > 0 && (
          <SectionCard
            icon={Target}
            title="Recommended Next Steps"
            className="print-break"
          >
            <ul className="space-y-2">
              {doc.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-6 text-center dark:border-gray-800">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            This document was generated by Thrive based on your coaching session.
          </p>
          <button
            onClick={() => router.push("/app")}
            className="no-print mt-3 inline-flex items-center gap-2 text-sm text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <MessageSquare className="h-4 w-4" />
            Continue Coaching
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
        {value || (
          <span className="italic text-gray-400 dark:text-gray-500">
            Continue your coaching session to fill this in
          </span>
        )}
      </dd>
    </div>
  );
}

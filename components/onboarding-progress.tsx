"use client";

import { useState } from "react";
import {
  Rocket,
  Check,
  Minus,
  Circle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
} from "lucide-react";

export interface OnboardingStep {
  step_key: string;
  label: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  notes: string | null;
  completed_at: string | null;
}

export interface OnboardingProgressProps {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  onRefresh: () => void;
}

function StepIcon({ status }: { status: OnboardingStep["status"] }) {
  switch (status) {
    case "completed":
      return (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-3.5 w-3.5" />
        </div>
      );
    case "in_progress":
      return (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
          <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      );
    case "skipped":
      return (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500">
          <Minus className="h-3 w-3" />
        </div>
      );
    default:
      return (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
          <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
        </div>
      );
  }
}

export function OnboardingProgress({
  steps,
  completedCount,
  totalCount,
  onRefresh,
}: OnboardingProgressProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const toggleStep = (stepKey: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepKey)) {
        next.delete(stepKey);
      } else {
        next.add(stepKey);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Rocket className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Thrive Launch
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {completedCount} of {totalCount} complete
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Refresh progress"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-1">
          {steps.map((step) => {
            const isExpanded = expandedSteps.has(step.step_key);
            const hasDetails = step.description || step.notes;

            return (
              <div key={step.step_key}>
                <button
                  type="button"
                  onClick={() => hasDetails && toggleStep(step.step_key)}
                  className={`w-full rounded-xl px-2.5 py-2 text-left transition-colors ${
                    hasDetails ? "hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""
                  } ${
                    step.status === "in_progress"
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      <StepIcon status={step.status} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-sm leading-tight ${
                          step.status === "completed"
                            ? "text-gray-500 dark:text-gray-400 line-through"
                            : step.status === "skipped"
                              ? "text-gray-400 dark:text-gray-500"
                              : step.status === "in_progress"
                                ? "font-medium text-emerald-700 dark:text-emerald-300"
                                : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {hasDetails && (
                      <div className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {isExpanded && hasDetails && (
                  <div className="ml-[34px] pb-2 pr-2">
                    {step.description && (
                      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        {step.description}
                      </p>
                    )}
                    {step.notes && (
                      <p className="mt-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {step.notes}
                      </p>
                    )}
                    {step.completed_at && (
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                        Completed{" "}
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(step.completed_at))}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Mobile overlay wrapper for the onboarding panel */
export function OnboardingPanelOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

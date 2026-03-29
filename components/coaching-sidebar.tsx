"use client";

import { useState } from "react";
import {
  ClipboardList,
  User,
  FileText,
  Rocket,
  Check,
  Circle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  ArrowRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MilestoneItem {
  key: string;
  label: string;
  description: string;
  type: "auto" | "manual";
  order: number;
  status: "pending" | "in_progress" | "completed";
  completedAt: string | null;
  updatedAt: string | null;
  fieldsPresent?: number;
  fieldsRequired?: number;
}

export interface MilestoneProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface ProfileField {
  key: string;
  label: string;
  value: string;
}

export interface ProfileCompleteness {
  filled: number;
  total: number;
  percentage: number;
}

export interface CoachingSidebarProps {
  // Milestones tab
  milestones: MilestoneItem[];
  milestoneProgress: MilestoneProgress;
  onRefreshMilestones: () => void;
  onToggleMilestone: (key: string, currentStatus: string) => void;
  // Profile tab
  profileFields: ProfileField[];
  profileCompleteness: ProfileCompleteness;
  onRefreshProfile: () => void;
}

type TabId = "checklist" | "profile" | "summary";

const TABS: { id: TabId; label: string; icon: typeof ClipboardList }[] = [
  { id: "checklist", label: "Milestones", icon: ClipboardList },
  { id: "profile", label: "Profile", icon: User },
  { id: "summary", label: "Summary", icon: FileText },
];

// ─── Profile field groupings ─────────────────────────────────────────────────

const FIELD_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Business Info",
    keys: [
      "business_name",
      "business_type",
      "location",
      "years_in_business",
      "owner_name",
      "business_structure",
      "has_ein",
      "has_business_bank",
    ],
  },
  {
    title: "Finances",
    keys: [
      "revenue_streams",
      "monthly_revenue",
      "pricing_structure",
      "member_count",
      "biggest_costs",
      "owner_pay",
    ],
  },
  {
    title: "Systems",
    keys: ["studio_software", "payment_processor", "accounting_software"],
  },
  {
    title: "Goals",
    keys: ["revenue_goal", "biggest_frustration", "primary_goal"],
  },
];

// All field labels (mirrors PROFILE_FIELDS in lib/business-profile.ts)
const ALL_FIELD_LABELS: Record<string, string> = {
  business_name: "Business Name",
  business_type: "Business Type",
  location: "Location",
  years_in_business: "Years in Business",
  owner_name: "Owner Name",
  revenue_streams: "Revenue Streams",
  monthly_revenue: "Monthly Revenue",
  pricing_structure: "Pricing Structure",
  member_count: "Member Count",
  biggest_costs: "Biggest Costs",
  owner_pay: "Owner Pay",
  studio_software: "Studio Software",
  payment_processor: "Payment Processor",
  accounting_software: "Accounting Software",
  business_structure: "Business Structure",
  has_ein: "Has EIN",
  has_business_bank: "Business Bank Account",
  revenue_goal: "Revenue Goal",
  biggest_frustration: "Biggest Frustration",
  primary_goal: "Primary Goal",
};

// ─── Milestone icon ──────────────────────────────────────────────────────────

function MilestoneIcon({ milestone }: { milestone: MilestoneItem }) {
  if (milestone.status === "completed") {
    return (
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-3.5 w-3.5" />
      </div>
    );
  }

  // Auto milestone: show pulse if some fields present but not all
  if (milestone.type === "auto" && milestone.fieldsPresent && milestone.fieldsPresent > 0) {
    return (
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
        <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    );
  }

  // Pending
  return (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
      <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
    </div>
  );
}

// ─── Manual milestone checkbox ───────────────────────────────────────────────

function ManualCheckbox({
  milestone,
  onToggle,
}: {
  milestone: MilestoneItem;
  onToggle: () => void;
}) {
  const completed = milestone.status === "completed";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors"
      title={completed ? "Mark incomplete" : "Mark complete"}
    >
      {completed ? (
        <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-emerald-500 bg-emerald-500">
          <Check className="h-3 w-3 text-white" />
        </div>
      ) : (
        <div className="h-5 w-5 rounded border-2 border-gray-300 transition-colors hover:border-emerald-400 dark:border-gray-600 dark:hover:border-emerald-500" />
      )}
    </button>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="px-4 py-3">
      <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Milestones tab ──────────────────────────────────────────────────────────

function MilestonesTab({
  milestones,
  progress,
  onToggleMilestone,
}: {
  milestones: MilestoneItem[];
  progress: MilestoneProgress;
  onToggleMilestone: (key: string, currentStatus: string) => void;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const autoMilestones = milestones.filter((m) => m.type === "auto");
  const manualMilestones = milestones.filter((m) => m.type === "manual");

  const renderMilestone = (milestone: MilestoneItem) => {
    const isExpanded = expandedItems.has(milestone.key);
    return (
      <div key={milestone.key}>
        <button
          type="button"
          onClick={() => toggleExpand(milestone.key)}
          className={`w-full rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
            milestone.status === "completed"
              ? ""
              : milestone.type === "auto" && milestone.fieldsPresent && milestone.fieldsPresent > 0
                ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                : ""
          }`}
        >
          <div className="flex items-start gap-2.5">
            {milestone.type === "manual" ? (
              <div className="mt-0.5">
                <ManualCheckbox
                  milestone={milestone}
                  onToggle={() => onToggleMilestone(milestone.key, milestone.status)}
                />
              </div>
            ) : (
              <div className="mt-0.5">
                <MilestoneIcon milestone={milestone} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span
                className={`text-sm leading-tight ${
                  milestone.status === "completed"
                    ? "text-gray-500 dark:text-gray-400 line-through"
                    : milestone.type === "auto" && milestone.fieldsPresent && milestone.fieldsPresent > 0
                      ? "font-medium text-emerald-700 dark:text-emerald-300"
                      : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {milestone.label}
              </span>
              {milestone.type === "auto" &&
                milestone.fieldsPresent !== undefined &&
                milestone.fieldsRequired !== undefined &&
                milestone.status !== "completed" && (
                  <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                    ({milestone.fieldsPresent}/{milestone.fieldsRequired})
                  </span>
                )}
            </div>
            <div className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="ml-[34px] pb-2 pr-2">
            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {milestone.description}
            </p>
            {milestone.completedAt && (
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                Completed{" "}
                {new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(milestone.completedAt))}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ProgressBar
        percent={progress.percentage}
        label={`${progress.completed} of ${progress.total} complete`}
      />
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {/* Coaching Progress group (auto milestones 1-5) */}
        <div className="mb-4">
          <h4 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Coaching Progress
          </h4>
          <div className="space-y-0.5">
            {autoMilestones.map(renderMilestone)}
          </div>
        </div>

        {/* Business Setup group (manual milestones 6-10) */}
        <div>
          <h4 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Business Setup
          </h4>
          <div className="space-y-0.5">
            {manualMilestones.map(renderMilestone)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────────────────

function ProfileTab({
  profileFields,
  completeness,
}: {
  profileFields: ProfileField[];
  completeness: ProfileCompleteness;
}) {
  const fieldMap = new Map(profileFields.map((f) => [f.key, f.value]));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ProgressBar
        percent={completeness.percentage}
        label={`${completeness.filled} of ${completeness.total} fields captured`}
      />
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-4">
          {FIELD_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.title}
              </h4>
              <div className="space-y-0.5">
                {group.keys.map((key) => {
                  const value = fieldMap.get(key);
                  const label = ALL_FIELD_LABELS[key] || key;
                  return (
                    <div
                      key={key}
                      className={`rounded-lg px-2.5 py-1.5 transition-all duration-300 ${
                        value
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                          : ""
                      }`}
                    >
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        {label}
                      </p>
                      {value ? (
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {value}
                        </p>
                      ) : (
                        <p className="text-xs italic text-gray-300 dark:text-gray-600">
                          Not yet captured
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Summary tab ─────────────────────────────────────────────────────────────

function SummaryTab({ profileFields }: { profileFields: ProfileField[] }) {
  const fieldMap = new Map(profileFields.map((f) => [f.key, f.value]));

  const get = (key: string) => fieldMap.get(key);

  const summaryRows: { label: string; value: string | undefined }[] = [
    {
      label: "Business",
      value:
        get("business_name") || get("business_type") || get("location")
          ? [get("business_name"), get("business_type"), get("location")]
              .filter(Boolean)
              .join(" -- ")
          : undefined,
    },
    {
      label: "Revenue",
      value:
        get("monthly_revenue") || get("member_count")
          ? [
              get("monthly_revenue"),
              get("member_count") ? `${get("member_count")} members` : null,
            ]
              .filter(Boolean)
              .join(", ")
          : undefined,
    },
    {
      label: "Systems",
      value:
        get("studio_software") || get("payment_processor")
          ? [get("studio_software"), get("payment_processor")]
              .filter(Boolean)
              .join(", ")
          : undefined,
    },
    {
      label: "Goals",
      value:
        get("primary_goal") || get("revenue_goal")
          ? [get("primary_goal"), get("revenue_goal")]
              .filter(Boolean)
              .join(", ")
          : undefined,
    },
  ];

  const hasAnyData = summaryRows.some((r) => r.value);

  const nextSteps = [
    { label: "Thrive Launch", href: "/app/launch" },
    { label: "Dashboard", href: "/app/dashboard" },
    { label: "Insights", href: "/app/insights" },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pb-3 pt-3">
        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Session Overview
        </h4>

        {hasAnyData ? (
          <div className="space-y-2.5">
            {summaryRows.map((row) => (
              <div key={row.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {row.label}
                </p>
                {row.value ? (
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {row.value}
                  </p>
                ) : (
                  <p className="text-xs italic text-gray-300 dark:text-gray-600">
                    Not enough information yet
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 px-4 py-6 text-center dark:bg-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No profile data yet.
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Keep chatting and Thrive will extract key business facts automatically.
            </p>
          </div>
        )}

        <div className="mt-6">
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Next Steps
          </h4>
          <div className="space-y-1">
            {nextSteps.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50"
              >
                {link.label}
                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main sidebar component ──────────────────────────────────────────────────

export function CoachingSidebar({
  milestones,
  milestoneProgress,
  onRefreshMilestones,
  onToggleMilestone,
  profileFields,
  profileCompleteness,
  onRefreshProfile,
}: CoachingSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>("checklist");

  const handleRefresh = () => {
    if (activeTab === "checklist") onRefreshMilestones();
    else onRefreshProfile();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Rocket className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Coaching
            </h3>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-3 pb-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "checklist" && (
        <MilestonesTab
          milestones={milestones}
          progress={milestoneProgress}
          onToggleMilestone={onToggleMilestone}
        />
      )}
      {activeTab === "profile" && (
        <ProfileTab
          profileFields={profileFields}
          completeness={profileCompleteness}
        />
      )}
      {activeTab === "summary" && <SummaryTab profileFields={profileFields} />}
    </div>
  );
}

// ─── Mobile overlay ──────────────────────────────────────────────────────────

export function CoachingSidebarOverlay({
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  Loader2,
  Rocket,
  Zap,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MilestoneItem {
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

interface MilestoneProgress {
  completed: number;
  total: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// State filing URLs by state
// ---------------------------------------------------------------------------

const STATE_LLC_URLS: Record<string, string> = {
  AL: "https://www.sos.alabama.gov/business-entities",
  AK: "https://www.commerce.alaska.gov/web/cbpl/Corporations.aspx",
  AZ: "https://azcc.gov/divisions/corporations",
  AR: "https://www.sos.arkansas.gov/business-commercial-services-bcs",
  CA: "https://www.sos.ca.gov/business-programs/business-entities/forming-llc",
  CO: "https://www.sos.state.co.us/biz/BusinessEntityCriteraExt.do",
  CT: "https://portal.ct.gov/SOTS/Business-Services",
  DE: "https://corp.delaware.gov/howtoform/",
  FL: "https://dos.fl.gov/sunbiz/start-business/efile/fl-llc/",
  GA: "https://sos.ga.gov/corporations-division",
  HI: "https://cca.hawaii.gov/breg/",
  ID: "https://sos.idaho.gov/business-services/",
  IL: "https://www.ilsos.gov/departments/business_services/",
  IN: "https://www.in.gov/sos/business/start-a-business/",
  IA: "https://sos.iowa.gov/business/FormsAndFees.html",
  KS: "https://www.sos.ks.gov/business/business.html",
  KY: "https://www.sos.ky.gov/bus/business-filings/Pages/default.aspx",
  LA: "https://www.sos.la.gov/BusinessServices/Pages/default.aspx",
  ME: "https://www.maine.gov/sos/cec/corp/",
  MD: "https://dat.maryland.gov/businesses",
  MA: "https://www.sec.state.ma.us/cor/coridx.htm",
  MI: "https://www.michigan.gov/lara/bureau-list/cscl/corps",
  MN: "https://www.sos.state.mn.us/business-liens/start-a-business/",
  MS: "https://www.sos.ms.gov/business-services",
  MO: "https://www.sos.mo.gov/business",
  MT: "https://sosmt.gov/business/",
  NE: "https://sos.nebraska.gov/business-services",
  NV: "https://www.nvsos.gov/sos/businesses",
  NH: "https://www.sos.nh.gov/corporation-division",
  NJ: "https://www.njportal.com/DOR/BusinessFormation/",
  NM: "https://www.sos.nm.gov/business-services/",
  NY: "https://www.dos.ny.gov/corps/llcfaq.asp",
  NC: "https://www.sosnc.gov/divisions/business_registration",
  ND: "https://sos.nd.gov/business-services",
  OH: "https://www.ohiosos.gov/businesses/",
  OK: "https://www.sos.ok.gov/business/default.aspx",
  OR: "https://sos.oregon.gov/business/Pages/register.aspx",
  PA: "https://www.dos.pa.gov/BusinessCharities/Business/Pages/default.aspx",
  RI: "https://www.sos.ri.gov/divisions/business-services",
  SC: "https://sos.sc.gov/online-filings",
  SD: "https://sdsos.gov/business-services/",
  TN: "https://sos.tn.gov/business-services",
  TX: "https://www.sos.texas.gov/corp/forms_702.shtml",
  UT: "https://corporations.utah.gov/",
  VT: "https://sos.vermont.gov/corporations/",
  VA: "https://www.scc.virginia.gov/pages/Business-Entity-Forms",
  WA: "https://www.sos.wa.gov/corps/",
  WV: "https://sos.wv.gov/business/Pages/default.aspx",
  WI: "https://www.wdfi.org/Corporations/",
  WY: "https://sos.wyo.gov/Business/StartBusiness.aspx",
  DC: "https://dcra.dc.gov/service/corporate-registration",
};

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LaunchPage() {
  const router = useRouter();
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [progress, setProgress] = useState<MilestoneProgress>({
    completed: 0,
    total: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);

  // Local form state for optional fields
  const [selectedState, setSelectedState] = useState("");

  // ---------------------------------------------------------------------------
  // Fetch milestones
  // ---------------------------------------------------------------------------

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch("/api/milestones");
      if (!res.ok) throw new Error("Failed to fetch milestones");
      const data = await res.json();
      setMilestones(data.milestones ?? []);
      setProgress(data.progress ?? { completed: 0, total: 0, percentage: 0 });
    } catch (err) {
      console.error("Failed to load milestones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  // ---------------------------------------------------------------------------
  // Toggle manual milestone
  // ---------------------------------------------------------------------------

  const toggleMilestone = async (key: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    setUpdatingStep(key);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_key: key, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update milestone");
      await fetchMilestones();
    } catch (err) {
      console.error("Failed to toggle milestone:", err);
    } finally {
      setUpdatingStep(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getMilestone = (key: string) => milestones.find((m) => m.key === key);
  const isCompleted = (key: string) => getMilestone(key)?.status === "completed";

  const autoMilestones = milestones.filter((m) => m.type === "auto");
  const manualMilestones = milestones.filter((m) => m.type === "manual");
  const autoComplete = autoMilestones.filter((m) => m.status === "completed").length;
  const autoTotal = autoMilestones.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push("/app")}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Back to chat"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Rocket className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Thrive Launch
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Intro */}
        <div className="mb-8">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Set Up Your Business Foundation
          </h2>
          <p className="mb-3 text-base text-gray-600 dark:text-gray-400">
            Starting a business comes with a few important setup steps. Thrive
            Launch will guide you through the essentials so your studio begins on
            a strong foundation.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Thrive provides educational guidance only and does not provide legal
            or tax advice.
          </p>
        </div>

        {/* Overall progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {progress.completed} of {progress.total} milestones complete
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Coaching Progress section (auto milestones 1-5) */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Coaching Progress
              </h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                These milestones complete automatically as you chat with Thrive.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {autoComplete}/{autoTotal}
            </span>
          </div>

          <div className="space-y-2">
            {autoMilestones.map((m) => (
              <div
                key={m.key}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  m.status === "completed"
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                    : m.fieldsPresent && m.fieldsPresent > 0
                      ? "bg-yellow-50/50 dark:bg-yellow-950/10"
                      : ""
                }`}
              >
                {m.status === "completed" ? (
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3 w-3" />
                  </div>
                ) : m.fieldsPresent && m.fieldsPresent > 0 ? (
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                )}
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-sm ${
                      m.status === "completed"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {m.label}
                  </span>
                  {m.fieldsPresent !== undefined && m.fieldsRequired !== undefined && m.status !== "completed" && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      ({m.fieldsPresent}/{m.fieldsRequired} fields)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {autoComplete < autoTotal && (
            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
              <a
                href="/app"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Continue your coaching session
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Business Setup section (manual milestones 6-10) */}
        <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
          Business Setup
        </h3>
        <div className="space-y-3">
          {/* Stripe Connected */}
          <StepCard
            milestone={getMilestone("stripe_connected")}
            expanded={expandedStep === "stripe_connected"}
            onToggleExpand={() =>
              setExpandedStep(expandedStep === "stripe_connected" ? null : "stripe_connected")
            }
            updating={updatingStep === "stripe_connected"}
            onToggleComplete={() =>
              toggleMilestone("stripe_connected", getMilestone("stripe_connected")?.status ?? "pending")
            }
            title="Connect Stripe"
            stepNumber={1}
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Link your payment processor so Thrive can analyze your financial
              data and provide data-driven coaching.
            </p>

            <a
              href="/api/stripe/connect"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 touch-manipulation"
            >
              <Zap className="h-4 w-4" />
              Connect Stripe
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </StepCard>

          {/* Business Structure */}
          <StepCard
            milestone={getMilestone("business_structure")}
            expanded={expandedStep === "business_structure"}
            onToggleExpand={() =>
              setExpandedStep(expandedStep === "business_structure" ? null : "business_structure")
            }
            updating={updatingStep === "business_structure"}
            onToggleComplete={() =>
              toggleMilestone("business_structure", getMilestone("business_structure")?.status ?? "pending")
            }
            title="Choose Your Business Structure"
            stepNumber={2}
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Many small studios choose to operate as an LLC. This structure can
              help separate your personal and business finances.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pr-4 text-left font-semibold text-gray-900 dark:text-gray-100">
                      Structure
                    </th>
                    <th className="pb-2 pr-4 text-left font-semibold text-gray-900 dark:text-gray-100">
                      Best For
                    </th>
                    <th className="pb-2 text-left font-semibold text-gray-900 dark:text-gray-100">
                      Key Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 dark:text-gray-400">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-gray-200">
                      Sole Proprietor
                    </td>
                    <td className="py-2.5 pr-4">Very small operations</td>
                    <td className="py-2.5">No legal separation</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-gray-200">
                      LLC
                    </td>
                    <td className="py-2.5 pr-4">Most small studios</td>
                    <td className="py-2.5">Liability protection</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-gray-200">
                      Corporation
                    </td>
                    <td className="py-2.5 pr-4">Larger companies</td>
                    <td className="py-2.5">More complexity</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </StepCard>

          {/* LLC Filed */}
          <StepCard
            milestone={getMilestone("llc_filed")}
            expanded={expandedStep === "llc_filed"}
            onToggleExpand={() =>
              setExpandedStep(expandedStep === "llc_filed" ? null : "llc_filed")
            }
            updating={updatingStep === "llc_filed"}
            onToggleComplete={() =>
              toggleMilestone("llc_filed", getMilestone("llc_filed")?.status ?? "pending")
            }
            title="File Your LLC"
            stepNumber={3}
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              If you decide to form an LLC, you will register your business with
              your state&apos;s Secretary of State.
            </p>

            <div className="mb-3">
              <label
                htmlFor="state-select"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Select your state
              </label>
              <select
                id="state-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
              >
                <option value="">Choose a state...</option>
                {US_STATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedState && (
              <a
                href={STATE_LLC_URLS[selectedState] ?? `https://www.google.com/search?q=${encodeURIComponent(US_STATES.find((s) => s.value === selectedState)?.label ?? selectedState)} secretary of state LLC filing`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 touch-manipulation"
              >
                Go to your state&apos;s LLC filing page
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </StepCard>

          {/* EIN Obtained */}
          <StepCard
            milestone={getMilestone("ein_obtained")}
            expanded={expandedStep === "ein_obtained"}
            onToggleExpand={() =>
              setExpandedStep(expandedStep === "ein_obtained" ? null : "ein_obtained")
            }
            updating={updatingStep === "ein_obtained"}
            onToggleComplete={() =>
              toggleMilestone("ein_obtained", getMilestone("ein_obtained")?.status ?? "pending")
            }
            title="Get Your EIN"
            stepNumber={4}
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              An EIN (Employer Identification Number) is issued by the IRS and
              acts like a Social Security number for your business.
            </p>

            <a
              href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 touch-manipulation"
            >
              Apply for an EIN with the IRS
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </StepCard>

          {/* Bank Account Opened */}
          <StepCard
            milestone={getMilestone("bank_account_opened")}
            expanded={expandedStep === "bank_account_opened"}
            onToggleExpand={() =>
              setExpandedStep(expandedStep === "bank_account_opened" ? null : "bank_account_opened")
            }
            updating={updatingStep === "bank_account_opened"}
            onToggleComplete={() =>
              toggleMilestone("bank_account_opened", getMilestone("bank_account_opened")?.status ?? "pending")
            }
            title="Open a Business Bank Account"
            stepNumber={5}
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              A dedicated business bank account keeps your finances organized and
              helps simplify accounting.
            </p>

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Suggested options
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Local credit unions",
                  "Chase",
                  "Wells Fargo",
                  "Novo",
                  "Mercury",
                ].map((bank) => (
                  <span
                    key={bank}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  >
                    {bank}
                  </span>
                ))}
              </div>
            </div>
          </StepCard>
        </div>

        {/* Bottom disclaimer */}
        <div className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Thrive Launch provides educational information and links to official
            resources. Thrive does not provide legal or tax advice.
          </p>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepCard component
// ---------------------------------------------------------------------------

function StepCard({
  milestone,
  expanded,
  onToggleExpand,
  updating,
  onToggleComplete,
  title,
  stepNumber,
  children,
}: {
  milestone: MilestoneItem | undefined;
  expanded: boolean;
  onToggleExpand: () => void;
  updating: boolean;
  onToggleComplete: () => void;
  title: string;
  stepNumber: number;
  children: React.ReactNode;
}) {
  const completed = milestone?.status === "completed";

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors ${
        completed
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-3 px-4 py-4 text-left touch-manipulation min-h-[56px]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            completed
              ? "bg-emerald-500 text-white"
              : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          {completed ? <Check className="h-4 w-4" /> : stepNumber}
        </span>

        <div className="min-w-0 flex-1">
          <span
            className={`text-sm font-medium ${
              completed
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {title}
          </span>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
          {children}

          {/* Checkbox */}
          <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
            <button
              type="button"
              onClick={onToggleComplete}
              disabled={updating}
              className="flex min-h-[44px] items-center gap-2.5 text-sm touch-manipulation"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {updating ? (
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              ) : completed ? (
                <div className="flex h-6 w-6 items-center justify-center rounded border-2 border-emerald-500 bg-emerald-500">
                  <Check className="h-4 w-4 text-white" />
                </div>
              ) : (
                <div className="h-6 w-6 rounded border-2 border-gray-300 dark:border-gray-600" />
              )}
              <span
                className={
                  completed
                    ? "font-medium text-emerald-700 dark:text-emerald-300"
                    : "text-gray-600 dark:text-gray-400"
                }
              >
                {milestone?.label ?? title}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

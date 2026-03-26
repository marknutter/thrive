"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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

interface StepProgress {
  key: string;
  label: string;
  description: string;
  order: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  notes: string | null;
  completedAt: string | null;
  updatedAt: string | null;
}

interface CompletionInfo {
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
// Helper: parse notes JSON safely
// ---------------------------------------------------------------------------

function parseNotes(notes: string | null): Record<string, string> {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LaunchPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<StepProgress[]>([]);
  const [completion, setCompletion] = useState<CompletionInfo>({
    completed: 0,
    total: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);

  // Local form state for optional fields
  const [selectedState, setSelectedState] = useState("");
  const [einValue, setEinValue] = useState("");
  const [bankName, setBankName] = useState("");

  // ---------------------------------------------------------------------------
  // Fetch progress
  // ---------------------------------------------------------------------------

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding");
      if (!res.ok) throw new Error("Failed to fetch onboarding progress");
      const data = await res.json();
      setSteps(data.steps ?? []);
      setCompletion(data.completion ?? { completed: 0, total: 0, percentage: 0 });

      // Hydrate local form state from notes
      for (const step of data.steps ?? []) {
        const notes = parseNotes(step.notes);
        if (step.key === "create_llc" && notes.state) {
          setSelectedState(notes.state);
        }
        if (step.key === "get_ein" && notes.ein) {
          setEinValue(notes.ein);
        }
        if (step.key === "bank_account" && notes.bank_name) {
          setBankName(notes.bank_name);
        }
      }
    } catch (err) {
      console.error("Failed to load onboarding progress:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // ---------------------------------------------------------------------------
  // Toggle step completion
  // ---------------------------------------------------------------------------

  const toggleStep = async (stepKey: string, currentStatus: string, notes?: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    setUpdatingStep(stepKey);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step_key: stepKey, status: newStatus, notes }),
      });
      if (!res.ok) throw new Error("Failed to update step");
      await fetchProgress();
    } catch (err) {
      console.error("Failed to toggle step:", err);
    } finally {
      setUpdatingStep(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Save notes without toggling status
  // ---------------------------------------------------------------------------

  const saveNotes = async (stepKey: string, notes: string) => {
    try {
      const step = steps.find((s) => s.key === stepKey);
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_key: stepKey,
          status: step?.status ?? "pending",
          notes,
        }),
      });
      await fetchProgress();
    } catch (err) {
      console.error("Failed to save notes:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getStep = (key: string) => steps.find((s) => s.key === key);
  const isCompleted = (key: string) => getStep(key)?.status === "completed";

  const allPreviousStepsComplete = steps
    .filter((s) => s.key !== "create_ledger")
    .every((s) => s.status === "completed" || s.status === "skipped");

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

        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {completion.completed} of {completion.total} complete
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {/* Step 1: Business Structure */}
          <StepCard
            stepKey="business_structure"
            step={getStep("business_structure")}
            expanded={expandedStep === "business_structure"}
            onToggleExpand={() =>
              setExpandedStep(
                expandedStep === "business_structure"
                  ? null
                  : "business_structure"
              )
            }
            updating={updatingStep === "business_structure"}
            onToggleComplete={() =>
              toggleStep(
                "business_structure",
                getStep("business_structure")?.status ?? "pending"
              )
            }
            title="Choose Your Business Structure"
            stepNumber={1}
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

          {/* Step 2: Form LLC */}
          <StepCard
            stepKey="create_llc"
            step={getStep("create_llc")}
            expanded={expandedStep === "create_llc"}
            onToggleExpand={() =>
              setExpandedStep(
                expandedStep === "create_llc" ? null : "create_llc"
              )
            }
            updating={updatingStep === "create_llc"}
            onToggleComplete={() => {
              const notes = selectedState
                ? JSON.stringify({ state: selectedState })
                : undefined;
              toggleStep(
                "create_llc",
                getStep("create_llc")?.status ?? "pending",
                notes
              );
            }}
            title="Form Your LLC"
            stepNumber={2}
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
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  if (e.target.value) {
                    saveNotes(
                      "create_llc",
                      JSON.stringify({ state: e.target.value })
                    );
                  }
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
              >
                Go to your state&apos;s LLC filing page
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </StepCard>

          {/* Step 3: Get EIN */}
          <StepCard
            stepKey="get_ein"
            step={getStep("get_ein")}
            expanded={expandedStep === "get_ein"}
            onToggleExpand={() =>
              setExpandedStep(
                expandedStep === "get_ein" ? null : "get_ein"
              )
            }
            updating={updatingStep === "get_ein"}
            onToggleComplete={() => {
              const notes = einValue
                ? JSON.stringify({ ein: einValue })
                : undefined;
              toggleStep(
                "get_ein",
                getStep("get_ein")?.status ?? "pending",
                notes
              );
            }}
            title="Get Your EIN"
            stepNumber={3}
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              An EIN (Employer Identification Number) is issued by the IRS and
              acts like a Social Security number for your business.
            </p>

            <a
              href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            >
              Apply for an EIN with the IRS
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <div className="mt-3">
              <label
                htmlFor="ein-input"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Enter your EIN{" "}
                <span className="text-gray-400 dark:text-gray-500">
                  (optional, for record keeping)
                </span>
              </label>
              <input
                id="ein-input"
                type="text"
                value={einValue}
                onChange={(e) => setEinValue(e.target.value)}
                onBlur={() => {
                  if (einValue) {
                    saveNotes("get_ein", JSON.stringify({ ein: einValue }));
                  }
                }}
                placeholder="XX-XXXXXXX"
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </StepCard>

          {/* Step 4: Business Bank Account */}
          <StepCard
            stepKey="bank_account"
            step={getStep("bank_account")}
            expanded={expandedStep === "bank_account"}
            onToggleExpand={() =>
              setExpandedStep(
                expandedStep === "bank_account" ? null : "bank_account"
              )
            }
            updating={updatingStep === "bank_account"}
            onToggleComplete={() => {
              const notes = bankName
                ? JSON.stringify({ bank_name: bankName })
                : undefined;
              toggleStep(
                "bank_account",
                getStep("bank_account")?.status ?? "pending",
                notes
              );
            }}
            title="Open a Business Bank Account"
            stepNumber={4}
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

            <div>
              <label
                htmlFor="bank-input"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Bank Name{" "}
                <span className="text-gray-400 dark:text-gray-500">
                  (optional)
                </span>
              </label>
              <input
                id="bank-input"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                onBlur={() => {
                  if (bankName) {
                    saveNotes(
                      "bank_account",
                      JSON.stringify({ bank_name: bankName })
                    );
                  }
                }}
                placeholder="e.g., Chase Business"
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </StepCard>

          {/* Step 5: Accounting Software */}
          <StepCard
            stepKey="accounting_setup"
            step={getStep("accounting_setup")}
            expanded={expandedStep === "accounting_setup"}
            onToggleExpand={() =>
              setExpandedStep(
                expandedStep === "accounting_setup"
                  ? null
                  : "accounting_setup"
              )
            }
            updating={updatingStep === "accounting_setup"}
            onToggleComplete={() =>
              toggleStep(
                "accounting_setup",
                getStep("accounting_setup")?.status ?? "pending"
              )
            }
            title="Choose Accounting Software"
            stepNumber={5}
            optional
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Accounting software helps track your income and expenses.
            </p>

            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { name: "QuickBooks Online", desc: "Popular, full-featured" },
                { name: "Xero", desc: "Cloud-based, clean interface" },
                { name: "Wave", desc: "Simple and free" },
              ].map((sw) => (
                <div
                  key={sw.name}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {sw.name}
                  </span>
                  <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {sw.desc}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              Later this connects to Thrive Ledger.
            </p>
          </StepCard>

          {/* Step 6: Connect Studio Systems */}
          <StepCard
            stepKey="connect_studio"
            step={getStep("connect_studio")}
            expanded={expandedStep === "connect_studio"}
            onToggleExpand={() =>
              setExpandedStep(
                expandedStep === "connect_studio" ? null : "connect_studio"
              )
            }
            updating={updatingStep === "connect_studio"}
            onToggleComplete={() =>
              toggleStep(
                "connect_studio",
                getStep("connect_studio")?.status ?? "pending"
              )
            }
            title="Connect Your Studio Systems"
            stepNumber={6}
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Connect the systems that run your studio so Thrive can understand
              your business.
            </p>

            <div className="space-y-2">
              <a
                href="/api/stripe/connect"
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
              >
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Connect Stripe
                  </span>
                </div>
                <ExternalLink className="h-4 w-4 text-emerald-500" />
              </a>

              {[
                "PushPress",
                "Mindbody",
                "OfferingTree",
                "ZenPlanner",
                "Vagaro",
                "Momence",
              ].map((system) => (
                <div
                  key={system}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {system}
                  </span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    Coming soon
                  </span>
                </div>
              ))}
            </div>
          </StepCard>

          {/* Step 7: Connect Stripe (dedicated) */}
          <StepCard
            stepKey="connect_stripe"
            step={getStep("connect_stripe")}
            expanded={expandedStep === "connect_stripe"}
            onToggleExpand={() =>
              setExpandedStep(
                expandedStep === "connect_stripe" ? null : "connect_stripe"
              )
            }
            updating={updatingStep === "connect_stripe"}
            onToggleComplete={() =>
              toggleStep(
                "connect_stripe",
                getStep("connect_stripe")?.status ?? "pending"
              )
            }
            title="Connect Stripe"
            stepNumber={7}
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Link your payment processor so Thrive can analyze your financial
              data.
            </p>

            <a
              href="/api/stripe/connect"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            >
              Connect Stripe
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </StepCard>

          {/* Step 8: Create Thrive Ledger */}
          <StepCard
            stepKey="create_ledger"
            step={getStep("create_ledger")}
            expanded={expandedStep === "create_ledger"}
            onToggleExpand={() =>
              setExpandedStep(
                expandedStep === "create_ledger" ? null : "create_ledger"
              )
            }
            updating={updatingStep === "create_ledger"}
            onToggleComplete={() =>
              toggleStep(
                "create_ledger",
                getStep("create_ledger")?.status ?? "pending"
              )
            }
            title="Create Your Thrive Ledger"
            stepNumber={8}
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Once your systems are connected, Thrive will create your financial
              foundation.
            </p>

            <div className="relative group inline-block">
              <button
                disabled
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white opacity-50 cursor-not-allowed"
              >
                <Zap className="h-4 w-4" />
                Create My Thrive Ledger
              </button>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700 whitespace-nowrap">
                Coming soon — Google Sheets integration
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 italic">
              Your Thrive Ledger Google Sheet is generated.
            </p>
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
  stepKey,
  step,
  expanded,
  onToggleExpand,
  updating,
  onToggleComplete,
  title,
  stepNumber,
  optional,
  children,
}: {
  stepKey: string;
  step: StepProgress | undefined;
  expanded: boolean;
  onToggleExpand: () => void;
  updating: boolean;
  onToggleComplete: () => void;
  title: string;
  stepNumber: number;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const completed = step?.status === "completed";

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors ${
        completed
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
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
          {optional && (
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
              (optional)
            </span>
          )}
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
              className="flex items-center gap-2.5 text-sm"
            >
              {updating ? (
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
              ) : completed ? (
                <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-emerald-500 bg-emerald-500">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600" />
              )}
              <span
                className={
                  completed
                    ? "font-medium text-emerald-700 dark:text-emerald-300"
                    : "text-gray-600 dark:text-gray-400"
                }
              >
                {step?.label ?? title}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

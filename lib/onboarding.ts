/**
 * Core onboarding logic for Thrive Launch - the business setup checklist.
 *
 * Manages the step-by-step progress of a user through business formation,
 * from choosing a business structure through connecting Stripe.
 */

import { getRawDb } from "@/lib/db";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Launch step definitions
// ---------------------------------------------------------------------------

export const LAUNCH_STEPS = [
  { key: "business_structure", label: "Choose Business Structure", description: "Decide on LLC, sole proprietorship, or other entity type", order: 1 },
  { key: "create_llc", label: "Create LLC", description: "File your LLC with your state", order: 2 },
  { key: "get_ein", label: "Get EIN", description: "Apply for an Employer Identification Number from the IRS", order: 3 },
  { key: "bank_account", label: "Open Business Bank Account", description: "Separate personal and business finances", order: 4 },
  { key: "accounting_setup", label: "Set Up Accounting Software", description: "Connect QuickBooks, Xero, or other accounting tool", order: 5 },
  { key: "connect_studio", label: "Connect Studio Software", description: "Link OfferingTree, PushPress, MindBody, or similar", order: 6 },
  { key: "connect_stripe", label: "Connect Stripe", description: "Link your payment processor for financial data", order: 7 },
] as const;

export type StepKey = (typeof LAUNCH_STEPS)[number]["key"];
export type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

const VALID_STEP_KEYS = new Set(LAUNCH_STEPS.map((s) => s.key));
const VALID_STATUSES = new Set<StepStatus>(["pending", "in_progress", "completed", "skipped"]);

export function isValidStepKey(key: string): key is StepKey {
  return VALID_STEP_KEYS.has(key as StepKey);
}

export function isValidStatus(status: string): status is StepStatus {
  return VALID_STATUSES.has(status as StepStatus);
}

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

interface OnboardingRow {
  id: number;
  user_id: string;
  step_key: string;
  status: string;
  notes: string | null;
  completed_at: string | null;
  updated_at: string | null;
}

export interface StepProgress {
  key: string;
  label: string;
  description: string;
  order: number;
  status: StepStatus;
  notes: string | null;
  completedAt: string | null;
  updatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Returns all launch steps with their status for a user.
 * If no rows exist yet, initializes them all as "pending".
 */
export function getProgress(userId: string): StepProgress[] {
  const db = getRawDb();

  const rows = db
    .prepare("SELECT * FROM onboarding_progress WHERE user_id = ? ORDER BY step_key")
    .all(userId) as OnboardingRow[];

  // If no rows, initialize all steps as pending
  if (rows.length === 0) {
    const insert = db.prepare(
      `INSERT INTO onboarding_progress (user_id, step_key, status) VALUES (?, ?, 'pending')`
    );
    const insertAll = db.transaction(() => {
      for (const step of LAUNCH_STEPS) {
        insert.run(userId, step.key);
      }
    });
    insertAll();

    // Re-fetch after insert
    const freshRows = db
      .prepare("SELECT * FROM onboarding_progress WHERE user_id = ? ORDER BY step_key")
      .all(userId) as OnboardingRow[];

    return mergeStepsWithRows(freshRows);
  }

  return mergeStepsWithRows(rows);
}

/**
 * Update a step's status and optional notes.
 */
export function updateStep(userId: string, stepKey: string, status: string, notes?: string): void {
  const db = getRawDb();

  const completedAt = status === "completed" ? new Date().toISOString() : null;

  // Ensure the row exists (upsert)
  db.prepare(
    `INSERT INTO onboarding_progress (user_id, step_key, status, notes, completed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, step_key) DO UPDATE SET
       status = excluded.status,
       notes = COALESCE(excluded.notes, onboarding_progress.notes),
       completed_at = excluded.completed_at,
       updated_at = CURRENT_TIMESTAMP`
  ).run(userId, stepKey, status, notes ?? null, completedAt);

  log.info("Onboarding step updated", { userId, stepKey, status });
}

/**
 * Returns completion stats for a user.
 */
export function getCompletionPercentage(userId: string): { completed: number; total: number; percentage: number } {
  const steps = getProgress(userId);
  const total = steps.length;
  const completed = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}

/**
 * Returns true if all steps are completed or skipped.
 */
export function isOnboardingComplete(userId: string): boolean {
  const steps = getProgress(userId);
  return steps.every((s) => s.status === "completed" || s.status === "skipped");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeStepsWithRows(rows: OnboardingRow[]): StepProgress[] {
  const rowMap = new Map(rows.map((r) => [r.step_key, r]));

  return LAUNCH_STEPS.map((step) => {
    const row = rowMap.get(step.key);
    return {
      key: step.key,
      label: step.label,
      description: step.description,
      order: step.order,
      status: (row?.status as StepStatus) ?? "pending",
      notes: row?.notes ?? null,
      completedAt: row?.completed_at ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  });
}

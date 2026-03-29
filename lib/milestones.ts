/**
 * Unified coaching milestone system for Thrive.
 *
 * Combines auto-completing milestones (driven by profile extraction) with
 * manual milestones (real-world business setup actions the user confirms).
 */

import { getRawDb } from "@/lib/db";
import { getProfile } from "@/lib/business-profile";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Milestone definitions
// ---------------------------------------------------------------------------

export const MILESTONES = [
  // Auto-complete from profile extraction
  { key: "business_snapshot", label: "Business Snapshot", description: "We know your business name, type, and location", type: "auto" as const, requiredFields: ["business_name", "business_type", "location"], order: 1 },
  { key: "revenue_model", label: "Revenue Model", description: "We understand your revenue streams and pricing", type: "auto" as const, requiredFields: ["revenue_streams", "monthly_revenue"], order: 2 },
  { key: "cost_structure", label: "Cost Structure", description: "We know your biggest costs and how you pay yourself", type: "auto" as const, requiredFields: ["biggest_costs", "owner_pay"], order: 3 },
  { key: "systems_identified", label: "Systems Identified", description: "We know what software runs your studio", type: "auto" as const, requiredFields: ["studio_software"], order: 4 },
  { key: "goals_defined", label: "Goals Defined", description: "We understand your goals and priorities", type: "auto" as const, requiredFields: ["primary_goal"], order: 5 },
  // Manual/hybrid — real-world actions
  { key: "stripe_connected", label: "Stripe Connected", description: "Your payment processor is linked", type: "manual" as const, requiredFields: [] as string[], order: 6 },
  { key: "business_structure", label: "Business Structure Chosen", description: "You've decided on LLC, sole prop, or other", type: "manual" as const, requiredFields: [] as string[], order: 7 },
  { key: "llc_filed", label: "LLC Filed", description: "Your business is officially registered", type: "manual" as const, requiredFields: [] as string[], order: 8 },
  { key: "ein_obtained", label: "EIN Obtained", description: "You have your Employer ID Number", type: "manual" as const, requiredFields: [] as string[], order: 9 },
  { key: "bank_account_opened", label: "Bank Account Opened", description: "Business finances are separate from personal", type: "manual" as const, requiredFields: [] as string[], order: 10 },
] as const;

export type MilestoneKey = (typeof MILESTONES)[number]["key"];
export type MilestoneType = "auto" | "manual";
export type MilestoneStatus = "pending" | "in_progress" | "completed";

const VALID_MILESTONE_KEYS = new Set(MILESTONES.map((m) => m.key));

export function isValidMilestoneKey(key: string): key is MilestoneKey {
  return VALID_MILESTONE_KEYS.has(key as MilestoneKey);
}

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

interface MilestoneRow {
  id: number;
  user_id: string;
  milestone_key: string;
  status: string;
  completed_at: string | null;
  updated_at: string | null;
}

export interface MilestoneWithStatus {
  key: string;
  label: string;
  description: string;
  type: MilestoneType;
  requiredFields: readonly string[];
  order: number;
  status: MilestoneStatus;
  completedAt: string | null;
  updatedAt: string | null;
  /** For auto milestones: how many required fields are present */
  fieldsPresent?: number;
  fieldsRequired?: number;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Returns all 10 milestones with status for a user.
 * Auto-initializes rows if none exist.
 */
export function getMilestones(userId: string): MilestoneWithStatus[] {
  const db = getRawDb();

  let rows = db
    .prepare("SELECT * FROM coaching_milestones WHERE user_id = ? ORDER BY milestone_key")
    .all(userId) as MilestoneRow[];

  // Auto-initialize if no rows exist
  if (rows.length === 0) {
    const insert = db.prepare(
      `INSERT INTO coaching_milestones (user_id, milestone_key, status) VALUES (?, ?, 'pending')`
    );
    const insertAll = db.transaction(() => {
      for (const m of MILESTONES) {
        insert.run(userId, m.key);
      }
    });
    insertAll();

    rows = db
      .prepare("SELECT * FROM coaching_milestones WHERE user_id = ? ORDER BY milestone_key")
      .all(userId) as MilestoneRow[];
  }

  // Get profile fields for auto-milestone progress indicators
  const profile = getProfile(userId);
  const profileFieldKeys = new Set(profile.map((p) => p.key));

  const rowMap = new Map(rows.map((r) => [r.milestone_key, r]));

  return MILESTONES.map((m) => {
    const row = rowMap.get(m.key);
    const status = (row?.status as MilestoneStatus) ?? "pending";

    const result: MilestoneWithStatus = {
      key: m.key,
      label: m.label,
      description: m.description,
      type: m.type,
      requiredFields: m.requiredFields,
      order: m.order,
      status,
      completedAt: row?.completed_at ?? null,
      updatedAt: row?.updated_at ?? null,
    };

    // For auto milestones, add field progress info
    if (m.type === "auto" && m.requiredFields.length > 0) {
      const present = m.requiredFields.filter((f) => profileFieldKeys.has(f)).length;
      result.fieldsPresent = present;
      result.fieldsRequired = m.requiredFields.length;
    }

    return result;
  });
}

/**
 * Mark a milestone as complete.
 */
export function completeMilestone(userId: string, key: string): void {
  const db = getRawDb();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO coaching_milestones (user_id, milestone_key, status, completed_at, updated_at)
     VALUES (?, ?, 'completed', ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, milestone_key) DO UPDATE SET
       status = 'completed',
       completed_at = COALESCE(coaching_milestones.completed_at, excluded.completed_at),
       updated_at = CURRENT_TIMESTAMP`
  ).run(userId, key, now);

  log.info("Milestone completed", { userId, key });
}

/**
 * Check all auto milestones against the user's profile.
 * If all required fields are present, auto-completes the milestone.
 * Returns list of newly completed milestone keys.
 */
export function checkAutoMilestones(userId: string): string[] {
  const db = getRawDb();
  const profile = getProfile(userId);
  const profileFieldKeys = new Set(profile.map((p) => p.key));

  const autoMilestones = MILESTONES.filter((m) => m.type === "auto");
  const newlyCompleted: string[] = [];

  // Get current statuses
  const rows = db
    .prepare("SELECT milestone_key, status FROM coaching_milestones WHERE user_id = ?")
    .all(userId) as Pick<MilestoneRow, "milestone_key" | "status">[];
  const statusMap = new Map(rows.map((r) => [r.milestone_key, r.status]));

  for (const m of autoMilestones) {
    const currentStatus = statusMap.get(m.key);
    if (currentStatus === "completed") continue;

    const allFieldsPresent = m.requiredFields.every((f) => profileFieldKeys.has(f));
    if (allFieldsPresent) {
      completeMilestone(userId, m.key);
      newlyCompleted.push(m.key);
    }
  }

  return newlyCompleted;
}

/**
 * Returns progress stats: completed count, total, and percentage.
 */
export function getMilestoneProgress(userId: string): { completed: number; total: number; percentage: number } {
  const milestones = getMilestones(userId);
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === "completed").length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}

/**
 * Quick check if a specific milestone is complete.
 */
export function isMilestoneComplete(userId: string, key: string): boolean {
  const db = getRawDb();
  const row = db
    .prepare("SELECT status FROM coaching_milestones WHERE user_id = ? AND milestone_key = ?")
    .get(userId, key) as { status: string } | undefined;
  return row?.status === "completed";
}

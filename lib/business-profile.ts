/**
 * Business profile — structured data extracted from onboarding conversations.
 *
 * The AI extracts key facts during coaching sessions using [PROFILE:key=value] tags.
 * This gives us structured data beyond just the chat log.
 */

import { getRawDb } from "@/lib/db";
import { log } from "@/lib/logger";
import { checkAutoMilestones } from "@/lib/milestones";

export const PROFILE_FIELDS = {
  business_name: "Business Name",
  business_type: "Business Type",
  location: "Location (city/state)",
  years_in_business: "Years in Business",
  owner_name: "Owner Name",
  revenue_streams: "Revenue Streams",
  monthly_revenue: "Approximate Monthly Revenue",
  pricing_structure: "Pricing Structure",
  member_count: "Active Member Count",
  biggest_costs: "Biggest Costs",
  owner_pay: "How Owner Takes Pay",
  studio_software: "Studio Software Used",
  payment_processor: "Payment Processor",
  accounting_software: "Accounting Software",
  business_structure: "Business Structure (LLC, etc.)",
  has_ein: "Has EIN",
  has_business_bank: "Has Business Bank Account",
  revenue_goal: "Revenue Goal",
  biggest_frustration: "Biggest Frustration",
  primary_goal: "Primary Goal",
} as const;

export type ProfileFieldKey = keyof typeof PROFILE_FIELDS;

export interface ProfileEntry {
  key: string;
  label: string;
  value: string;
  updatedAt: string;
}

export function getProfile(userId: string): ProfileEntry[] {
  const db = getRawDb();
  const rows = db
    .prepare("SELECT field_key, field_value, updated_at FROM business_profiles WHERE user_id = ? ORDER BY field_key")
    .all(userId) as Array<{ field_key: string; field_value: string; updated_at: string }>;

  return rows.map((r) => ({
    key: r.field_key,
    label: PROFILE_FIELDS[r.field_key as ProfileFieldKey] || r.field_key,
    value: r.field_value,
    updatedAt: r.updated_at,
  }));
}

export function setProfileField(userId: string, key: string, value: string): void {
  const db = getRawDb();
  db.prepare(
    `INSERT INTO business_profiles (user_id, field_key, field_value)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, field_key) DO UPDATE SET
       field_value = excluded.field_value,
       updated_at = CURRENT_TIMESTAMP`
  ).run(userId, key, value);
  log.info("Business profile updated", { userId, key });
}

export function getProfileCompleteness(userId: string): { filled: number; total: number; percentage: number } {
  const profile = getProfile(userId);
  const total = Object.keys(PROFILE_FIELDS).length;
  const filled = profile.length;
  return { filled, total, percentage: total > 0 ? Math.round((filled / total) * 100) : 0 };
}

export function formatProfileForAI(userId: string): string {
  const profile = getProfile(userId);
  if (profile.length === 0) return "";

  const lines = profile.map((p) => `- ${p.label}: ${p.value}`);
  return `\n\n## Business Profile (what we know so far)\n${lines.join("\n")}`;
}

// Parse [PROFILE:key=value] tags from AI responses
const PROFILE_TAG_REGEX = /\[PROFILE:(\w+)=([^\]]+)\]/g;

export function processProfileTags(text: string, userId: string): string {
  const matches = [...text.matchAll(PROFILE_TAG_REGEX)];
  for (const match of matches) {
    const key = match[1];
    const value = match[2].trim();
    if (key && value && key in PROFILE_FIELDS) {
      try {
        setProfileField(userId, key, value);
      } catch (error) {
        log.error("Failed to save profile field", { userId, key, error: String(error) });
      }
    }
  }
  // After saving profile fields, check if any auto milestones should complete
  if (matches.length > 0) {
    try {
      const newlyCompleted = checkAutoMilestones(userId);
      if (newlyCompleted.length > 0) {
        log.info("Auto-completed milestones from profile extraction", { userId, milestones: newlyCompleted });
      }
    } catch (error) {
      log.error("Failed to check auto milestones", { userId, error: String(error) });
    }
  }

  // Strip tags from response
  return text.replace(PROFILE_TAG_REGEX, "").replace(/\s{2,}/g, " ").trim();
}
